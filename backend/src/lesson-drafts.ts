import { Body, Controller, ForbiddenException, Get, NotFoundException, Param, ParseUUIDPipe, Post, Req, UseGuards, BadRequestException, ConflictException } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { Equals, IsBoolean, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { AuthRequest, SessionGuard } from './auth';
import { AccessService } from './access.service';
import { PrismaService } from './prisma.service';

export class CreateLessonDraftDto {
  @IsOptional() @IsUUID('4') subjectId?: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(3) @MaxLength(160) title!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(3) @MaxLength(5000) objectives!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(5000) materials!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(3) @MaxLength(10000) activities!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(5000) assessment!: string;
}

export class PublishLessonDraftDto {
  @IsBoolean() @Equals(true) confirmReviewed!: boolean;
}

@Controller() @UseGuards(SessionGuard)
export class LessonDraftsController {
  constructor(private readonly db: PrismaService, private readonly access: AccessService) {}

  private requireWriter(req: AuthRequest) {
    if (!req.principal.roles.some(role => role === 'teacher' || role === 'admin')) {
      throw new ForbiddenException('Este perfil não pode gerenciar planos de aula.');
    }
  }

  @Get('classes/:classId/lesson-drafts')
  async list(@Param('classId', ParseUUIDPipe) classId: string, @Req() req: AuthRequest) {
    this.requireWriter(req);
    await this.access.requireClass(classId, req.principal);
    return this.db.lessonDraft.findMany({
      where: { classId },
      include: {
        subject: { select: { id: true, name: true } },
        author: { select: { name: true } },
        reviewer: { select: { name: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  @Post('classes/:classId/lesson-drafts')
  async create(@Param('classId', ParseUUIDPipe) classId: string, @Body() dto: CreateLessonDraftDto, @Req() req: AuthRequest) {
    this.requireWriter(req);
    await this.access.requireClass(classId, req.principal);
    if (dto.subjectId && !await this.db.subject.findFirst({ where: { id: dto.subjectId, classId }, select: { id: true } })) {
      throw new NotFoundException('Disciplina não disponível nesta turma.');
    }
    return this.db.lessonDraft.create({
      data: {
        ...dto,
        classId,
        authorId: req.principal.id,
        status: 'draft',
      },
      include: { subject: { select: { id: true, name: true } } },
    });
  }

  @Post('classes/:classId/lesson-drafts/:draftId/publish')
  async publish(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('draftId', ParseUUIDPipe) draftId: string,
    @Body() dto: PublishLessonDraftDto,
    @Req() req: AuthRequest,
  ) {
    this.requireWriter(req);
    if (dto.confirmReviewed !== true) throw new BadRequestException('Confirme a revisão humana antes de publicar.');
    await this.access.requireClass(classId, req.principal);
    const updated = await this.db.lessonDraft.updateMany({
      where: { id: draftId, classId, status: 'draft' },
      data: { status: 'published', reviewedBy: req.principal.id, reviewedAt: new Date(), publishedAt: new Date() },
    });
    if (!updated.count) {
      const draft = await this.db.lessonDraft.findFirst({ where: { id: draftId, classId }, select: { id: true, status: true } });
      if (!draft) throw new NotFoundException('Rascunho não encontrado nesta turma.');
      throw new ConflictException('Este plano já foi publicado ou não está mais em rascunho.');
    }
    return this.db.lessonDraft.findUniqueOrThrow({
      where: { id: draftId },
      include: { subject: { select: { id: true, name: true } }, reviewer: { select: { name: true } } },
    });
  }
}
