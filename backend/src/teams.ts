import { Body, Controller, ForbiddenException, Get, Post, Req, UseGuards, Param, ParseUUIDPipe, ConflictException, NotFoundException } from '@nestjs/common';
import { IsBoolean, IsIn, IsInt, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';
import { AuthRequest, SessionGuard } from './auth';
import { PrismaService } from './prisma.service';
import { serial, staff, teamScope, ticketScope, distribute } from './routing';
import { businessMinutes } from './operations';
import { Role } from '@prisma/client';

class TeamDto { @IsString() @MinLength(3) @MaxLength(100) name!: string; }
class MemberDto { @IsUUID() accountId!: string; @IsIn(['support','supervisor','coordinator','director']) role!: Role; @IsBoolean() enabled!: boolean; }
class CommandDto {
  @IsUUID('4') requestId!: string;
  @IsInt() @Min(0) version!: number;
  @IsIn(['escalate','decision','transfer','registration']) action!: 'escalate'|'decision'|'transfer'|'registration';
  @IsString() @MinLength(3) @MaxLength(1000) message!: string;
  // Destino de transferência, setor de escalonamento ou nome do aluno, conforme a ação.
  @IsString() @MaxLength(100) value!: string;
}

// Dois dias de oito horas úteis; sem feriados, conforme política demonstrativa.
export function dueInTwoDays(start: Date) {
  let end = new Date(start);
  while (businessMinutes(start, end) < 960) end = new Date(end.getTime() + 60000);
  return end;
}

@Controller('teams') @UseGuards(SessionGuard)
export class TeamsController {
  constructor(private readonly db: PrismaService) {}
  @Get()
  async list(@Req() req: AuthRequest) {
    if (!staff(req.principal)) throw new ForbiddenException();
    return this.db.supportTeam.findMany({ where: teamScope(req.principal), orderBy: { name: 'asc' }, take: 100, include: { members: { select: { accountId: true, role: true, account: { select: { name: true, active: true } } } } } });
  }
  @Get('accounts')
  async accounts(@Req() req: AuthRequest) {
    if (!req.principal.roles.includes('admin')) throw new ForbiddenException();
    return this.db.account.findMany({ where: { active: true, roles: { some: { role: { in: ['support','supervisor','coordinator','director'] } } } }, select: { id: true, name: true, roles: { select: { role: true } } }, take: 100 });
  }
  @Post()
  async create(@Body() dto: TeamDto, @Req() req: AuthRequest) {
    if (!req.principal.roles.includes('admin')) throw new ForbiddenException();
    return this.db.supportTeam.upsert({ where: { name: dto.name }, create: { name: dto.name }, update: {} });
  }
  @Post(':id/members')
  async member(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MemberDto, @Req() req: AuthRequest) {
    if (!req.principal.roles.includes('admin')) throw new ForbiddenException();
    return serial(this.db, async tx => {
      if (!await tx.supportTeam.findUnique({ where: { id } })) throw new NotFoundException();
      const person = await tx.account.findFirst({ where: { id: dto.accountId, active: true, roles: { some: { role: dto.role } } } });
      if (!person) throw new ConflictException('Conta precisa estar ativa e possuir o papel selecionado.');
      if (!dto.enabled) {
        if (await tx.ticket.count({ where: { teamId: id, assigneeId: dto.accountId, status: { not: 'resolved' } } })) throw new ConflictException('Transfira os chamados ativos antes de remover o vínculo.');
        await tx.teamMember.deleteMany({ where: { teamId: id, accountId: dto.accountId } });
      } else await tx.teamMember.upsert({ where: { teamId_accountId: { teamId: id, accountId: dto.accountId } }, create: { teamId: id, accountId: dto.accountId, role: dto.role }, update: { role: dto.role } });
      return { ok: true };
    });
  }
}

@Controller('service') @UseGuards(SessionGuard)
export class ServiceController {
  constructor(private readonly db: PrismaService) {}
  @Get()
  async queue(@Req() req: AuthRequest) {
    const tickets = await this.db.ticket.findMany({ where: ticketScope(req.principal), orderBy: [{ escalationPending: 'desc' }, { updatedAt: 'desc' }], take: 100,
      select: { id: true, title: true, status: true, version: true, teamId: true, team: { select: { name: true } }, requesterId: true, assigneeId: true, escalationRole: true, escalationDueAt: true, escalationPending: true, registeredStudentId: true,
        entries: { where: { action: { in: ['escalate','decision','registration','transfer'] } }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, action: true, message: true, createdAt: true, author: { select: { name: true } } } } } });
    return { items: tickets, limit: 100, policy: 'Dois dias úteis = 16h úteis; seg–sex 09–17h Bahia, sem feriados.' };
  }
  @Post(':id')
  async command(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CommandDto, @Req() req: AuthRequest) {
    const user = req.principal, admin = user.roles.includes('admin');
    return serial(this.db, async tx => {
      const ticket = await tx.ticket.findFirst({ where: { id, ...ticketScope(user) } });
      if (!ticket) throw new NotFoundException();
      const message = `${dto.message}\nReferência: ${dto.value}`;
      const prior = await tx.ticketEntry.findUnique({ where: { id: dto.requestId } });
      if (prior) {
        if (prior.ticketId !== id || prior.authorId !== user.id || prior.action !== dto.action || prior.message !== message) throw new ConflictException('Identificador já utilizado.');
        return { ok: true };
      }
      if (ticket.status === 'resolved') throw new ConflictException('Reabra o atendimento primeiro.');
      const operator = admin || (user.roles.includes('support') && ticket.assigneeId === user.id);
      if (dto.action === 'escalate') {
        if (!operator) throw new ForbiddenException();
        if (!['coordinator','director','admin'].includes(dto.value)) throw new ConflictException('Setor inválido.');
        if (ticket.escalationPending) throw new ConflictException('Já existe decisão pendente.');
        await tx.ticket.update({ where: { id }, data: { escalationRole: dto.value as Role, escalationDueAt: dueInTwoDays(new Date()), escalationPending: true } });
      } else if (dto.action === 'decision') {
        if (!ticket.escalationPending || !ticket.escalationRole) throw new ConflictException('Não há decisão pendente.');
        if (!admin && ticket.requesterId === user.id) throw new ForbiddenException('Não aprove sua própria solicitação.');
        if (!admin && (!user.roles.includes(ticket.escalationRole) || !await tx.teamMember.findFirst({ where: { teamId: ticket.teamId || '', accountId: user.id, role: ticket.escalationRole, team: { active: true } } }))) throw new ForbiddenException();
        if (!['approve','reject'].includes(dto.value)) throw new ConflictException('Decisão inválida.');
        if (dto.value === 'approve' && ticket.registeredStudentId && ticket.escalationRole === 'admin') {
          // Somente ADMIN confirma vínculo que libera dados acadêmicos.
          if (!admin) throw new ForbiddenException('Verificação de vínculo exige ADMIN.');
          await tx.guardianLink.update({ where: { accountId_studentId: { accountId: ticket.requesterId, studentId: ticket.registeredStudentId } }, data: { verified: true } });
        }
        await tx.ticket.update({ where: { id }, data: { escalationPending: false } });
      } else if (dto.action === 'registration') {
        if (!operator) throw new ForbiddenException();
        if (ticket.registeredStudentId || ticket.escalationPending) throw new ConflictException('Cadastro ou decisão já existente.');
        if (dto.value.trim().length < 3) throw new ConflictException('Informe o nome completo do aluno.');
        const guardian = await tx.account.findFirst({ where: { id: ticket.requesterId, active: true, roles: { some: { role: 'guardian' } } } });
        if (!guardian) throw new ConflictException('Cadastro exige responsável solicitante autenticado.');
        const student = await tx.student.create({ data: { name: dto.value.trim(), guardians: { create: { accountId: guardian.id, verified: false } } } });
        await tx.ticket.update({ where: { id }, data: { registeredStudentId: student.id, escalationRole: 'admin', escalationPending: true, escalationDueAt: dueInTwoDays(new Date()) } });
      } else {
        if (!admin) throw new ForbiddenException();
        if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(dto.value)) throw new ConflictException('Equipe inválida.');
        const team = await tx.supportTeam.findFirst({ where: { id: dto.value, active: true } });
        if (!team) throw new ConflictException('Equipe indisponível.');
        await tx.ticket.update({ where: { id }, data: { teamId: team.id, assigneeId: null, status: 'open' } });
        await tx.ticketCycle.updateMany({ where: { ticketId: id, closedAt: null }, data: { teamId: team.id } });
      }
      const changed = await tx.ticket.updateMany({ where: { id, version: dto.version }, data: { version: { increment: 1 } } });
      if (changed.count !== 1) throw new ConflictException('Chamado alterado. Atualize antes de continuar.');
      await tx.ticketEntry.create({ data: { id: dto.requestId, ticketId: id, authorId: user.id, action: dto.action, message } });
      if (dto.action === 'transfer') await distribute(tx);
      return { ok: true };
    });
  }
}
