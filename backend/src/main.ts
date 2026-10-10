import { createApp } from './app';

async function main() {
  if (!process.env.DATABASE_URL || !process.env.WEB_ORIGIN) throw new Error('Configure DATABASE_URL e WEB_ORIGIN no servidor.');
  const app = await createApp();
  await app.listen(Number(process.env.PORT ?? 3001), '127.0.0.1');
  console.log('API Cortéx disponível em localhost.');
}
void main().catch(() => { console.error('Não foi possível iniciar a API. Confira banco e configuração local.'); process.exitCode = 1; });
