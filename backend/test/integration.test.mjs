import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../dist/app.js';
import { digest, hashPassword } from '../dist/password.js';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { firstValueFrom, take } from 'rxjs';
import { OfficeTelemetryService } from '../dist/office-telemetry.js';

const db = new PrismaClient();
const origin = process.env.WEB_ORIGIN;
let app, server, ana, lucas, marina, suporte, csrfAna, csrfMarina, classA, classB, hidden, created, createdOfficeSeedRun, createdOfficeChatSubject;
const lucasId = '10000000-0000-4000-8000-000000000001';
const biaId = '10000000-0000-4000-8000-000000000002';
const publicationId = randomUUID();
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
  await db.communication.deleteMany({ where: { id: publicationId } });
  if (created) await db.agendaEvent.deleteMany({ where: { id: created } });
  if (createdOfficeSeedRun) await db.agentSeedRun.deleteMany({ where: { id: createdOfficeSeedRun } });
  if (createdOfficeChatSubject) await db.subject.deleteMany({ where: { id: createdOfficeChatSubject } });
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
test('comunicados recusam visitantes, suporte, turma alheia, CSRF e campos extras', async () => {
  const payload = { publicationId, title: 'Aviso de integração', message: 'Mensagem fictícia para verificar vínculos e persistência.' };
  await request(server).get(`/api/students/${lucasId}/communications`).expect(401);
  await suporte.get(`/api/students/${lucasId}/communications`).expect(404);
  await marina.get(`/api/classes/${classB.id}/communications`).expect(404);
  await ana.get(`/api/students/${hidden.id}/communications`).expect(404);
  await marina.post(`/api/classes/${classA.id}/communications`).set('Origin', origin).send(payload).expect(403);
  await ana.post(`/api/classes/${classA.id}/communications`).set('Origin', origin).set('X-CSRF-Token', csrfAna).send(payload).expect(403);
  await marina.post(`/api/classes/${classB.id}/communications`).set('Origin', origin).set('X-CSRF-Token', csrfMarina).send(payload).expect(404);
  for (const invalid of [{ ...payload, authorId: randomUUID() }, { ...payload, title: '   ' }, { ...payload, message: 'x'.repeat(5001) }]) {
    await marina.post(`/api/classes/${classA.id}/communications`).set('Origin', origin).set('X-CSRF-Token', csrfMarina).send(invalid).expect(400);
  }
  assert.equal(await db.communication.count({ where: { id: publicationId } }), 0);
});
test('publicação é persistida e repetição concorrente não duplica; alteração do mesmo ID é recusada', async () => {
  const payload = { publicationId, title: 'Aviso de integração', message: 'Mensagem fictícia para verificar vínculos e persistência.' };
  const publish = body => marina.post(`/api/classes/${classA.id}/communications`).set('Origin', origin).set('X-CSRF-Token', csrfMarina).send(body);
  const results = await Promise.all([publish(payload).expect(201), publish(payload).expect(201)]);
  assert.deepEqual(results[0].body, results[1].body);
  assert.equal(results[0].body.author.name, 'Marina');
  assert.equal(results[0].body.author.email, undefined);
  assert.equal(results[0].body.authorId, undefined);
  assert.equal(await db.communication.count({ where: { id: publicationId } }), 1);
  await publish({ ...payload, message: 'Conteúdo diferente com o mesmo identificador.' }).expect(409);
  const fresh = new PrismaClient();
  try { assert.equal((await fresh.communication.findUniqueOrThrow({ where: { id: publicationId } })).message, payload.message); }
  finally { await fresh.$disconnect(); }
});
test('lista e detalhe de comunicado respeitam matrícula, estudante e vínculo de turma', async () => {
  assert.ok((await ana.get(`/api/students/${lucasId}/communications`).expect(200)).body.some(c => c.id === publicationId));
  assert.ok(!(await ana.get(`/api/students/${biaId}/communications`).expect(200)).body.some(c => c.id === publicationId));
  await ana.get(`/api/students/${lucasId}/communications/${publicationId}`).expect(200);
  await lucas.get(`/api/students/${lucasId}/communications/${publicationId}`).expect(200);
  await lucas.get(`/api/students/${biaId}/communications/${publicationId}`).expect(404);
  await ana.get(`/api/students/${biaId}/communications/${publicationId}`).expect(404);
  await marina.get(`/api/classes/${classB.id}/communications/${publicationId}`).expect(404);
  await suporte.get(`/api/classes/${classA.id}/communications/${publicationId}`).expect(404);
  const synthetic = await db.student.create({ data: { name: 'Teste matrícula inativa', enrollments: { create: { classId: classA.id, active: false } }, guardians: { create: { accountId: hidden.guardians?.[0]?.accountId || (await db.account.findUniqueOrThrow({ where: { email: 'ana@demo.cortex.test' } })).id, verified: true } } } });
  try {
    assert.deepEqual((await ana.get(`/api/students/${synthetic.id}/communications`).expect(200)).body, []);
    await ana.get(`/api/students/${synthetic.id}/communications/${publicationId}`).expect(404);
  } finally { await db.student.delete({ where: { id: synthetic.id } }); }
});
test('sessão retoma em recargas sem invalidar outra aba e logout revoga cookie', async () => {
  const first = await ana.get('/api/auth/me').expect(200);
  const second = await ana.get('/api/auth/me').expect(200);
  assert.equal(first.body.csrfToken, second.body.csrfToken);
  await ana.post('/api/auth/logout').set('Origin', origin).set('X-CSRF-Token', csrfAna).send({}).expect(201);
  await ana.get('/api/auth/me').expect(401);
});
test('contexto interno do aluno exige token e retorna somente dados pedagogicos minimizados', async () => {
  const teacher = (await marina.get('/api/auth/me').expect(200)).body.user;
  const subject = await db.subject.create({
    data: { classId: classA.id, name: `Ala1 integration ${randomUUID()}` },
  });
  try {
    const path = `/api/internal/ai/classes/${classA.id}/students/${lucasId}/context`;
    const query = { userId: teacher.id, subjectId: subject.id };
    await request(server).get(path).query(query).expect(403);

    const token = process.env.CORTEX_INTERNAL_TOKEN;
    assert.ok(token);
    const response = await request(server)
      .get(path)
      .query(query)
      .set('X-Cortex-Internal-Token', token)
      .expect(200);

    assert.deepEqual(Object.keys(response.body.studentProfile).sort(), ['className', 'period', 'subjectName']);
    assert.equal(response.body.studentProfile.className, classA.name);
    assert.equal(response.body.studentProfile.subjectName, subject.name);
    assert.equal(response.body.studentProfile.name, undefined);
    assert.equal(response.body.studentId, undefined);
  } finally {
    await db.subject.delete({ where: { id: subject.id } });
  }
});
test('execucao de seed exige docente, persiste o relatorio e lista o estado autorizado', async () => {
  await marina.post('/api/ai/office/run-seed')
    .set('Origin', origin)
    .set('X-CSRF-Token', csrfMarina)
    .send({ classId: classA.id, seedId: '#nao-existe' })
    .expect(400);

  await suporte.get(`/api/ai/office/state?classId=${classA.id}`).expect(403);

  const response = await marina.post('/api/ai/office/run-seed')
    .set('Origin', origin)
    .set('X-CSRF-Token', csrfMarina)
    .send({ classId: classA.id, seedId: '#teste3' })
    .expect(201);
  createdOfficeSeedRun = response.body.id;
  assert.equal(response.body.seedId, '#teste3');
  assert.equal(response.body.status, 'passed');

  const persisted = await db.agentSeedRun.findUniqueOrThrow({
    where: { id: createdOfficeSeedRun },
  });
  assert.equal(persisted.classId, classA.id);
  assert.equal(persisted.requestedById, (await marina.get('/api/auth/me').expect(200)).body.user.id);
  assert.equal(persisted.report.summary.passed, 1);

  const state = await marina.get(`/api/ai/office/state?classId=${classA.id}`).expect(200);
  assert.ok(state.body.runs.some(run => run.id === createdOfficeSeedRun));
});
test('office SSE streams only events for its class', async () => {
  const telemetry = new OfficeTelemetryService();
  const eventPromise = firstValueFrom(telemetry.stream(classA.id).pipe(take(1)));
  telemetry.publish(classB.id, {
    type: 'room.transition',
    runId: randomUUID(),
    seedId: '#teste1',
    room: 'security',
    status: 'PASSED',
    details: 'Outro contexto.',
    timestamp: new Date().toISOString(),
  });
  telemetry.publish(classA.id, {
    type: 'room.transition',
    runId: randomUUID(),
    seedId: '#teste2',
    room: 'customer',
    status: 'LOADED',
    details: 'Contexto autorizado.',
    timestamp: new Date().toISOString(),
  });
  const event = await eventPromise;
  assert.equal(event.type, 'room.transition');
  assert.equal(event.data.room, 'customer');
});
test('office chat authorizes a subject and publishes ADK trace events to SSE', async () => {
  const subject = await db.subject.create({
    data: { classId: classA.id, name: `Office chat ${randomUUID()}` },
  });
  createdOfficeChatSubject = subject.id;

  const trace = ['reception', 'security', 'customer', 'professor', 'supervisor'].map((room, index) => ({
    room,
    status: index === 4 ? 'APPROVED' : 'RUNNING',
    details: `stage_${index}`,
    timestamp: new Date(Date.now() + index).toISOString(),
  }));
  let createdSession;
  let deletedSession = false;
  const fakeAdk = createServer(async (req, res) => {
    if (req.method === 'POST' && req.url?.endsWith('/sessions')) {
      let body = '';
      for await (const chunk of req) body += chunk;
      createdSession = JSON.parse(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{}');
      return;
    }
    if (req.method === 'POST' && req.url === '/run_sse') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8' });
      const send = event => res.write(`data: ${JSON.stringify(event)}\n\n`);
      send({ actions: { state_delta: { office_trace: trace.slice(0, 2) } } });
      send({ actions: { stateDelta: { office_trace: trace } } });
      send({ turnComplete: true, content: { parts: [{ text: 'Resposta simulada do ADK.' }] } });
      res.end();
      return;
    }
    if (req.method === 'DELETE' && req.url?.includes('/sessions/')) {
      deletedSession = true;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{}');
      return;
    }
    res.writeHead(404);
    res.end();
  });

  const previousAdkUrl = process.env.CORTEX_ADK_URL;
  const previousToken = process.env.CORTEX_INTERNAL_TOKEN;
  await new Promise((resolve, reject) => {
    fakeAdk.once('error', reject);
    fakeAdk.listen(0, '127.0.0.1', resolve);
  });
  const address = fakeAdk.address();
  assert.ok(address && typeof address !== 'string');
  process.env.CORTEX_ADK_URL = `http://127.0.0.1:${address.port}`;
  process.env.CORTEX_INTERNAL_TOKEN = 'office-chat-integration-token';

  const received = [];
  const subscription = app.get(OfficeTelemetryService).stream(classA.id).subscribe(event => received.push(event));
  try {
    await suporte.post('/api/ai/office/chat')
      .set('Origin', origin)
      .set('X-CSRF-Token', csrfMarina)
      .send({ classId: classA.id, subjectId: subject.id, message: 'Explique a ideia principal.' })
      .expect(403);
    await marina.post('/api/ai/office/chat')
      .set('Origin', origin)
      .set('X-CSRF-Token', csrfMarina)
      .send({ classId: classA.id, subjectId: randomUUID(), message: 'Explique a ideia principal.' })
      .expect(403);
    await marina.post('/api/ai/office/chat')
      .set('Origin', origin)
      .set('X-CSRF-Token', csrfMarina)
      .send({ classId: classA.id, subjectId: subject.id, studentId: lucasId, message: 'Explique a ideia principal.' })
      .expect(400);
    await marina.post('/api/ai/office/chat')
      .set('Origin', origin)
      .set('X-CSRF-Token', csrfMarina)
      .send({ classId: classA.id, subjectId: subject.id, message: 'x'.repeat(4001) })
      .expect(400);

    const response = await marina.post('/api/ai/office/chat')
      .set('Origin', origin)
      .set('X-CSRF-Token', csrfMarina)
      .send({ classId: classA.id, subjectId: subject.id, message: 'Explique a ideia principal.' })
      .expect(201);
    assert.equal(response.body.answer, 'Resposta simulada do ADK.');
    assert.ok(deletedSession);
    assert.equal(createdSession.state.cortex_user_id, (await marina.get('/api/auth/me').expect(200)).body.user.id);
    assert.equal(createdSession.state.cortex_class_id, classA.id);
    assert.equal(createdSession.state.cortex_subject_id, subject.id);

    const transitions = received.filter(event => event.type === 'room.transition').map(event => event.data);
    assert.deepEqual(transitions.map(event => event.room), trace.map(event => event.room));
    assert.ok(received.some(event => event.type === 'chat.started'));
    assert.ok(received.some(event => event.type === 'chat.completed'));
    assert.ok(transitions.every(event => event.seedId === undefined));
  } finally {
    subscription.unsubscribe();
    if (previousAdkUrl === undefined) delete process.env.CORTEX_ADK_URL;
    else process.env.CORTEX_ADK_URL = previousAdkUrl;
    if (previousToken === undefined) delete process.env.CORTEX_INTERNAL_TOKEN;
    else process.env.CORTEX_INTERNAL_TOKEN = previousToken;
    await new Promise((resolve, reject) => fakeAdk.close(error => error ? reject(error) : resolve()));
    await db.subject.delete({ where: { id: subject.id } });
    createdOfficeChatSubject = undefined;
  }
});
