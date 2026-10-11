import { Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Prisma } from '@prisma/client';
import { AuthRequest, SessionGuard } from './auth';
import { AccessService } from './access.service';
import { PrismaService } from './prisma.service';

export class PublishDto {
  @IsUUID('4') publicationId!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(3) @MaxLength(120) title!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(3) @MaxLength(5000) message!: string;
}
const selection = { id: true, title: true, message: true, publishedAt: true, author: { select: { name: true } } } satisfies Prisma.CommunicationSelect;

@Controller() @UseGuards(SessionGuard)
export class CommunicationsController {
  constructor(private readonly db: PrismaService, private readonly access: AccessService) {}
  private list(classIds: string[]) {
    return this.db.communication.findMany({ where: { classes: { some: { classId: { in: classIds } } } }, select: selection, orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }] });
  }
  private async detail(id: string, classIds: string[]) {
    const item = await this.db.communication.findFirst({ where: { id, classes: { some: { classId: { in: classIds } } } }, select: selection });
    if (!item) throw new NotFoundException('Comunicado não disponível neste contexto.');
    return item;
  }
  @Get('students/:id/communications')
  async studentList(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthRequest) {
    return this.list(await this.access.studentClasses(id, req.principal));
  }
  @Get('students/:id/communications/:communicationId')
  async studentDetail(@Param('id', ParseUUIDPipe) id: string, @Param('communicationId', ParseUUIDPipe) communicationId: string, @Req() req: AuthRequest) {
    return this.detail(communicationId, await this.access.studentClasses(id, req.principal));
  }
  @Get('classes/:id/communications')
  async classList(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthRequest) {
    await this.access.requireClass(id, req.principal);
    return this.list([id]);
  }
  @Get('classes/:id/communications/:communicationId')
  async classDetail(@Param('id', ParseUUIDPipe) id: string, @Param('communicationId', ParseUUIDPipe) communicationId: string, @Req() req: AuthRequest) {
    await this.access.requireClass(id, req.principal);
    return this.detail(communicationId, [id]);
  }
  @Post('classes/:id/communications')
  async publish(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PublishDto, @Req() req: AuthRequest) {
    if (!req.principal.roles.some(r => r === 'admin' || r === 'teacher')) throw new ForbiddenException('Este perfil não pode publicar comunicados.');
    await this.access.requireClass(id, req.principal);
    try {
      // Conteúdo, autoria e destino são gravados atomicamente; autoria vem da sessão.
      return await this.db.communication.create({ data: { id: dto.publicationId, authorId: req.principal.id, title: dto.title, message: dto.message, classes: { create: { classId: id } } }, select: selection });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      // Reenviar após falha de conexão não duplica a mesma publicação.
      const previous = await this.db.communication.findUnique({ where: { id: dto.publicationId }, include: { classes: true } });
      if (!previous || previous.authorId !== req.principal.id || previous.title !== dto.title || previous.message !== dto.message || previous.classes.length !== 1 || previous.classes[0].classId !== id) throw new ConflictException('Identificador de publicação já utilizado. Atualize os comunicados antes de tentar novamente.');
      return this.detail(previous.id, [id]);
    }
  }
}
