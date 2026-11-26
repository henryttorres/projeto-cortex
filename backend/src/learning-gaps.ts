import { Body, Controller, ForbiddenException, Get, NotFoundException, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { LearningGapKind } from '@prisma/client';
import { AuthRequest, SessionGuard } from './auth';
import { AccessService } from './access.service';
import { PrismaService } from './prisma.service';

export class CreateLearningGapDto {
  @IsEnum(LearningGapKind) kind!: LearningGapKind;
  @IsOptional() @IsUUID('4') subjectId?: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(5) @MaxLength(3000) description!: string;
}

export class LearningGapFilterDto {
  @IsOptional() @IsUUID('4') subjectId?: string;
}

export class ClassDiagnosisDto {
  @IsOptional() @IsUUID('4') subjectId?: string;
}

const recommendations: Record<LearningGapKind, string> = {
  duvida_recorrente: 'Retomar o conceito em uma explicação curta e verificar a compreensão com uma pergunta de saída.',
  tentativa_cola: 'Reforçar estratégias de estudo e oferecer uma atividade formativa acompanhada do raciocínio do estudante.',
  erro_conceitual: 'Revisitar pré-requisitos e comparar exemplos e contraexemplos antes de avançar.',
};

@Controller() @UseGuards(SessionGuard)
export class LearningGapsController {
  constructor(private readonly db: PrismaService, private readonly access: AccessService) {}

  private requireTeacher(req: AuthRequest) {
    if (!req.principal.roles.some(role => role === 'teacher' || role === 'admin')) {
      throw new ForbiddenException('Este perfil não pode consultar o diagnóstico docente.');
    }
  }

  private async requireSubject(classId: string, subjectId?: string) {
    if (subjectId && !await this.db.subject.findFirst({ where: { id: subjectId, classId }, select: { id: true } })) {
      throw new NotFoundException('Disciplina não disponível nesta turma.');
    }
  }

  @Post('classes/:classId/learning-gaps')
  async create(@Param('classId', ParseUUIDPipe) classId: string, @Body() dto: CreateLearningGapDto, @Req() req: AuthRequest) {
    let studentId: string | null = null;
    if (req.principal.roles.includes('student')) {
      const student = await this.db.student.findUnique({ where: { accountId: req.principal.id }, select: { id: true } });
      if (!student || !(await this.access.studentClasses(student.id, req.principal)).includes(classId)) {
        throw new NotFoundException('Turma não disponível para este estudante.');
      }
      studentId = student.id;
    } else {
      this.requireTeacher(req);
      await this.access.requireClass(classId, req.principal);
    }
    await this.requireSubject(classId, dto.subjectId);
    return this.db.learningGap.create({
      data: {
        classId,
        subjectId: dto.subjectId,
        studentId,
        reportedById: req.principal.id,
        kind: dto.kind,
        description: dto.description,
      },
      select: { id: true, classId: true, subjectId: true, kind: true, description: true, createdAt: true },
    });
  }

  @Get('classes/:classId/learning-gaps')
  async list(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query() filter: LearningGapFilterDto,
    @Req() req: AuthRequest,
  ) {
    this.requireTeacher(req);
    await this.access.requireClass(classId, req.principal);
    await this.requireSubject(classId, filter.subjectId);
    return this.db.learningGap.findMany({
      where: { classId, ...(filter.subjectId ? { subjectId: filter.subjectId } : {}) },
      select: { id: true, subjectId: true, kind: true, description: true, createdAt: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  @Get('classes/:classId/diagnosis')
  async latestDiagnosis(@Param('classId', ParseUUIDPipe) classId: string, @Query() filter: ClassDiagnosisDto, @Req() req: AuthRequest) {
    this.requireTeacher(req);
    await this.access.requireClass(classId, req.principal);
    await this.requireSubject(classId, filter.subjectId);
    return this.db.classDiagnosis.findFirst({
      where: { classId, subjectId: filter.subjectId || null },
      include: { generatedBy: { select: { name: true } }, subject: { select: { name: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  @Post('classes/:classId/diagnosis')
  async diagnose(@Param('classId', ParseUUIDPipe) classId: string, @Body() dto: ClassDiagnosisDto, @Req() req: AuthRequest) {
    this.requireTeacher(req);
    await this.access.requireClass(classId, req.principal);
    await this.requireSubject(classId, dto.subjectId);
    const grouped = await this.db.learningGap.groupBy({
      by: ['kind'],
      where: { classId, ...(dto.subjectId ? { subjectId: dto.subjectId } : {}) },
      _count: { _all: true },
    });
    const indicators = Object.fromEntries(Object.values(LearningGapKind).map(kind => [
      kind,
      grouped.find(item => item.kind === kind)?._count._all || 0,
    ])) as Record<LearningGapKind, number>;
    const totalGaps = Object.values(indicators).reduce((total, count) => total + count, 0);
    const summary = totalGaps
      ? `Foram registradas ${totalGaps} lacunas de aprendizagem neste contexto. Use os indicadores por tipo como sinais para orientar a revisão docente; eles não substituem avaliação pedagógica.`
      : 'Ainda não há lacunas registradas neste contexto. O diagnóstico será mais informativo quando houver registros.';
    const activeKinds = Object.entries(indicators).filter(([, count]) => count > 0).map(([kind]) => kind as LearningGapKind);
    const recommendationText = activeKinds.length
      ? activeKinds.map(kind => recommendations[kind]).join(' ')
      : 'Acompanhar as dúvidas da turma e registrar dificuldades observadas antes de definir intervenções.';
    return this.db.classDiagnosis.create({
      data: {
        classId,
        subjectId: dto.subjectId,
        generatedById: req.principal.id,
        totalGaps,
        summary,
        recommendations: recommendationText,
        indicators,
      },
      include: { generatedBy: { select: { name: true } }, subject: { select: { name: true } } },
    });
  }
}
