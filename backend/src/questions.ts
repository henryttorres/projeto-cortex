import { Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Prisma } from '@prisma/client';
import { AuthRequest, SessionGuard } from './auth';
import { AccessService } from './access.service';
import { PrismaService } from './prisma.service';

export class AskQuestionDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(5) @MaxLength(3000) question!: string;
  @IsOptional() @IsUUID('4') subjectId?: string;
}

export class ReplyQuestionDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(2) @MaxLength(5000) answer!: string;
}

@Controller() @UseGuards(SessionGuard)
export class QuestionsController {
  constructor(private readonly db: PrismaService, private readonly access: AccessService) {}

  @Get('classes/:classId/questions')
  async list(@Param('classId', ParseUUIDPipe) classId: string, @Req() req: AuthRequest) {
    if (!req.principal.roles.some(role => role === 'teacher' || role === 'admin')) {
      throw new ForbiddenException('Este perfil não pode consultar o feed docente.');
    }
    await this.access.requireClass(classId, req.principal);
    const questions = await this.db.teacherQuestion.findMany({
      where: { classId },
      include: {
        asker: { select: { name: true } },
        student: { select: { name: true } },
        subject: { select: { id: true, name: true } },
        reply: { include: { author: { select: { name: true } } } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    const answered = questions.filter(question => question.reply !== null).length;
    return {
      questions,
      counts: { received: questions.length, awaitingResponse: questions.length - answered, answered },
    };
  }

  @Post('classes/:classId/questions')
  async ask(@Param('classId', ParseUUIDPipe) classId: string, @Body() dto: AskQuestionDto, @Req() req: AuthRequest) {
    if (!req.principal.roles.includes('student')) {
      throw new ForbiddenException('Somente estudantes podem enviar perguntas neste canal.');
    }
    const student = await this.db.student.findUnique({ where: { accountId: req.principal.id }, select: { id: true } });
    if (!student || !(await this.access.studentClasses(student.id, req.principal)).includes(classId)) {
      throw new NotFoundException('Turma não disponível para este estudante.');
    }
    if (dto.subjectId) {
      const subject = await this.db.subject.findFirst({ where: { id: dto.subjectId, classId }, select: { id: true } });
      if (!subject) throw new NotFoundException('Disciplina não disponível nesta turma.');
    }
    return this.db.teacherQuestion.create({
      data: { classId, subjectId: dto.subjectId, askerId: req.principal.id, studentId: student.id, question: dto.question },
    });
  }

  @Post('classes/:classId/questions/:questionId/replies')
  async reply(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: ReplyQuestionDto,
    @Req() req: AuthRequest,
  ) {
    if (!req.principal.roles.some(role => role === 'teacher' || role === 'admin')) {
      throw new ForbiddenException('Este perfil não pode responder perguntas.');
    }
    await this.access.requireClass(classId, req.principal);
    const question = await this.db.teacherQuestion.findFirst({ where: { id: questionId, classId }, select: { id: true } });
    if (!question) throw new NotFoundException('Pergunta não encontrada nesta turma.');
    try {
      return await this.db.teacherQuestionReply.create({
        data: { questionId, authorId: req.principal.id, answer: dto.answer },
        include: { author: { select: { name: true } } },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Esta pergunta já recebeu uma resposta.');
      }
      throw error;
    }
  }
}
