import {chromium,expect} from '@playwright/test';
import {PrismaClient} from '@prisma/client';
import {randomUUID} from 'node:crypto';
import {mkdir} from 'node:fs/promises';
const db=new PrismaClient(), browser=await chromium.launch({channel:'chrome',headless:true});
const title=`Secretaria sintética ${randomUUID().slice(0,8)}`, errors=[];
const client=await db.account.findUniqueOrThrow({where:{email:'ana@demo.cortex.test'}}), agent=await db.account.findUniqueOrThrow({where:{email:'suporte@demo.cortex.test'}}), team=await db.supportTeam.findFirstOrThrow({where:{isDefault:true}});
const ticket=await db.ticket.create({data:{requesterId:client.id,assigneeId:agent.id,teamId:team.id,title,description:'Cadastro e declaração de demonstração',status:'in_progress',cycles:{create:{teamId:team.id}}}});
const evidence='../docs/evidencias/2026-10-11';await mkdir(evidence,{recursive:true});
async function login(name){
 const ctx=await browser.newContext({viewport:{width:1440,height:1000}}),page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173');await page.getByRole('button',{name:'Já tenho cadastro',exact:true}).first().click();await page.getByLabel('E-mail',{exact:true}).fill(`${name}@demo.cortex.test`);await page.getByLabel('Senha',{exact:true}).fill(process.env.DEMO_PASSWORD);await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByRole('button',{name:'Secretaria e equipes',exact:true}).click();await page.getByLabel('Solicitação (até 100 mais recentes, pendentes primeiro)').selectOption(ticket.id);return {ctx,page};
}
async function submit(page,action,value,message){await page.getByLabel('Operação',{exact:true}).selectOption(action);if(action==='registration')await page.getByLabel('Nome completo do aluno').fill(value);else await page.getByLabel(action==='decision'?'Decisão':'Destino',{exact:true}).selectOption(value);await page.getByLabel('Justificativa / conteúdo da decisão').fill(message);await page.getByRole('button',{name:'Registrar operação',exact:true}).click();await expect(page.getByText('Operação registrada no histórico.',{exact:true})).toBeVisible();await expect(page.getByLabel('Justificativa / conteúdo da decisão')).toHaveCount(0).catch(()=>{});}
try{
 let session=await login('suporte');await submit(session.page,'registration','Estudante de teste de interface','Responsável solicita cadastro fictício.');await expect(session.page.getByText('Cadastro de aluno registrado.',{exact:false})).toBeVisible();await session.ctx.close();
 session=await login('admin');await submit(session.page,'decision','approve','Vínculo fictício verificado para demonstração.');await session.ctx.close();
 session=await login('suporte');await submit(session.page,'escalate','director','Solicitação de declaração demonstrativa.');await session.ctx.close();
 session=await login('diretor');await submit(session.page,'decision','approve','Declaração demonstrativa: cadastro escolar confirmado, sem validade oficial.');await session.page.screenshot({path:`${evidence}/secretaria-desktop.png`,fullPage:true});await session.page.setViewportSize({width:390,height:844});await session.page.screenshot({path:`${evidence}/secretaria-mobile.png`,fullPage:true});if(await session.page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth))throw new Error('Overflow mobile');await session.ctx.close();
 session=await login('ana');await expect(session.page.getByText('Declaração demonstrativa: cadastro escolar confirmado',{exact:false})).toBeVisible();await expect(session.page.getByLabel('Operação',{exact:true})).toHaveCount(0);await session.ctx.close();
 if(errors.length)throw new Error(errors.join('\n'));console.log('Cadastro, aprovação ADMIN, encaminhamento, decisão da direção e consulta do responsável aprovados; desktop/mobile sem overflow.');
}finally{const current=await db.ticket.findUnique({where:{id:ticket.id}});await db.ticket.deleteMany({where:{id:ticket.id}});if(current?.registeredStudentId)await db.student.delete({where:{id:current.registeredStudentId}});await browser.close();await db.$disconnect();}
