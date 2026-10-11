import { Body, Controller, ForbiddenException, Get, Post, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { AuthRequest, SessionGuard } from './auth';
import { PrismaService } from './prisma.service';
import { distribute, manager, serial, staff } from './routing';

class AvailabilityDto { @IsBoolean() available!: boolean; }
class PeriodDto { @IsOptional() @Type(() => Number) @IsIn([7, 30, 90]) days = 30; }

// Política demonstrativa versionada: Bahia UTC−3, seg–sex 09–17h, sem feriados/pausas.
export function businessMinutes(start: Date, end: Date): number {
  if (end <= start) return 0;
  const day = new Date(start.getTime() - 3 * 3600000);
  day.setUTCHours(12, 0, 0, 0);
  let milliseconds = 0;
  for (; day < end; day.setUTCDate(day.getUTCDate() + 1)) {
    if ([0, 6].includes(day.getUTCDay())) continue;
    milliseconds += Math.max(0, Math.min(end.getTime(), day.getTime() + 8 * 3600000) - Math.max(start.getTime(), day.getTime()));
  }
  return milliseconds / 60000;
}
const mean = (items: number[]) => items.length ? items.reduce((a, b) => a + b, 0) / items.length : null;
const percent = (met: number, total: number) => total ? met / total * 100 : null;

@Controller('operations') @UseGuards(SessionGuard)
export class OperationsController {
  constructor(private readonly db: PrismaService) {}
  @Get('availability')
  async availability(@Req() req: AuthRequest) {
    if (!req.principal.roles.includes('support')) throw new ForbiddenException();
    const account = await this.db.account.findUniqueOrThrow({ where: { id: req.principal.id } });
    return { available: !!account.supportReadyUntil && account.supportReadyUntil > new Date(), capacity: 5 };
  }
  @Post('availability')
  async ready(@Body() dto: AvailabilityDto, @Req() req: AuthRequest) {
    if (!req.principal.roles.includes('support')) throw new ForbiddenException();
    await serial(this.db, async tx => {
      await tx.account.update({ where: { id: req.principal.id }, data: { supportReadyUntil: dto.available ? new Date(Date.now() + 5 * 60000) : null } });
      if (dto.available) await distribute(tx);
    });
    return { available: dto.available, capacity: 5 };
  }
  @Get('metrics')
  async metrics(@Query() query: PeriodDto, @Req() req: AuthRequest) {
    const user = req.principal;
    if (!staff(user)) throw new ForbiddenException('Indicadores exclusivos da operação.');
    const generatedAt = new Date();
    const from = new Date(generatedAt.getTime() - query.days * 86400000);
    const where = { closedAt: { gte: from, lte: generatedAt }, ...(manager(user) ? {} : { resolverId: user.id }) };
    if (await this.db.ticketCycle.count({ where }) > 10000) throw new BadRequestException('Volume acima do limite desta versão. Selecione período menor.');
    const cycles = await this.db.ticketCycle.findMany({ where, include: { resolver: { select: { id: true, name: true } }, ticket: { select: { requesterId: true } } } });
    const aggregate = (rows: typeof cycles) => {
      const complete = rows.filter(c => c.firstResponseAt !== null);
      const rated = rows.filter(c => c.score !== null && c.resolverId !== c.ticket.requesterId);
      return { closed: rows.length, measured: complete.length,
        firstSla: percent(complete.filter(c => businessMinutes(c.startedAt, c.firstResponseAt!) <= c.firstTargetMinutes).length, complete.length),
        resolutionSla: percent(rows.filter(c => businessMinutes(c.startedAt, c.closedAt!) <= c.resolutionTargetMinutes).length, rows.length),
        firstMinutes: mean(complete.map(c => businessMinutes(c.startedAt, c.firstResponseAt!))),
        resolutionMinutes: mean(rows.map(c => businessMinutes(c.startedAt, c.closedAt!))),
        tmaMinutes: mean(complete.map(c => businessMinutes(c.firstResponseAt!, c.closedAt!))),
        csat: percent(rated.filter(c => c.score! >= 4).length, rated.length), ratings: rated.length,
        participation: percent(rated.length, rows.filter(c => c.resolverId !== c.ticket.requesterId).length) };
    };
    const groups = [...new Set(cycles.map(c => c.resolverId).filter(Boolean))];
    return { generatedAt, from, days: query.days, scope: manager(user) ? 'institution' : 'personal', policy: 'Demonstração · Bahia · seg–sex 09–17h · sem feriados · SLA 4h/16h úteis',
      summary: aggregate(cycles), agents: groups.map(id => ({ id, name: cycles.find(c => c.resolverId === id)!.resolver!.name, ...aggregate(cycles.filter(c => c.resolverId === id)) })),
      trend: Array.from({ length: query.days + 1 }, (_, i) => {
        const date = new Date(from.getTime() + i * 86400000).toLocaleDateString('en-CA', { timeZone: 'America/Bahia' });
        return { date, closed: cycles.filter(c => c.closedAt!.toLocaleDateString('en-CA', { timeZone: 'America/Bahia' }) === date).length };
      }) };
  }
}
