import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../dist/app.js';
import { hashPassword } from '../dist/password.js';

const db = new PrismaClient();
const origin = process.env.WEB_ORIGIN;
const actors = {};
const accounts = [], tickets = [];
let app, server;
before(async () => {
  if (process.env.NODE_ENV === 'production') throw new Error('Teste sintético proibido em produção.');
  app = await createApp(); server = app.getHttpServer();
  const password = randomBytes(24).toString('hex');
  const passwordHash = await hashPassword(password);
  for (const [name, role] of [['owner', 'guardian'], ['other', 'student'], ['teacher', 'teacher'], ['staff', 'support'], ['staff2', 'support'], ['admin', 'admin']]) {
    const account = await db.account.create({ data: { name: `Teste ${name}`, email: `${randomUUID()}@demo.cortex.test`, passwordHash, roles: { create: { role } } } });
    accounts.push(account.id);
    const agent = request.agent(server);
    const res = await agent.post('/api/auth/login').set('Origin', origin).send({ email: account.email, password }).expect(201);
    actors[name] = { agent, csrf: res.body.csrfToken, id: account.id };
    if (role === 'support') { const team = await db.supportTeam.findFirstOrThrow({ where: { isDefault: true } }); await db.teamMember.create({ data: { teamId: team.id, accountId: account.id, role } }); }
  }
});
after(async () => {
  await db.ticket.deleteMany({ where: { id: { in: tickets } } });
  await db.teamMember.deleteMany({ where: { accountId: { in: accounts } } });
  await db.account.deleteMany({ where: { id: { in: accounts } } });
  await app?.close(); await db.$disconnect();
});
const post = (actor, path, body) => actors[actor].agent.post(`/api${path}`).set('Origin', origin).set('X-CSRF-Token', actors[actor].csrf).send(body);
async function open() {
  const id = randomUUID(); tickets.push(id);
  const body = { requestId: id, title: 'Dúvida de teste', description: 'Solicitação sintética de atendimento.' };
  const res = await post('owner', '/tickets', body).expect(201);
  return { id, body, ticket: res.body };
}
const act = (actor, id, action, version, message = '', requestId = randomUUID()) => post(actor, `/tickets/${id}/actions`, { action, version, message, requestId });

test('autenticação, origem e CSRF são obrigatórios; DTO recusa privilégio forjado', async () => {
  await request(server).get('/api/tickets').expect(401);
  await request(server).get('/api/tickets').set('Cookie', `cortex_session=${'a'.repeat(64)}`).expect(401);
  const body = { requestId: randomUUID(), title: 'Dúvida de teste', description: 'Descrição válida de teste.' };
  await actors.owner.agent.post('/api/tickets').set('Origin', origin).send(body).expect(403);
  await actors.owner.agent.post('/api/tickets').set('Origin', 'https://invalid.example').set('X-CSRF-Token', actors.owner.csrf).send(body).expect(403);
  for (const extra of [{ requesterId: actors.other.id }, { assigneeId: actors.staff.id }, { status: 'resolved' }, { roles: ['admin'] }]) {
    await post('owner', '/tickets', { ...body, ...extra }).expect(400);
  }
  await post('owner', '/tickets', { ...body, title: '   ' }).expect(400);
  await post('owner', '/tickets', { ...body, description: 'x'.repeat(5001) }).expect(400);
  assert.equal(await db.ticket.count({ where: { id: body.requestId } }), 0);
});
test('abertura repetida grava um chamado e uma entrada; colisão não transfere autoria', async () => {
  const { id, body } = await open();
  await post('owner', '/tickets', body).expect(201);
  await post('other', '/tickets', body).expect(409);
  await post('owner', '/tickets', { ...body, title: 'Outra solicitação' }).expect(409);
  assert.equal(await db.ticketEntry.count({ where: { ticketId: id } }), 1);
  assert.equal((await db.ticket.findUniqueOrThrow({ where: { id } })).requesterId, actors.owner.id);
});
test('IDOR: outra conta e professor não leem nem alteram chamado; lista não vaza objetos', async () => {
  const { id } = await open();
  for (const who of ['other', 'teacher']) {
    const listing = await actors[who].agent.get('/api/tickets').set('X-Role', 'admin').expect(200);
    assert.ok(!listing.body.items.some(t => t.id === id));
    assert.equal(listing.body.total, 0);
    await actors[who].agent.get(`/api/tickets/${id}`).expect(404);
    await act(who, id, 'reply', 0, 'Tentativa indevida').expect(404);
    await act(who, id, 'claim', 0).expect(404);
  }
  await actors.owner.agent.get(`/api/tickets/${randomUUID()}`).expect(404);
  await actors.owner.agent.get('/api/tickets/not-a-uuid').expect(400);
  await actors.owner.agent.get('/api/tickets?requesterId=qualquer').expect(400);
  await actors.owner.agent.get('/api/tickets?page=-1').expect(400);
  await actors.owner.agent.get('/api/tickets?status=admin').expect(400);
});
test('fila minimiza dados; suporte não ganha acesso à agenda pelo atendimento', async () => {
  const { id } = await open();
  const result = await actors.staff.agent.get(`/api/tickets/${id}`).expect(200);
  assert.deepEqual(Object.keys(result.body.ticket.requester).sort(), ['id', 'name']);
  assert.equal(result.headers['cache-control'], 'no-store');
  assert.equal(result.headers['x-content-type-options'], 'nosniff');
  assert.equal(result.body.ticket.requester.passwordHash, undefined);
  await actors.staff.agent.get('/api/students/10000000-0000-4000-8000-000000000001/agenda').expect(404);
  assert.deepEqual((await actors.staff.agent.get('/api/students').expect(200)).body, []);
});
test('concorrência: apenas um atendente assume; o outro não responde ou encerra', async () => {
  const { id } = await open();
  await act('owner', id, 'claim', 0).expect(403);
  await act('staff', id, 'reply', 0, 'Ainda não assumiu').expect(403);
  const results = await Promise.all([act('staff', id, 'claim', 0), act('staff2', id, 'claim', 0)]);
  assert.equal(results.filter(r => r.status === 201).length, 1);
  assert.ok(results.every(r => [201, 404, 409].includes(r.status)));
  const ticket = await db.ticket.findUniqueOrThrow({ where: { id } });
  const loser = ticket.assigneeId === actors.staff.id ? 'staff2' : 'staff';
  await act(loser, id, 'reply', 1, 'Não autorizado').expect(404);
  await act(loser, id, 'resolve', 1, 'Não autorizado').expect(404);
  assert.equal(await db.ticketEntry.count({ where: { ticketId: id, action: 'claim' } }), 1);
});
test('resposta idempotente, controle de versão, encerramento justificado e reabertura', async () => {
  const { id } = await open();
  await act('staff', id, 'claim', 0).expect(201);
  const requestId = randomUUID();
  await act('staff', id, 'reply', 1, 'Orientação da equipe.', requestId).expect(201);
  await act('owner', id, 'reply', 2, 'Orientação da equipe.', requestId).expect(409);
  await act('staff', id, 'reply', 1, 'Orientação da equipe.', requestId).expect(201);
  await act('staff', id, 'reply', 2, 'Conteúdo adulterado.', requestId).expect(409);
  await act('owner', id, 'reply', 1, 'Versão obsoleta.').expect(409);
  await act('owner', id, 'resolve', 2, 'Fechar por conta própria.').expect(403);
  await act('staff', id, 'resolve', 2, '').expect(400);
  await act('staff', id, 'resolve', 2, 'Dúvida esclarecida.').expect(201);
  await act('owner', id, 'reply', 3, 'Sem reabrir.').expect(409);
  await act('owner', id, 'reopen', 3).expect(201);
  const fresh = new PrismaClient();
  try { const current = await fresh.ticket.findUniqueOrThrow({ where: { id } }); assert.equal(current.status, 'open'); assert.equal(current.assigneeId, null); assert.equal(current.version, 4); }
  finally { await fresh.$disconnect(); }
  assert.equal(await db.ticketEntry.count({ where: { ticketId: id } }), 5);
  await act('admin', id, 'claim', 4).expect(201);
});
test('papel removido e conta desativada bloqueiam sessão já existente', async () => {
  const { id } = await open();
  await db.accountRole.delete({ where: { accountId_role: { accountId: actors.staff2.id, role: 'support' } } });
  await actors.staff2.agent.get(`/api/tickets/${id}`).expect(404);
  await act('staff2', id, 'claim', 0).expect(404);
  await db.account.update({ where: { id: actors.other.id }, data: { active: false } });
  await actors.other.agent.get('/api/tickets').expect(401);
});
test('paginação do histórico não perde registros e entrada textual não vira SQL', async () => {
  const { id } = await open();
  const text = "<img src=x onerror=alert(1)> ' OR 1=1 --";
  await act('owner', id, 'reply', 0, text).expect(201);
  await db.ticketEntry.createMany({ data: Array.from({ length: 32 }, (_, n) => ({ ticketId: id, authorId: actors.owner.id, action: 'reply', message: `Histórico sintético ${n}` })) });
  const first = (await actors.owner.agent.get(`/api/tickets/${id}`).expect(200)).body;
  const second = (await actors.owner.agent.get(`/api/tickets/${id}?page=2`).expect(200)).body;
  assert.equal(first.entries.length, 30); assert.equal(second.entries.length, 4);
  assert.equal(new Set([...first.entries, ...second.entries].map(e => e.id)).size, 34);
  assert.ok([...first.entries, ...second.entries].some(e => e.message === text));
});
test('rate limit impede consultas ilimitadas ao detalhe', async () => {
  const { id } = await open();
  let blocked = false;
  for (let i = 0; i < 61; i++) {
    const response = await actors.owner.agent.get(`/api/tickets/${id}`);
    if (response.status === 429) { blocked = true; break; }
    assert.equal(response.status, 200);
  }
  assert.ok(blocked);
});
