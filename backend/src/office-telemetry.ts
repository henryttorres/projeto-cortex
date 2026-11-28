import {
  BadGatewayException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Logger,
  MessageEvent,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Sse,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsIn, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { promisify } from 'node:util';
import { Observable, Subject, filter, from, map, switchMap } from 'rxjs';
import { AuthRequest, SessionGuard } from './auth';
import { AccessService } from './access.service';
import { PrismaService } from './prisma.service';
import { searchRagChunks } from './rag-ingest';

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
  seedId?: SeedId;
  room: string;
  status: string;
  details: string;
  timestamp: string;
}

class AdkUnavailableError extends Error {}

export class RunSeedDto {
  @IsUUID('4') classId!: string;
  @IsIn(SEED_IDS) seedId!: SeedId;
}

export class OfficeStateQueryDto {
  @IsUUID('4') classId!: string;
}

export class OfficeChatDto {
  @IsUUID('4') classId!: string;
  @IsUUID('4') subjectId!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(4000) message!: string;
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

function parseAdkEvent(value: string): Record<string, unknown> {
  let event: unknown;
  try {
    event = JSON.parse(value);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new BadGatewayException('O servico ADK retornou um evento invalido.');
    }
    throw error;
  }
  if (!isRecord(event)) throw new BadGatewayException('O servico ADK retornou um evento invalido.');
  return event;
}

function parseSseBlock(block: string): Record<string, unknown> | null {
  const data = block
    .split(/\r?\n/)
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice(5).trimStart())
    .join('\n');
  return data ? parseAdkEvent(data) : null;
}

async function* readAdkEvents(response: Response): AsyncGenerator<Record<string, unknown>> {
  if (!response.body) throw new AdkUnavailableError('O ADK nao enviou um fluxo de eventos.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let separator = /\r?\n\r?\n/.exec(buffer);
      while (separator) {
        const block = buffer.slice(0, separator.index);
        buffer = buffer.slice(separator.index + separator[0].length);
        const event = parseSseBlock(block);
        if (event) yield event;
        separator = /\r?\n\r?\n/.exec(buffer);
      }
      if (done) break;
    }
    if (buffer.trim()) {
      const event = parseSseBlock(buffer);
      if (event) yield event;
    }
  } finally {
    reader.releaseLock();
  }
}

function officeTraceFromAdkEvent(event: Record<string, unknown>): SeedTraceEntry[] {
  const actions = isRecord(event.actions) ? event.actions : {};
  const delta = isRecord(actions.stateDelta)
    ? actions.stateDelta
    : isRecord(actions.state_delta)
      ? actions.state_delta
      : isRecord(event.stateDelta)
        ? event.stateDelta
        : isRecord(event.state_delta)
          ? event.state_delta
          : null;
  if (!delta || !Object.hasOwn(delta, 'office_trace')) return [];
  if (!Array.isArray(delta.office_trace) || !delta.office_trace.every(isSeedTraceEntry)) {
    throw new BadGatewayException('O servico ADK retornou uma transicao de sala invalida.');
  }
  return delta.office_trace;
}

function adkEventText(event: Record<string, unknown>): string {
  if (!isRecord(event.content) || !Array.isArray(event.content.parts)) return '';
  return event.content.parts
    .filter(isRecord)
    .map(part => part.text)
    .filter((text): text is string => typeof text === 'string')
    .join('\n')
    .trim();
}

function adkTurnComplete(event: Record<string, unknown>): boolean {
  return event.turnComplete === true || event.turn_complete === true;
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
  private readonly logger = new Logger(OfficeTelemetryController.name);

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

  @Post('chat')
  async chat(@Body() dto: OfficeChatDto, @Req() req: AuthRequest) {
    await this.authorizeTeacher(dto.classId, req);
    if (!process.env.CORTEX_INTERNAL_TOKEN) {
      throw new ServiceUnavailableException('Configure CORTEX_INTERNAL_TOKEN no NestJS e no agente ADK para habilitar o chat.');
    }
    const subject = await this.db.subject.findFirst({
      where: { id: dto.subjectId, classId: dto.classId },
      select: { id: true },
    });
    if (!subject) throw new ForbiddenException('A disciplina nao pertence a turma selecionada.');

    const runId = randomUUID();
    const sessionId = randomUUID();
    const userId = req.principal.id;
    const baseUrl = (process.env.CORTEX_ADK_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
    const encodedUserId = encodeURIComponent(userId);
    const sessionUrl = `${baseUrl}/apps/cortex_agent/users/${encodedUserId}/sessions`;
    const sessionItemUrl = `${sessionUrl}/${encodeURIComponent(sessionId)}`;
    const headers = { 'Content-Type': 'application/json' };
    const timestamp = () => new Date().toISOString();
    const requestAdk = async (url: string, init: RequestInit): Promise<Response> => {
      let response: Response;
      try {
        response = await fetch(url, { ...init, signal: AbortSignal.timeout(120000) });
      } catch (error) {
        if (error instanceof Error) {
          throw new AdkUnavailableError('O servico ADK esta indisponivel ou excedeu o tempo limite.');
        }
        throw error;
      }
      if (!response.ok) {
        const status = response.status;
        await response.body?.cancel();
        if (status === 429 || status >= 500) {
          throw new AdkUnavailableError(`O servico ADK respondeu com HTTP ${status}.`);
        }
        throw new BadGatewayException('O servico ADK nao conseguiu processar a solicitacao.');
      }
      return response;
    };

    this.telemetry.publish(dto.classId, {
      type: 'chat.started',
      runId,
      room: 'reception',
      status: 'RUNNING',
      details: 'Solicitacao enviada ao agente ADK.',
      timestamp: timestamp(),
    });

    let sessionCreated = false;
    let failure: unknown;
    let answer = '';
    try {
      const createResponse = await requestAdk(sessionUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId,
          state: {
            cortex_user_id: userId,
            cortex_class_id: dto.classId,
            cortex_subject_id: dto.subjectId,
            cortex_query: dto.message,
          },
        }),
      });
      sessionCreated = true;
      await createResponse.body?.cancel();

      const runResponse = await requestAdk(`${baseUrl}/run_sse`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          appName: 'cortex_agent',
          userId,
          sessionId,
          newMessage: { role: 'user', parts: [{ text: dto.message }] },
        }),
      });
      const publishedTrace = new Set<string>();
      for await (const event of readAdkEvents(runResponse)) {
        for (const trace of officeTraceFromAdkEvent(event)) {
          const key = JSON.stringify(trace);
          if (publishedTrace.has(key)) continue;
          publishedTrace.add(key);
          this.telemetry.publish(dto.classId, {
            type: 'room.transition',
            runId,
            ...trace,
          });
        }
        const text = adkEventText(event);
        if (adkTurnComplete(event) && text) answer = text;
      }
      if (!answer) throw new AdkUnavailableError('O servico ADK nao retornou uma resposta textual.');
    } catch (error) {
      failure = error;
    }

    let cleanupFailed = false;
    if (sessionCreated) {
      try {
        const deleteResponse = await requestAdk(sessionItemUrl, { method: 'DELETE', headers });
        await deleteResponse.body?.cancel();
      } catch (error) {
        cleanupFailed = true;
        if (failure === undefined) failure = error;
        else this.logger.error(
          'Falha ao remover a sessao ADK apos erro no chat.',
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    let simulated = false;
    if (failure instanceof AdkUnavailableError && !answer && !cleanupFailed) {
      try {
        const chunks = await searchRagChunks(this.db, {
          classId: dto.classId,
          subjectId: dto.subjectId,
          query: dto.message,
          limit: 3,
        });
        answer = chunks.length
          ? [
            'SIMULACAO LOCAL — o ADK nao produziu resposta. Os trechos abaixo foram recuperados do acervo para revisao humana; nao sao uma explicacao gerada por IA.',
            ...chunks.map(chunk => `[${chunk.title} · ${chunk.sourceName} · trecho ${chunk.chunkIndex + 1} · ${chunk.id}]\n${chunk.content}`),
          ].join('\n\n')
          : 'SIMULACAO LOCAL — o ADK nao produziu resposta e nenhum trecho relacionado foi encontrado no acervo desta disciplina. Tente novamente quando o ADK estiver disponivel.';
        simulated = true;
        this.logger.warn('ADK indisponivel; resposta local de demonstracao baseada no acervo.');
        this.telemetry.publish(dto.classId, {
          type: 'chat.simulated',
          runId,
          room: 'reception',
          status: 'SIMULATED',
          details: 'ADK indisponivel; resposta local baseada no acervo para revisao humana.',
          timestamp: timestamp(),
        });
      } catch (error) {
        failure = error;
      }
    }

    if (failure !== undefined && !simulated) {
      this.telemetry.publish(dto.classId, {
        type: 'chat.failed',
        runId,
        room: 'reception',
        status: 'FAILED',
        details: 'A solicitacao ao agente ADK falhou.',
        timestamp: timestamp(),
      });
      throw failure;
    }

    if (simulated) return { answer, runId, mode: 'simulation' };

    this.telemetry.publish(dto.classId, {
      type: 'chat.completed',
      runId,
      room: 'supervisor',
      status: 'COMPLETED',
      details: 'Resposta revisada pelo fluxo do escritorio.',
      timestamp: timestamp(),
    });
    return { answer, runId, mode: 'live' };
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
