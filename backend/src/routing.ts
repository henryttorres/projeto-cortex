import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Principal } from './auth';
import { PrismaService } from './prisma.service';

export const manager = (user: Principal) => user.roles.some(r => ['admin', 'supervisor', 'coordinator', 'director'].includes(r));
export const staff = (user: Principal) => manager(user) || user.roles.includes('support');
export const teamScope = (user: Principal): Prisma.SupportTeamWhereInput => user.roles.includes('admin') ? {} : { active: true, members: { some: { accountId: user.id, role: { in: manager(user) ? user.roles.filter(r => ['supervisor','coordinator','director'].includes(r)) : ['support'] } } } };
export const ticketScope = (user: Principal): Prisma.TicketWhereInput => user.roles.includes('admin') ? {} : { OR: [
  { requesterId: user.id },
  ...(manager(user) ? [{ team: { is: teamScope(user) } }] : user.roles.includes('support') ? [{ team: { is: teamScope(user) }, OR: [{ assigneeId: user.id }, { assigneeId: null }] }] : [])
] };
export async function serial<T>(db: PrismaService, task: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let n = 0; n < 5; n++) {
    try { return await db.$transaction(task, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError) || !['P2034', 'P2002'].includes(err.code)) throw err;
      if (n === 4) throw new ConflictException('Operação concorrente. Tente novamente.');
      await new Promise(resolve => setTimeout(resolve, 25 * (n + 1)));
    }
  }
  throw new ConflictException('Tente novamente.');
}

// Lote limitado; renovações de disponibilidade processam o restante da fila.
export async function distribute(tx: Prisma.TransactionClient) {
  const people = await tx.account.findMany({ where: { active: true, supportReadyUntil: { gt: new Date() }, roles: { some: { role: 'support' } } }, select: { id: true, memberships: { where: { role: 'support', team: { active: true } }, select: { teamId: true } } }, orderBy: { id: 'asc' }, take: 100 });
  if (!people.length) return;
  const counts = await tx.ticket.groupBy({ by: ['assigneeId'], where: { status: 'in_progress', assigneeId: { in: people.map(p => p.id) } }, _count: true });
  const load = new Map(people.map(p => [p.id, counts.find(c => c.assigneeId === p.id)?._count || 0]));
  const waiting = await tx.ticket.findMany({ where: { status: 'open', assigneeId: null }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 25 });
  for (const ticket of waiting) {
    const person = people.filter(p => p.memberships.some(m => m.teamId === ticket.teamId) && p.id !== ticket.requesterId && load.get(p.id)! < 5).sort((a, b) => load.get(a.id)! - load.get(b.id)! || a.id.localeCompare(b.id))[0];
    if (!person) continue;
    await tx.ticket.update({ where: { id: ticket.id }, data: { assigneeId: person.id, status: 'in_progress', version: { increment: 1 }, entries: { create: { authorId: person.id, action: 'assigned', message: 'Distribuição automática por disponibilidade e menor carga.' } } } });
    load.set(person.id, load.get(person.id)! + 1);
  }
}
