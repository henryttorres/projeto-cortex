# API Cortéx — portal, docência, acervo e atendimento

Integração NestJS/TypeScript, Prisma e PostgreSQL. Dados de demonstração são
fictícios. Não é implantação de produção.

## Preparar em uma máquina nova

Requisitos: Node.js 24, npm, PostgreSQL 17 e dependências do front instaladas.

1. Em `backend`, executar `npm ci` e `npm run db:generate`.
2. Criar um banco dedicado e usuário sem superusuário; copiar `.env.example` para
   `.env` e preencher a conexão e uma senha fictícia longa para o seed.
3. Executar `npm run db:migrate`, `npm run db:seed` e `npm run build`.
4. Executar `npm start`; em outro terminal, `pnpm --dir frontend dev` na raiz.
5. Abrir **http://127.0.0.1:5173**. Usar esse host para corresponder à origem
   configurada. O Vite encaminha `/api` para `127.0.0.1:3001`.

As versões estão fixadas no package-lock. Prisma e cliente usam a mesma versão.
Overrides de `effect` e `deepmerge-ts` corrigem alertas transitivos do tooling;
geração, migração, build e testes devem ser repetidos ao atualizar essas versões.

## Ambiente Windows preparado em 10/10/2026

PostgreSQL portátil oficial EDB 17.11, obtido da página
https://www.enterprisedb.com/download-postgresql-binaries
(link de download `fileid=1260616`). Não foi instalado serviço do Windows.
Binários e dados ficam em `%LOCALAPPDATA%/CortexRuntime`, fora do OneDrive.
Escuta exclusivamente em `127.0.0.1:54329`, com SCRAM-SHA-256.

O script `scripts/preparar-postgres-local.ps1` requer binários previamente
extraídos em `%LOCALAPPDATA%/CortexRuntime/pgsql`, não sobrescreve banco existente
e gera credenciais aleatórias. O usuário `cortex` é dono somente do banco
dedicado e não é superusuário. Em produção, separar usuário de migração e runtime.

Após a preparação, executar `scripts/iniciar-integracao.ps1` na raiz para iniciar
os serviços. O script recusa portas ocupadas; não encerra processos alheios.
Logs e acessos fictícios ficam em `.local-data`, ignorada pelo Git. Não compartilhar
essa pasta, `.env` ou credenciais do administrador do banco.

## Contas fictícias

| E-mail | Perfil | Alcance |
|---|---|---|
| ana@demo.cortex.test | Responsável | Lucas e Bia, vínculos verificados |
| lucas@demo.cortex.test | Aluno | Apenas Lucas / 2º A |
| marina@demo.cortex.test | Professora | Apenas 2º A; agenda e publicação de comunicados |
| admin@demo.cortex.test | Administração | Turmas e estudantes deste banco |
| suporte@demo.cortex.test | Suporte | Sem acesso acadêmico |

Senha local em `.local-data/ACESSOS.md`; não é publicada. Seed idempotente não
troca senhas nem sobrescreve dados existentes. Recuperação de senha ainda não
integrada; a tela antiga permanece explicitamente simulada.

## Endpoints

| Método | Rota /api | Regra |
|---|---|---|
| POST | /auth/login | E-mail/senha; origem válida; até 10 tentativas/minuto/IP |
| GET | /auth/me | Sessão válida; identidade e token CSRF |
| POST | /auth/logout | Sessão e CSRF; revoga sessão |
| GET | /students | Próprio aluno, vínculos verificados ou administração |
| GET | /students/:id/agenda | Matrículas ativas do estudante autorizado |
| GET | /classes | Docência da professora ou administração |
| GET | /classes/:id/agenda | Turma autorizada |
| POST | /classes/:id/agenda | Professor da turma ou admin; CSRF; validação |
| GET | /students/:id/communications | Matrículas ativas do estudante autorizado |
| GET | /students/:id/communications/:communicationId | Detalhe com a mesma verificação de vínculos |
| GET | /classes/:id/communications | Lista da turma autorizada |
| GET | /classes/:id/communications/:communicationId | Detalhe da turma autorizada |
| POST | /classes/:id/communications | Professor da turma ou admin; sessão, origem e CSRF |
| GET | /tickets | Próprios chamados; suporte/admin veem a fila; paginação/status |
| POST | /tickets | Solicitante vem da sessão; abertura idempotente |
| GET | /tickets/:id | Autorização por objeto; histórico paginado |
| POST | /tickets/:id/actions | Assumir, responder, encerrar ou reabrir conforme perfil, atribuição e versão |
| GET | /classes/:id/subjects | Docente vinculado ou administração |
| POST | /classes/:id/subjects | Criar disciplina na turma; link NotebookLM opcional |
| PATCH / DELETE | /subjects/:id | Docente vinculado ou administração |
| GET | /classes/:id/questions | Feed e contadores docentes |
| POST | /classes/:id/questions | Estudante autenticado e matriculado |
| POST | /classes/:id/questions/:questionId/replies | Resposta do docente da turma |
| GET / POST | /classes/:id/lesson-drafts | Consultar ou criar planos como rascunho |
| POST | /classes/:id/lesson-drafts/:draftId/publish | Docente/admin; confirmação de revisão e auditoria `reviewedBy` |
| GET / POST | /classes/:id/rag-chunks | Buscar ou indexar texto por disciplina |
| GET / POST | /classes/:id/learning-gaps | Docentes consultam; estudante matriculado ou docente registra |
| GET / POST | /classes/:id/diagnosis | Consultar ou gerar diagnóstico agregado |
| POST | /ai/assist | Ponte autenticada do docente para o ADK |

Corpo da criação: `title`, `description`, `location`, `startsAt` e `endsAt` em ISO
8601. O servidor e o banco exigem término posterior ao início. Campos extras são
recusados. Registro indisponível e inexistente têm a mesma resposta 404.

Publicação de comunicado: `publicationId` (UUID v4), `title` (3–120 caracteres)
e `message` (3–5000 caracteres). Autoria e horário vêm do servidor. O UUID
deve permanecer igual ao repetir a mesma tentativa: mesmo conteúdo, autor e
turma retornam o registro já gravado; reutilização diferente retorna 409.
A revisão é local, sem salvar rascunho. Publicações são somente texto e destinadas
a uma turma por operação. Sem anexos, edição, exclusão, paginação ou recibo de leitura neste marco.

## Controles e limites

Sessão opaca de oito horas, armazenada por hash no banco; senha com scrypt e sal
aleatório. Cookie HttpOnly/SameSite=Strict; Secure em produção. Token CSRF em
memória do cliente, vinculado à sessão; checagem de Origin nas escritas. Helmet e
Cache-Control no-store. Consultas pelo Prisma, sem SQL de entrada concatenado.

API e front restritos a localhost. Antes de produção: HTTPS/reverse proxy,
configuração de cookies/origem, operação de recuperação de conta, limpeza de
sessões expiradas, estratégia de rate limit distribuído se houver múltiplas
instâncias, política de dados, backups e observabilidade. O rate limit atual é
local à instância. Não há isolamento multiescola implementado.

## Docência, acervo e IA

As migrations `202611260001_subjects`, `202611260002_teacher_qa` e
`202611260003_rag` acrescentam disciplinas, Q&A, planos, trechos, lacunas e
diagnósticos. Execute `npm run db:migrate` depois de configurar `DATABASE_URL`;
`npm run db:generate` atualiza o cliente Prisma.

O ingest aceita texto colado ou arquivos de texto lidos pelo navegador (`.txt` e
`.md`, até 16.000 caracteres) e cria trechos sobrepostos vinculados a turma e
disciplina. O campo `embeddingJson` é JSONB opcional; a busca local é lexical e
não requer `pgvector` nem índice HNSW. NotebookLM permanece link externo, sem
indexação automática.

A ponte `/api/ai/assist` exige sessão de docente/admin e docência na turma. O
NestJS encaminha o pedido ao ADK local em `CORTEX_ADK_URL` e injeta o contexto
verificado; ferramentas Python consultam rotas internas autenticadas por
`CORTEX_INTERNAL_TOKEN`, que deve ser igual no backend e em
`ai-agent/cortex_agent/.env`. Configure também `GOOGLE_API_KEY` para chamadas
live. Não exponha o token no frontend nem no Git. A execução live com Gemini e
as migrations não foram aplicadas/validadas nesta rodada.

Interesse e administração completa permanecem no portal de demonstração
separado. Não misturar dados simulados com o portal autenticado.

## Verificações

Operação: `npm run test:operations` valida roteamento, métricas e CSAT em schema
temporário isolado. Os detalhes de API, contas supervisor/coordenador, metas e
limites estão em `docs/operacao-metricas-2026-10-11.md` na raiz do projeto.

`npm run build && npm test`: integração HTTP contra banco com seed fictício.
Não executar em banco de produção. A suíte remove apenas seus registros
sintéticos e gera sessões de teste com expiração.

`npm run test:ui`: requer front e API ativos, Google Chrome instalado; testa em
Chrome headless separado do navegador do usuário e grava capturas em
`docs/evidencias/2026-10-10`. A senha é lida do ambiente, não registrada em logs.

`npm run test:communications:ui`: testa revisão, publicação, resposta perdida após
gravação, reenvio sem duplicação, leitura por vínculo, recarga e layout mobile.
Requer os mesmos serviços e dados fictícios. Registros criados são removidos ao final.

`npm run test:support`: testes HTTP sintéticos de autorização, concorrência,
idempotência, paginação e limitação de requisições. `npm run test:support:ui`:
fluxo completo com revisão, resposta perdida, atendimento, reabertura e texto inerte.
Contrato da API e operação: `docs/chamados-2026-10-10.md` na raiz do projeto.
Revisão e limitações: `docs/seguranca-atendimento-2026-10-10.md`.

Na raiz: `node security/purple-team/audit.mjs` e `pnpm --dir frontend build`.
O auditor é heurístico; seu resultado não equivale a teste completo de segurança.

## Equipes e secretaria — 11/10

Contas adicionais: diretor@demo.cortex.test (Centro/Norte) e atendente2@demo.cortex.test (Norte), mesma senha fictícia do seed local. Supervisor/coordenador limitados ao Centro. Use `npm run db:migrate`, `npm run db:seed`, `npm run build` e reinicie API após atualizar.

Endpoints e permissões: [relatório](../docs/equipes-secretaria-2026-10-11.md). Scripts de validação: `npm run test:teams` e `npm run test:teams:ui`. Legados sem equipe são visíveis ao solicitante/ADMIN; transferir os abertos pelo ADMIN quando necessário.
