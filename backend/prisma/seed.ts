import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/password';
const db = new PrismaClient();
async function seed() {
  if (process.env.NODE_ENV === 'production') throw new Error('Seed fictício proibido em produção.');
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 12) throw new Error('Defina DEMO_PASSWORD com pelo menos 12 caracteres.');
  const roles = ['guardian', 'student', 'teacher', 'admin', 'support'] as const;
  const names = ['Ana', 'Lucas', 'Marina', 'Administração', 'Suporte'];
  const emails = ['ana', 'lucas', 'marina', 'admin', 'suporte'];
  const accounts = [];
  for (let i = 0; i < roles.length; i++) {
    const account = await db.account.upsert({ where: { email: `${emails[i]}@demo.cortex.test` }, update: {}, create: { email: `${emails[i]}@demo.cortex.test`, name: names[i], passwordHash: await hashPassword(password), roles: { create: { role: roles[i] } } } });
    accounts.push(account);
  }
  const classA = await db.schoolClass.upsert({ where: { name_period: { name: '2º ano A', period: '2026' } }, update: {}, create: { name: '2º ano A', period: '2026' } });
  const classB = await db.schoolClass.upsert({ where: { name_period: { name: '2º ano B', period: '2026' } }, update: {}, create: { name: '2º ano B', period: '2026' } });
  const lucas = await db.student.upsert({ where: { id: '10000000-0000-4000-8000-000000000001' }, update: {}, create: { id: '10000000-0000-4000-8000-000000000001', name: 'Lucas', accountId: accounts[1].id } });
  const bia = await db.student.upsert({ where: { id: '10000000-0000-4000-8000-000000000002' }, update: {}, create: { id: '10000000-0000-4000-8000-000000000002', name: 'Bia' } });
  for (const [student, turma] of [[lucas, classA], [bia, classB]] as const) {
    await db.guardianLink.upsert({ where: { accountId_studentId: { accountId: accounts[0].id, studentId: student.id } }, update: {}, create: { accountId: accounts[0].id, studentId: student.id, verified: true } });
    await db.enrollment.upsert({ where: { studentId_classId: { studentId: student.id, classId: turma.id } }, update: {}, create: { studentId: student.id, classId: turma.id } });
    if (!await db.agendaEvent.count({ where: { classId: turma.id } })) await db.agendaEvent.create({ data: { classId: turma.id, title: turma.id === classA.id ? 'Oficina de perguntas e fontes' : 'Planejamento de estudos', description: 'Atividade fictícia para validar a integração do Cortéx.', location: 'Sala de aprendizagem', startsAt: new Date('2026-10-13T17:00:00Z'), endsAt: new Date('2026-10-13T18:00:00Z') } });
  }
  await db.teaching.upsert({ where: { accountId_classId: { accountId: accounts[2].id, classId: classA.id } }, update: {}, create: { accountId: accounts[2].id, classId: classA.id } });
  console.log('Cinco contas fictícias, dois estudantes e duas turmas preparados.');
}
seed().finally(() => db.$disconnect());
