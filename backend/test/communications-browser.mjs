import { chromium, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';

const db = new PrismaClient();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const errors = [];
const title = `Oficina de investigação — ${randomUUID().slice(0, 8)}`;
const message = 'Olá, famílias!\nNa próxima oficina, vamos comparar respostas de IA com fontes confiáveis.\nTragam perguntas e curiosidade para a nossa roda de conversa.';
const evidence = '../docs/evidencias/2026-10-10';
await mkdir(evidence, { recursive: true });
page.on('pageerror', err => errors.push(err.message));
async function login(name) {
  await page.getByLabel('E-mail', { exact: true }).fill(`${name}@demo.cortex.test`);
  await page.getByLabel('Senha', { exact: true }).fill(process.env.DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sair da conta' })).toBeVisible();
  await page.getByRole('button', { name: 'Comunicados', exact: true }).click();
}
try {
  await page.goto('http://127.0.0.1:5173');
  await page.getByRole('button', { name: 'Já tenho cadastro', exact: true }).first().click();
  await login('marina');
  await page.getByRole('button', { name: 'Novo comunicado', exact: true }).click();
  await page.getByLabel('Título do comunicado').fill(title);
  await page.getByLabel('Mensagem', { exact: true }).fill(message);
  await expect(page.getByLabel('Turma', { exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Revisar publicação' }).click();
  await expect(page.getByRole('heading', { name: 'Revisar comunicado' })).toBeFocused();
  if (await db.communication.count({ where: { title } })) throw new Error('Rascunho foi publicado antes da confirmação');
  await page.getByRole('button', { name: 'Voltar e editar' }).click();
  await expect(page.getByLabel('Mensagem', { exact: true })).toHaveValue(message);
  await page.getByRole('button', { name: 'Revisar publicação' }).click();
  await page.screenshot({ path: `${evidence}/comunicado-revisao-desktop.png`, fullPage: true });
  // Simular confirmação perdida DEPOIS de o servidor gravar o comunicado.
  await page.route('**/api/classes/*/communications', async route => {
    if (route.request().method() === 'POST') { await route.fetch(); await route.abort('failed'); }
    else await route.continue();
  });
  await page.getByRole('button', { name: 'Confirmar publicação' }).click();
  await expect(page.getByText('Não recebemos a confirmação da publicação.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Voltar e editar' })).toBeDisabled();
  if (await db.communication.count({ where: { title } }) !== 1) throw new Error('Publicação não persistida após resposta perdida');
  await page.unroute('**/api/classes/*/communications');
  await page.getByRole('button', { name: 'Confirmar publicação' }).click();
  await expect(page.getByText('Comunicado publicado.', { exact: false })).toBeVisible();
  if (await db.communication.count({ where: { title } }) !== 1) throw new Error('Reenvio duplicou publicação');
  await page.getByRole('button', { name: 'Sair da conta' }).click();
  await login('ana');
  await page.getByLabel('Estudante', { exact: true }).selectOption({ label: 'Lucas' });
  await page.getByRole('button', { name: `Ler comunicado: ${title}`, exact: true }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(page.locator('.communication-body p')).toHaveText(message);
  await page.screenshot({ path: `${evidence}/comunicado-leitura-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${evidence}/comunicado-leitura-mobile.png`, fullPage: true });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Overflow em 390px');
  await page.getByRole('button', { name: 'Voltar aos comunicados' }).click();
  await expect(page.getByLabel('Estudante', { exact: true })).toHaveValue('10000000-0000-4000-8000-000000000001');
  await page.getByLabel('Estudante', { exact: true }).selectOption({ label: 'Bia' });
  await expect(page.getByText('Carregando comunicados…')).toHaveCount(0);
  await expect(page.getByRole('button', { name: `Ler comunicado: ${title}`, exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Olá, Ana.' })).toBeVisible();
  await page.getByRole('button', { name: 'Comunicados', exact: true }).click();
  await page.getByLabel('Estudante', { exact: true }).selectOption({ label: 'Lucas' });
  await expect(page.getByRole('button', { name: `Ler comunicado: ${title}`, exact: true })).toBeVisible();
  if (errors.length) throw new Error(`Erros de página: ${errors.length}`);
  console.log('Comunicados: revisão sem gravação, edição, resposta perdida, reenvio único, leitura autorizada, troca de estudante, recarga e mobile aprovados.');
} finally {
  await db.communication.deleteMany({ where: { title, message } });
  await db.$disconnect(); await context.close(); await browser.close();
}
