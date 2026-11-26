import { BadRequestException, Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from './prisma.service';
import { AuthRequest, SessionGuard } from './auth';
import { AccessService } from './access.service';

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 120;
const MAX_SOURCE_CHARS = 16000;

export class IngestRagDto {
  @IsUUID('4') subjectId!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(2) @MaxLength(160) title!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(255) sourceName!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(20) @MaxLength(MAX_SOURCE_CHARS) content!: string;
}

export class SearchRagDto {
  @IsUUID('4') subjectId!: string;
  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MaxLength(1000) query?: string;
}

export function splitRagContent(value: string) {
  const text = value.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').trim();
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + CHUNK_SIZE, text.length);
    if (end < text.length) {
      const paragraphBoundary = text.lastIndexOf('\n', end);
      const wordBoundary = text.lastIndexOf(' ', end);
      const boundary = Math.max(paragraphBoundary, wordBoundary);
      if (boundary > start + Math.floor(CHUNK_SIZE / 2)) end = boundary;
    }
    const chunk = text.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= text.length) break;
    start = Math.max(start + 1, end - CHUNK_OVERLAP);
    while (start < text.length && /\s/.test(text[start])) start++;
  }
  return chunks;
}

function normalizedWords(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR')
    .match(/[\p{L}\p{N}]{3,}/gu) || [];
}

export async function searchRagChunks(
  db: PrismaService,
  input: { classId: string; subjectId: string; query?: string; limit?: number },
) {
  const records = await db.ragDocumentChunk.findMany({
    where: { classId: input.classId, subjectId: input.subjectId },
    orderBy: [{ createdAt: 'desc' }, { chunkIndex: 'asc' }],
    take: 300,
  });
  const limit = Math.min(Math.max(input.limit ?? 8, 1), 20);
  const words = [...new Set(normalizedWords(input.query || ''))];
  if (!words.length) return records.slice(0, limit);
  return records.map(record => {
    const haystack = normalizedWords(`${record.title} ${record.sourceName} ${record.content}`);
    const wordSet = new Set(haystack);
    const score = words.reduce((total, word) => total + (wordSet.has(word) ? 1 : 0), 0);
    return { record, score };
  }).filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score || right.record.createdAt.getTime() - left.record.createdAt.getTime())
    .slice(0, limit)
    .map(item => item.record);
}

@Controller() @UseGuards(SessionGuard)
export class RagIngestController {
  constructor(private readonly db: PrismaService, private readonly access: AccessService) {}

  private async requireWriter(classId: string, subjectId: string, req: AuthRequest) {
    if (!req.principal.roles.some(role => role === 'teacher' || role === 'admin')) {
      throw new NotFoundException('Acervo não disponível para esta conta.');
    }
    await this.access.requireClass(classId, req.principal);
    const subject = await this.db.subject.findFirst({ where: { id: subjectId, classId }, select: { id: true } });
    if (!subject) throw new NotFoundException('Disciplina não disponível nesta turma.');
  }

  @Post('classes/:classId/rag-chunks')
  async ingest(@Param('classId', ParseUUIDPipe) classId: string, @Body() dto: IngestRagDto, @Req() req: AuthRequest) {
    await this.requireWriter(classId, dto.subjectId, req);
    if (dto.content.length > MAX_SOURCE_CHARS) throw new BadRequestException(`O trecho deve ter no máximo ${MAX_SOURCE_CHARS} caracteres.`);
    const chunks = splitRagContent(dto.content);
    if (!chunks.length) throw new BadRequestException('O conteúdo não contém texto para indexar.');
    return this.db.$transaction(chunks.map((content, chunkIndex) => this.db.ragDocumentChunk.create({
      data: { classId, subjectId: dto.subjectId, title: dto.title, sourceName: dto.sourceName, chunkIndex, content },
      select: { id: true, subjectId: true, title: true, sourceName: true, chunkIndex: true, content: true, createdAt: true },
    })));
  }

  @Get('classes/:classId/rag-chunks')
  async search(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query() query: SearchRagDto,
    @Req() req: AuthRequest,
  ) {
    await this.requireWriter(classId, query.subjectId, req);
    return searchRagChunks(this.db, { classId, subjectId: query.subjectId, query: query.query });
  }
}
