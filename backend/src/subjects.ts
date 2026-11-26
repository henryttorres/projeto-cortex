import { Body, ConflictException, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { Prisma } from '@prisma/client';
import { AuthRequest, SessionGuard } from './auth';
import { AccessService } from './access.service';
import { PrismaService } from './prisma.service';

export class CreateSubjectDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @IsUrl({ protocols: ['https'], require_protocol: true }) @MaxLength(2048) notebookLmUrl?: string | null;
}

export class UpdateSubjectDto {
  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @IsUrl({ protocols: ['https'], require_protocol: true }) @MaxLength(2048) notebookLmUrl?: string | null;
}

@Controller() @UseGuards(SessionGuard)
export class SubjectsController {
  constructor(private readonly db: PrismaService, private readonly access: AccessService) {}

  private requireWriter(req: AuthRequest) {
    if (!req.principal.roles.some(role => role === 'teacher' || role === 'admin')) {
      throw new ForbiddenException('Apenas docentes podem gerenciar disciplinas.');
    }
  }

  @Get('classes/:classId/subjects')
  async list(@Param('classId', ParseUUIDPipe) classId: string, @Req() req: AuthRequest) {
    await this.access.requireClass(classId, req.principal);
    return this.db.subject.findMany({ where: { classId }, orderBy: { name: 'asc' } });
  }

  @Post('classes/:classId/subjects')
  async create(@Param('classId', ParseUUIDPipe) classId: string, @Body() dto: CreateSubjectDto, @Req() req: AuthRequest) {
    this.requireWriter(req);
    await this.access.requireClass(classId, req.principal);
    try {
      return await this.db.subject.create({ data: { classId, name: dto.name, notebookLmUrl: dto.notebookLmUrl || null } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Já existe uma disciplina com esse nome nesta turma.');
      }
      throw error;
    }
  }

  @Patch('subjects/:id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSubjectDto, @Req() req: AuthRequest) {
    this.requireWriter(req);
    const subject = await this.db.subject.findUnique({ where: { id } });
    if (!subject) throw new NotFoundException('Disciplina não encontrada.');
    await this.access.requireClass(subject.classId, req.principal);
    try {
      return await this.db.subject.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.notebookLmUrl !== undefined ? { notebookLmUrl: dto.notebookLmUrl || null } : {}),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Já existe uma disciplina com esse nome nesta turma.');
      }
      throw error;
    }
  }

  @Delete('subjects/:id')
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthRequest) {
    this.requireWriter(req);
    const subject = await this.db.subject.findUnique({ where: { id }, select: { id: true, classId: true } });
    if (!subject) throw new NotFoundException('Disciplina não encontrada.');
    await this.access.requireClass(subject.classId, req.principal);
    await this.db.subject.delete({ where: { id } });
    return { message: 'Disciplina removida.' };
  }
}
