import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Prisma, TicketStatus } from '@prisma/client';
import { AuthRequest, Principal, SessionGuard } from './auth';
import { PrismaService } from './prisma.service';

class PageDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
}
class ListDto extends PageDto {
  @IsOptional() @IsIn(['open', 'in_progress', 'resolved']) status?: TicketStatus;
}
class OpenTicketDto {
  @IsUUID('4') requestId!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(3) @MaxLength(120) title!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(3) @MaxLength(5000) description!: string;
}
class ActionDto {
  @IsUUID('4') requestId!: string;
  @IsInt() @Min(0) @Max(2147483646) version!: number;
  @IsIn(['reply', 'claim', 'resolve', 'reopen']) action!: 'reply' | 'claim' | 'resolve' | 'reopen';
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MaxLength(5000) message!: string;
}
const summary = { id: true, title: true, status: true, version: true, createdAt: true, updatedAt: true, requester: { select: { id: true, name: true } }, assignee: { select: { id: true, name: true } } } satisfies Prisma.TicketSelect;
const staff = (user: Principal) => user.roles.some(role => role === 'support' || role === 'admin');
const scope = (user: Principal): Prisma.TicketWhereInput => staff(user) ? {} : { requesterId: user.id };
const missing = () => new NotFoundException('Chamado não disponível para esta conta.');

@Controller('tickets') @UseGuards(SessionGuard)
export class TicketsController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  async list(@Query() query: ListDto, @Req() req: AuthRequest) {
    const where = { ...scope(req.principal), ...(query.status ? { status: query.status } : {}) };
    const [items, total] = await this.db.$transaction([
      this.db.ticket.findMany({ where, select: summary, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * 20, take: 20 }),
      this.db.ticket.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: 20 };
  }

  @Get(':id')
  async detail(@Param('id', ParseUUIDPipe) id: string, @Query() query: PageDto, @Req() req: AuthRequest) {
    const ticket = await this.db.ticket.findFirst({ where: { id, ...scope(req.principal) }, select: { ...summary, description: true } });
    if (!ticket) throw missing();
    const [entries, total] = await this.db.$transaction([
      this.db.ticketEntry.findMany({ where: { ticketId: id }, select: { id: true, action: true, message: true, createdAt: true, author: { select: { name: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * 30, take: 30 }),
      this.db.ticketEntry.count({ where: { ticketId: id } }),
    ]);
    return { ticket, entries: entries.reverse(), total, page: query.page, pageSize: 30 };
  }

  @Post()
  async open(@Body() dto: OpenTicketDto, @Req() req: AuthRequest) {
    try {
      return await this.db.ticket.create({ data: { id: dto.requestId, requesterId: req.principal.id, title: dto.title, description: dto.description, entries: { create: { authorId: req.principal.id, action: 'opened', message: '' } } }, select: summary });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      const previous = await this.db.ticket.findUnique({ where: { id: dto.requestId } });
      if (!previous || previous.requesterId !== req.principal.id || previous.title !== dto.title || previous.description !== dto.description) throw new ConflictException('Identificador de abertura já utilizado.');
      return this.db.ticket.findUniqueOrThrow({ where: { id: previous.id }, select: summary });
    }
  }

  @Post(':id/actions')
  async act(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ActionDto, @Req() req: AuthRequest) {
    if ((dto.action === 'reply' || dto.action === 'resolve') ? dto.message.length < 3 : dto.message !== '') throw new BadRequestException('Resposta e encerramento exigem mensagem de pelo menos 3 caracteres; assumir e reabrir usam mensagem vazia.');
    const user = req.principal;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.db.$transaction(async tx => {
          const ticket = await tx.ticket.findFirst({ where: { id, ...scope(user) } });
          if (!ticket) throw missing();
          const prior = await tx.ticketEntry.findUnique({ where: { id: dto.requestId } });
          if (prior) {
            if (prior.ticketId !== id || prior.authorId !== user.id || prior.action !== dto.action || prior.message !== dto.message) throw new ConflictException('Identificador de ação já utilizado.');
            return { id, version: ticket.version };
          }
          const operator = staff(user) && (ticket.assigneeId === user.id || user.roles.includes('admin'));
          let status = ticket.status;
          let assigneeId = ticket.assigneeId;
          if (dto.action === 'claim') {
            if (!staff(user)) throw new ForbiddenException('Somente a equipe pode assumir chamados.');
            if (ticket.assigneeId || ticket.status !== 'open') throw new ConflictException('Este chamado já foi assumido ou encerrado. Atualize o histórico.');
            assigneeId = user.id; status = 'in_progress';
          } else if (dto.action === 'reply') {
            if (ticket.requesterId !== user.id && !operator) throw new ForbiddenException('Assuma o chamado antes de responder.');
            if (ticket.status === 'resolved') throw new ConflictException('Reabra o chamado antes de responder.');
          } else if (dto.action === 'resolve') {
            if (!operator) throw new ForbiddenException('Somente o atendente responsável ou administração pode encerrar.');
            if (ticket.status !== 'in_progress') throw new ConflictException('Somente chamados em atendimento podem ser encerrados.');
            status = 'resolved';
          } else {
            if (ticket.requesterId !== user.id && !operator) throw new ForbiddenException('Esta conta não pode reabrir o chamado.');
            if (ticket.status !== 'resolved') throw new ConflictException('Somente chamados encerrados podem ser reabertos.');
            status = 'open'; assigneeId = null;
          }
          // Versão e transação impedem respostas/atribuições concorrentes sobre estado obsoleto.
          const changed = await tx.ticket.updateMany({ where: { id, version: dto.version }, data: { status, assigneeId, version: { increment: 1 } } });
          if (changed.count !== 1) throw new ConflictException('O chamado mudou. Atualize o histórico antes de tentar novamente.');
          await tx.ticketEntry.create({ data: { id: dto.requestId, ticketId: id, authorId: user.id, action: dto.action, message: dto.message } });
          return { id, version: dto.version + 1 };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2034', 'P2002'].includes(error.code)) {
          if (attempt < 2) continue;
          throw new ConflictException('Conflito simultâneo. Atualize o histórico e tente novamente.');
        }
        throw error;
      }
    }
  }
}
