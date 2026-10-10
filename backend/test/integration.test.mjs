import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../dist/app.js';
import { digest, hashPassword } from '../dist/password.js';
import { randomBytes } from 'node:crypto';

const db = new PrismaClient();
const origin = process.env.WEB_ORIGIN;
let app, server, ana, lucas, marina, suporte, csrfAna, csrfMarina, classA, classB, hidden, created;
const lucasId = '10000000-0000-4000-8000-000000000001';
const biaId = '10000000-0000-4000-8000-000000000002';
async function signIn(name) {
  const agent = request.agent(server);
  const res = await agent.post('/api/auth/login').set('Origin', origin).send({ email: `${name}@demo.cortex.test`, password: process.env.DEMO_PASSWORD }).expect(201);
  assert.ok(res.headers['set-cookie'][0].includes('HttpOnly'));
  assert.ok(res.headers['set-cookie'][0].includes('SameSite=Strict'));
  assert.equal(res.body.user.passwordHash, undefined);
  return [agent, res.body.csrfToken];
}
before(async () => {
  app = await createApp(); server = app.getHttpServer();
  [ana, csrfAna] = await signIn('ana');
  [lucas] = await signIn('lucas');
  [marina, csrfMarina] = await signIn('marina');
  [suporte] = await signIn('suporte');
  classA = await db.schoolClass.findFirstOrThrow({ where: { name: '2º ano A' } });
  classB = await db.schoolClass.findFirstOrThrow({ where: { name: '2º ano B' } });
  const account = await db.account.findUniqueOrThrow({ where: { email: 'ana@demo.cortex.test' } });
  hidden = await db.student.create({ data: { name: 'Teste vínculo não verificado', guardians: { create: { accountId: account.id, verified: false } } } });
});
after(async () => {
  if (created) await db.agendaEvent.deleteMany({ where: { id: created } });
  if (hidden) await db.student.deleteMany({ where: { id: hidden.id } });
  await app?.close(); await db.$disconnect();
});
test('visitante não lê agenda e cookie adulterado não autentica', async () => {
  await request(server).get(`/api/students/${lucasId}/agenda`).expect(401);
  await request(server).get('/api/auth/me').set('Cookie', `cortex_session=${'a'.repeat(64)}`).expect(401);
});
test('login inválido e campo de privilégio enviado pelo cliente são recusados', async () => {
  await request(server).post('/api/auth/login').set('Origin', origin).send({ email: 'ana@demo.cortex.test', password: 'incorreta' }).expect(401);
  await request(server).post('/api/auth/login').set('Origin', origin).send({ email: 'ana@demo.cortex.test', password: process.env.DEMO_PASSWORD, role: 'admin' }).expect(400);
});
test('responsável lista apenas vínculos verificados; aluno não acessa colega', async () => {
  const res = await ana.get('/api/students').expect(200);
  assert.deepEqual(res.body.map(s => s.name).sort(), ['Bia', 'Lucas']);
  await ana.get(`/api/students/${hidden.id}/agenda`).expect(404);
  await lucas.get(`/api/students/${biaId}/agenda`).expect(404);
  const own = await lucas.get('/api/students').expect(200);
  assert.deepEqual(own.body.map(s => s.id), [lucasId]);
});
test('suporte não recebe dados acadêmicos; professora não acessa outra turma', async () => {
  assert.deepEqual((await suporte.get('/api/students').expect(200)).body, []);
  await suporte.get(`/api/students/${lucasId}/agenda`).expect(404);
  await marina.get(`/api/classes/${classB.id}/agenda`).expect(404);
});
test('CSRF, origem externa, perfil e datas inválidas bloqueiam escrita', async () => {
  const event = { title: 'Teste controlado', description: '', location: 'Sala', startsAt: '2026-10-15T15:00:00Z', endsAt: '2026-10-15T16:00:00Z' };
  await marina.post(`/api/classes/${classA.id}/agenda`).set('Origin', origin).send(event).expect(403);
  await marina.post(`/api/classes/${classA.id}/agenda`).set('Origin', 'https://invalid.example').set('X-CSRF-Token', csrfMarina).send(event).expect(403);
  await ana.post(`/api/classes/${classA.id}/agenda`).set('Origin', origin).set('X-CSRF-Token', csrfAna).send(event).expect(403);
  await marina.post(`/api/classes/${classB.id}/agenda`).set('Origin', origin).set('X-CSRF-Token', csrfMarina).send(event).expect(404);
  await marina.post(`/api/classes/${classA.id}/agenda`).set('Origin', origin).set('X-CSRF-Token', csrfMarina).send({ ...event, endsAt: event.startsAt }).expect(400);
  await marina.post(`/api/classes/${classA.id}/agenda`).set('Origin', origin).set('X-CSRF-Token', csrfMarina).send({ ...event, title: '   ' }).expect(400);
});
test('sessão expirada e conta desativada não dão acesso', async () => {
  const token = randomBytes(32).toString('hex');
  const account = await db.account.create({ data: { name: 'Teste expiração', email: `teste-${token.slice(0,12)}@demo.cortex.test`, passwordHash: await hashPassword(token), active: false, sessions: { create: { tokenHash: digest(token), csrfHash: digest('teste'), expiresAt: new Date(Date.now() + 60000) } } } });
  try {
    await request(server).get('/api/auth/me').set('Cookie', `cortex_session=${token}`).expect(401);
    await db.account.update({ where: { id: account.id }, data: { active: true } });
    await db.session.updateMany({ where: { accountId: account.id }, data: { expiresAt: new Date(Date.now() - 60000) } });
    await request(server).get('/api/auth/me').set('Cookie', `cortex_session=${token}`).expect(401);
  } finally { await db.account.delete({ where: { id: account.id } }); }
});
test('professora grava; família lê do PostgreSQL; turma de Bia não recebe', async () => {
  const res = await marina.post(`/api/classes/${classA.id}/agenda`).set('Origin', origin).set('X-CSRF-Token', csrfMarina).send({ title: 'Integração verificada', description: 'Registro sintético removido após o teste.', location: 'Laboratório', startsAt: '2026-10-15T15:00:00Z', endsAt: '2026-10-15T16:00:00Z' }).expect(201);
  created = res.body.id;
  assert.ok(await db.agendaEvent.findUnique({ where: { id: created } }));
  const list = await ana.get(`/api/students/${lucasId}/agenda`).expect(200);
  assert.ok(list.body.some(e => e.id === created));
  assert.ok(!(await ana.get(`/api/students/${biaId}/agenda`).expect(200)).body.some(e => e.id === created));
  const freshClient = new PrismaClient();
  try { assert.equal((await freshClient.agendaEvent.findUniqueOrThrow({ where: { id: created } })).title, 'Integração verificada'); }
  finally { await freshClient.$disconnect(); }
});
test('sessão retoma em recargas sem invalidar outra aba e logout revoga cookie', async () => {
  const first = await ana.get('/api/auth/me').expect(200);
  const second = await ana.get('/api/auth/me').expect(200);
  assert.equal(first.body.csrfToken, second.body.csrfToken);
  await ana.post('/api/auth/logout').set('Origin', origin).set('X-CSRF-Token', csrfAna).send({}).expect(201);
  await ana.get('/api/auth/me').expect(401);
});
