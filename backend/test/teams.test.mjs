import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../dist/app.js';
import { hashPassword } from '../dist/password.js';
import { businessMinutes } from '../dist/operations.js';
import { dueInTwoDays } from '../dist/teams.js';
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
  for (const [name, role] of [['client', 'guardian'], ['other', 'student'], ['agent1', 'support'], ['agent2', 'support'], ['boss', 'supervisor'], ['coordinator', 'coordinator'], ['director','director'], ['admin','admin']]) {
    const account = await db.account.create({ data: { email: `${name}@demo.cortex.test`, name, passwordHash, roles: { create: { role } } } });
    const agent = request.agent(server);
    const res = await agent.post('/api/auth/login').set('Origin', process.env.WEB_ORIGIN).send({ email: account.email, password }).expect(201);
    actors[name] = { agent, id: account.id, csrf: res.body.csrfToken };
  }
  const team = await db.supportTeam.create({ data: { name: 'Equipe de teste', isDefault: true } });
  for (const [name, role] of [['agent1','support'],['agent2','support'],['boss','supervisor'],['coordinator','coordinator'],['director','director']]) await db.teamMember.create({ data: { teamId: team.id, accountId: actors[name].id, role } });
});
after(async () => {
  await app?.close(); await db?.$disconnect(); process.env.DATABASE_URL = original;
  const control = new PrismaClient();
  // Identificador interno e validado, sem entrada do usuário.
  if (!/^cortex_ops_test_[a-f0-9]{32}$/.test(schema)) throw new Error('Schema inválido');
  await control.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await control.$disconnect();
});

let ticketId, teamA, teamB;
async function command(who, action, value, extra={}) {
  const current=await db.ticket.findUniqueOrThrow({where:{id:ticketId}});
  return post(who,`/service/${ticketId}`,{requestId:randomUUID(),version:current.version,action,value,message:'Justificativa sintética de teste',...extra});
}
test('duas equipes isolam fila, detalhes e métricas',async()=>{
  teamA=await db.supportTeam.findFirst({where:{isDefault:true}});
  teamB=await db.supportTeam.create({data:{name:'Equipe B'}});
  await db.teamMember.deleteMany({where:{accountId:actors.agent2.id}});
  await db.teamMember.create({data:{accountId:actors.agent2.id,teamId:teamB.id,role:'support'}});
  await post('agent1','/operations/availability',{available:true}).expect(201);
  const opened=await post('client','/tickets',{requestId:randomUUID(),title:'Cadastro escolar',description:'Pedido fictício de vínculo.'}).expect(201);
  ticketId=opened.body.id;
  assert.equal(opened.body.assignee.id,actors.agent1.id);
  await post('boss',"/tickets/"+ticketId+"/actions",{requestId:randomUUID(),version:opened.body.version,action:'reply',message:'Resposta indevida'}).expect(403);
  await actors.agent1.agent.post('/api/service/'+ticketId).set('Origin',process.env.WEB_ORIGIN).send({requestId:randomUUID(),version:opened.body.version,action:'escalate',value:'admin',message:'Sem CSRF'}).expect(403);
  await actors.agent2.agent.get(`/api/tickets/${ticketId}`).expect(404);
  assert.equal((await actors.agent2.agent.get('/api/service').expect(200)).body.items.length,0);
  assert.equal((await actors.boss.agent.get('/api/teams').expect(200)).body.length,1);
  assert.equal((await actors.director.agent.get('/api/teams').expect(200)).body.length,1);
});
test('cadastro pelo atendente não libera vínculo; só ADMIN verifica',async()=>{
  let res=await command('agent1','registration','Aluno Sintético');assert.equal(res.status,201);
  const ticket=await db.ticket.findUniqueOrThrow({where:{id:ticketId}});
  let link=await db.guardianLink.findUniqueOrThrow({where:{accountId_studentId:{accountId:actors.client.id,studentId:ticket.registeredStudentId}}});
  assert.equal(link.verified,false);
  assert.equal((await actors.client.agent.get('/api/students').expect(200)).body.length,0);
  res=await command('coordinator','decision','approve');assert.equal(res.status,403);
  res=await command('admin','decision','approve');assert.equal(res.status,201);
  link=await db.guardianLink.findUniqueOrThrow({where:{accountId_studentId:{accountId:actors.client.id,studentId:ticket.registeredStudentId}}});assert.equal(link.verified,true);
});
test('encaminhamento tem prazo útil, impede encerramento e exige setor correto',async()=>{
  const start=new Date('2026-10-09T19:00:00Z');assert.equal(dueInTwoDays(start).toISOString(),'2026-10-13T19:00:00.000Z');
  let res=await command('agent1','escalate','director');assert.equal(res.status,201);
  const t=await db.ticket.findUniqueOrThrow({where:{id:ticketId}});assert.equal(businessMinutes(new Date(t.escalationDueAt.getTime()-7*86400000),t.escalationDueAt)>0,true);
  await post('agent1',`/tickets/${ticketId}/actions`,{requestId:randomUUID(),version:t.version,action:'resolve',message:'Concluído sinteticamente'}).expect(409);
  res=await command('coordinator','decision','approve');assert.equal(res.status,403);
  res=await command('boss','decision','approve');assert.equal(res.status,403);
  res=await command('director','decision','approve');assert.equal(res.status,201);
});
test('transferência ADMIN é idempotente, preserva ciclo e muda escopo',async()=>{
  let res=await command('coordinator','transfer',teamB.id);assert.equal(res.status,403);
  const cycle=await db.ticketCycle.findFirst({where:{ticketId}}), current=await db.ticket.findUniqueOrThrow({where:{id:ticketId}});
  const payload={requestId:randomUUID(),version:current.version,action:'transfer',value:teamB.id,message:'Transferência sintética'};
  await post('admin',`/service/${ticketId}`,payload).expect(201);
  await post('admin',`/service/${ticketId}`,payload).expect(201);
  assert.equal(await db.ticketEntry.count({where:{id:payload.requestId}}),1);
  const updated=await db.ticketCycle.findUniqueOrThrow({where:{id:cycle.id}});assert.equal(updated.startedAt.getTime(),cycle.startedAt.getTime());assert.equal(updated.teamId,teamB.id);
  await actors.boss.agent.get(`/api/tickets/${ticketId}`).expect(404);
  await actors.agent1.agent.get(`/api/tickets/${ticketId}`).expect(404);
  await actors.agent2.agent.get(`/api/tickets/${ticketId}`).expect(200);
});
test('equipes negam mutações sem ADMIN e papel inventado',async()=>{
  await post('boss','/teams',{name:'Equipe indevida'}).expect(403);
  await post('coordinator',`/teams/${teamB.id}/members`,{accountId:actors.agent2.id,role:'support',enabled:false}).expect(403);
  await post('admin',`/teams/${teamB.id}/members`,{accountId:actors.client.id,role:'support',enabled:true}).expect(409);
  await post('admin','/teams',{name:'Equipe administrativa'}).expect(201);
});
test('supervisor não opera chamados; métricas não vazam outra equipe',async()=>{
  await post('agent2',`/tickets/${ticketId}/actions`,{requestId:randomUUID(),version:(await db.ticket.findUniqueOrThrow({where:{id:ticketId}})).version,action:'claim',message:''}).expect(201);
  const current=await db.ticket.findUniqueOrThrow({where:{id:ticketId}});
  await post('agent2',`/tickets/${ticketId}/actions`,{requestId:randomUUID(),version:current.version,action:'resolve',message:'Resolução de teste'}).expect(201);
  const boss=(await actors.boss.agent.get('/api/operations/metrics').expect(200)).body;
  assert.equal(boss.summary.closed,0);
  assert.equal((await actors.admin.agent.get('/api/operations/metrics').expect(200)).body.summary.closed,1);
});
