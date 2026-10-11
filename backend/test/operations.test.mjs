import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../dist/app.js';
import { hashPassword } from '../dist/password.js';
import { businessMinutes } from '../dist/operations.js';
const schema = `cortex_ops_test_${randomUUID().replaceAll('-', '')}`;
const original = process.env.DATABASE_URL;
const url = new URL(original); url.searchParams.set('schema', schema);
let db, app, server, first, cycleId, closed;
const actors = {};
const post = (who, path, data) => actors[who].agent.post(`/api${path}`).set('Origin', process.env.WEB_ORIGIN).set('X-CSRF-Token', actors[who].csrf).send(data);
before(async () => {
  if (process.env.NODE_ENV === 'production') throw new Error('Laboratório proibido em produção.');
  process.env.DATABASE_URL = url.toString();
  // Schema isolado: a distribuição nunca modifica a fila do usuário.
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env: process.env, stdio: 'ignore' });
  db = new PrismaClient(); app = await createApp(); server = app.getHttpServer();
  const password = randomBytes(24).toString('hex'), passwordHash = await hashPassword(password);
  for (const [name, role] of [['client', 'guardian'], ['other', 'student'], ['agent1', 'support'], ['agent2', 'support'], ['boss', 'supervisor'], ['coordinator', 'coordinator']]) {
    const account = await db.account.create({ data: { email: `${name}@demo.cortex.test`, name, passwordHash, roles: { create: { role } } } });
    const agent = request.agent(server);
    const res = await agent.post('/api/auth/login').set('Origin', process.env.WEB_ORIGIN).send({ email: account.email, password }).expect(201);
    actors[name] = { agent, id: account.id, csrf: res.body.csrfToken };
  }
  const team = await db.supportTeam.create({ data: { name: 'Equipe de teste', isDefault: true } });
  for (const [name, role] of [['agent1','support'],['agent2','support'],['boss','supervisor'],['coordinator','coordinator']]) await db.teamMember.create({ data: { teamId: team.id, accountId: actors[name].id, role } });
});
after(async () => {
  await app?.close(); await db?.$disconnect(); process.env.DATABASE_URL = original;
  const control = new PrismaClient();
  // Identificador interno e validado, sem entrada do usuário.
  if (!/^cortex_ops_test_[a-f0-9]{32}$/.test(schema)) throw new Error('Schema inválido');
  await control.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await control.$disconnect();
});
test('calendário útil: noite, fim de semana e sexta para segunda', () => {
  assert.equal(businessMinutes(new Date('2026-10-09T19:00Z'), new Date('2026-10-12T15:00Z')), 240);
  assert.equal(businessMinutes(new Date('2026-10-10T12:00Z'), new Date('2026-10-11T20:00Z')), 0);
  assert.equal(businessMinutes(new Date('2026-10-09T21:00Z'), new Date('2026-10-12T11:00Z')), 0);
});
test('roteamento concorrente equilibra carga e limita a cinco por pessoa', async () => {
  await post('agent1', '/operations/availability', { available: true }).expect(201);
  await post('agent2', '/operations/availability', { available: true }).expect(201);
  for (let i = 0; i < 6; i++) await Promise.all([0, 1].map(async () => {
    const res = await post('client', '/tickets', { requestId: randomUUID(), title: 'Teste de roteamento', description: 'Solicitação sintética.' }).expect(201); first ||= res.body.id;
  }));
  for (const who of ['agent1', 'agent2']) assert.equal(await db.ticket.count({ where: { assigneeId: actors[who].id } }), 5);
  assert.equal(await db.ticket.count({ where: { status: 'open' } }), 2);
  assert.equal(await db.ticketEntry.count({ where: { action: 'assigned' } }), 10);
});
test('encerrar alimenta métricas e libera vaga para a fila', async () => {
  const ticket = await db.ticket.findUniqueOrThrow({ where: { id: first } });
  closed = ticket.assigneeId === actors.agent1.id ? 'agent1' : 'agent2';
  await post(closed, `/tickets/${first}/actions`, { requestId: randomUUID(), version: ticket.version, action: 'resolve', message: 'Atendimento concluído.' }).expect(201);
  assert.equal(await db.ticket.count({ where: { status: 'open' } }), 1);
  const cycle = await db.ticketCycle.findFirstOrThrow({ where: { ticketId: first } }); cycleId = cycle.id;
  assert.ok(cycle.firstResponseAt); assert.ok(cycle.closedAt);
  const summary = (await actors.boss.agent.get('/api/operations/metrics').expect(200)).body.summary;
  assert.equal(summary.closed, 1); assert.equal(summary.csat, null); assert.equal(summary.firstSla, 100);
});
test('CSAT exige autoria, nota válida e unicidade', async () => {
  await post('other', `/tickets/${first}/rating`, { cycleId, score: 5 }).expect(404);
  await post('boss', `/tickets/${first}/rating`, { cycleId, score: 5 }).expect(404);
  await post('client', `/tickets/${first}/rating`, { cycleId, score: 6 }).expect(400);
  await post('client', `/tickets/${first}/rating`, { cycleId, score: 5 }).expect(201);
  await post('client', `/tickets/${first}/rating`, { cycleId, score: 5 }).expect(201);
  await post('client', `/tickets/${first}/rating`, { cycleId, score: 1 }).expect(409);
  const report = (await actors.boss.agent.get('/api/operations/metrics').expect(200)).body;
  assert.equal(report.summary.csat, 100); assert.equal(report.summary.ratings, 1);
  assert.equal(report.trend.reduce((n, d) => n + d.closed, 0), 1);
});
test('papéis e escopo impedem escalada por parâmetros', async () => {
  await actors.client.agent.get('/api/operations/metrics').expect(403);
  await post('client', '/operations/availability', { available: true }).expect(403);
  await post('agent1', '/operations/availability', { available: true, accountId: actors.boss.id }).expect(400);
  await actors.agent1.agent.get(`/api/operations/metrics?agentId=${actors.agent2.id}`).expect(400);
  const other = closed === 'agent1' ? 'agent2' : 'agent1';
  assert.equal((await actors[other].agent.get('/api/operations/metrics').expect(200)).body.summary.closed, 0);
  assert.equal((await actors.coordinator.agent.get('/api/operations/metrics').expect(200)).body.summary.closed, 1);
  await actors[other].agent.get(`/api/tickets/${first}`).expect(404);
});
test('relatório calcula tempo e descumprimento a partir das datas persistidas', async () => {
  const start = new Date(); start.setUTCDate(start.getUTCDate() - 1); start.setUTCHours(12, 0, 0, 0);
  while ([0, 6].includes(start.getUTCDay())) start.setUTCDate(start.getUTCDate() - 1);
  await db.ticketCycle.update({ where: { id: cycleId }, data: { startedAt: start, firstResponseAt: new Date(start.getTime() + 6 * 3600000), closedAt: new Date(start.getTime() + 7 * 3600000) } });
  const result = (await actors.boss.agent.get('/api/operations/metrics').expect(200)).body.summary;
  assert.equal(result.firstSla, 0); assert.equal(result.resolutionSla, 100);
  assert.equal(result.firstMinutes, 360); assert.equal(result.resolutionMinutes, 420); assert.equal(result.tmaMinutes, 60);
});
test('reabertura preserva CSAT; disponibilidade expirada não recebe', async () => {
  await db.account.updateMany({ data: { supportReadyUntil: new Date(0) } });
  const ticket = await db.ticket.findUniqueOrThrow({ where: { id: first } });
  await post('client', `/tickets/${first}/actions`, { requestId: randomUUID(), version: ticket.version, action: 'reopen', message: '' }).expect(201);
  assert.equal(await db.ticketCycle.count({ where: { ticketId: first } }), 2);
  assert.equal((await db.ticket.findUniqueOrThrow({ where: { id: first } })).assigneeId, null);
  assert.equal((await db.ticketCycle.findUniqueOrThrow({ where: { id: cycleId } })).score, 5);
  const latest = await db.ticketCycle.findFirstOrThrow({ where: { ticketId: first, closedAt: null } });
  await post('client', `/tickets/${first}/rating`, { cycleId: latest.id, score: 5 }).expect(409);
});
