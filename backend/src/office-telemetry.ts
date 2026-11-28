import {
  BadGatewayException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  MessageEvent,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IsIn, IsUUID } from 'class-validator';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { promisify } from 'node:util';
import { Observable, Subject, filter, from, map, switchMap } from 'rxjs';
import { AuthRequest, SessionGuard } from './auth';
import { AccessService } from './access.service';
import { PrismaService } from './prisma.service';

const SEED_IDS = ['#teste1', '#teste2', '#teste3', '#teste4', '#teste5'] as const;
type SeedId = typeof SEED_IDS[number];
const execFileAsync = promisify(execFile);

interface SeedTraceEntry {
  room: string;
  status: string;
  details: string;
  timestamp: string;
}

interface SeedEvaluationResult {
  seed_id: string;
  status: 'PASS' | 'FAIL';
  office_trace: SeedTraceEntry[];
}

interface SeedEvaluationReport {
  mode: string;
  summary: { total: number; passed: number; failed: number };
  results: SeedEvaluationResult[];
}

interface OfficeEvent {
  type: string;
  runId: string;
  seedId: SeedId;
  room: string;
  status: string;
  details: string;
  timestamp: string;
}

export class RunSeedDto {
  @IsUUID('4') classId!: string;
  @IsIn(SEED_IDS) seedId!: SeedId;
}

export class OfficeStateQueryDto {
  @IsUUID('4') classId!: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSeedTraceEntry(value: unknown): value is SeedTraceEntry {
  return isRecord(value)
    && typeof value.room === 'string'
    && typeof value.status === 'string'
    && typeof value.details === 'string'
    && typeof value.timestamp === 'string';
}

function parseSeedReport(value: unknown, seedId: SeedId): SeedEvaluationReport {
  if (
    !isRecord(value)
    || !isRecord(value.summary)
    || !Array.isArray(value.results)
    || value.results.length !== 1
  ) {
    throw new BadGatewayException('O avaliador retornou um relatorio invalido.');
  }
  const summary = value.summary;
  const result = value.results[0];
  if (
    value.mode !== 'deterministic_local'
    || typeof summary.total !== 'number'
    || summary.total !== 1
    || typeof summary.passed !== 'number'
    || (summary.passed !== 0 && summary.passed !== 1)
    || typeof summary.failed !== 'number'
    || (summary.failed !== 0 && summary.failed !== 1)
    || summary.passed + summary.failed !== summary.total
    || !isRecord(result)
    || result.seed_id !== seedId
    || (result.status !== 'PASS' && result.status !== 'FAIL')
    || !Array.isArray(result.office_trace)
    || !result.office_trace.every(isSeedTraceEntry)
    || (result.status === 'PASS' && summary.passed !== 1)
    || (result.status === 'FAIL' && summary.failed !== 1)
  ) {
    throw new BadGatewayException('O avaliador retornou um relatorio incompleto ou inesperado.');
  }
  return {
    mode: 'deterministic_local',
    summary: {
      total: summary.total,
      passed: summary.passed,
      failed: summary.failed,
    },
    results: [
      {
        seed_id: seedId,
        status: result.status === 'PASS' ? 'PASS' : 'FAIL',
        office_trace: result.office_trace.filter(isSeedTraceEntry),
      },
    ],
  };
}

@Injectable()
export class OfficeTelemetryService {
  private readonly events = new Subject<{ classId: string; event: MessageEvent }>();

  stream(classId: string): Observable<MessageEvent> {
    return this.events.pipe(
      filter(entry => entry.classId === classId),
      map(entry => entry.event),
    );
  }

  publish(classId: string, event: OfficeEvent): void {
    this.events.next({
      classId,
      event: { type: event.type, data: event },
    });
  }
}

@Injectable()
export class SeedEvaluationService {
  async evaluate(seedId: SeedId): Promise<{
    result: SeedEvaluationResult;
    report: Prisma.InputJsonValue;
  }> {
    const agentDirectory = path.resolve(__dirname, '..', '..', 'ai-agent');
    const executable = process.platform === 'win32'
      ? path.join(agentDirectory, '.venv', 'Scripts', 'python.exe')
      : path.join(agentDirectory, '.venv', 'bin', 'python');
    let stdout: string;
    try {
      ({ stdout } = await execFileAsync(
        executable,
        ['-m', 'cortex_agent.evals.run_seed_evals', '--seed', seedId, '--allow-failures'],
        {
          cwd: agentDirectory,
          timeout: 30000,
          maxBuffer: 2 * 1024 * 1024,
          windowsHide: true,
          env: {
            PATH: process.env.PATH,
            SystemRoot: process.env.SystemRoot,
            TEMP: process.env.TEMP,
            TMP: process.env.TMP,
            PYTHONUTF8: '1',
          },
        },
      ));
    } catch (error) {
      if (error instanceof Error) {
        throw new BadGatewayException('O avaliador local de seeds nao conseguiu executar.');
      }
      throw error;
    }

    let value: unknown;
    try {
      value = JSON.parse(stdout);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new BadGatewayException('O avaliador local retornou JSON invalido.');
      }
      throw error;
    }
    const parsed = parseSeedReport(value, seedId);
    return {
      result: parsed.results[0],
      report: JSON.parse(stdout) as Prisma.InputJsonValue,
    };
  }
}

@Controller('ai/office')
@UseGuards(SessionGuard)
export class OfficeTelemetryController {
  constructor(
    private readonly db: PrismaService,
    private readonly access: AccessService,
    private readonly telemetry: OfficeTelemetryService,
    private readonly evaluator: SeedEvaluationService,
  ) {}

  private async authorizeTeacher(classId: string, req: AuthRequest): Promise<void> {
    if (!req.principal.roles.some(role => role === 'teacher' || role === 'admin')) {
      throw new ForbiddenException('Este perfil nao pode acessar o escritorio de IA.');
    }
    await this.access.requireClass(classId, req.principal);
  }

  @Post('run-seed')
  async runSeed(@Body() dto: RunSeedDto, @Req() req: AuthRequest) {
    await this.authorizeTeacher(dto.classId, req);
    const runId = randomUUID();
    this.telemetry.publish(dto.classId, {
      type: 'seed.started',
      runId,
      seedId: dto.seedId,
      room: 'personas',
      status: 'RUNNING',
      details: 'Avaliacao deterministica iniciada.',
      timestamp: new Date().toISOString(),
    });

    let persisted = false;
    try {
      const { result, report } = await this.evaluator.evaluate(dto.seedId);
      const run = await this.db.agentSeedRun.create({
        data: {
          id: runId,
          seedId: dto.seedId,
          status: result.status === 'PASS' ? 'passed' : 'failed',
          classId: dto.classId,
          requestedById: req.principal.id,
          report,
        },
        select: { id: true, seedId: true, status: true, createdAt: true },
      });
      persisted = true;

      for (const trace of result.office_trace) {
        this.telemetry.publish(dto.classId, {
          type: 'room.transition',
          runId,
          seedId: dto.seedId,
          ...trace,
        });
      }
      this.telemetry.publish(dto.classId, {
        type: 'seed.completed',
        runId,
        seedId: dto.seedId,
        room: 'supervisor',
        status: run.status.toUpperCase(),
        details: 'Avaliacao concluida e persistida.',
        timestamp: run.createdAt.toISOString(),
      });
      return run;
    } finally {
      if (!persisted) {
        this.telemetry.publish(dto.classId, {
          type: 'seed.failed',
          runId,
          seedId: dto.seedId,
          room: 'personas',
          status: 'FAILED',
          details: 'A avaliacao ou persistencia falhou.',
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  @Get('state')
  async state(@Query() query: OfficeStateQueryDto, @Req() req: AuthRequest) {
    await this.authorizeTeacher(query.classId, req);
    const runs = await this.db.agentSeedRun.findMany({
      where: { classId: query.classId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 50,
      select: { id: true, seedId: true, status: true, report: true, createdAt: true },
    });
    return { runs };
  }

  @Sse('stream')
  stream(
    @Query('classId', ParseUUIDPipe) classId: string,
    @Req() req: AuthRequest,
  ): Observable<MessageEvent> {
    return from(this.authorizeTeacher(classId, req)).pipe(
      switchMap(() => this.telemetry.stream(classId)),
    );
  }
}
