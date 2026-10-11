# Purple Team — revisão do atendimento

Data local: 10/10/2026. Escopo: diff dos chamados, API NestJS local, PostgreSQL
dedicado e frontend em 127.0.0.1. Contrato aplicado: `security/purple-team/agent.md`.
Não houve uso de NVIDIA/NemoClaw, envio de código/dados para serviços de segurança,
varredura de terceiros, alteração de produção ou uso de dados reais.

## Evidência de controles

| Hipótese avaliada | Evidência observada | Estado |
|---|---|---|
| Ler/alterar chamado alheio trocando UUID | Outra conta e docente recebem 404; lista/total não revelam chamados | Bloqueada nos testes |
| Forjar solicitante, atendente, status ou papel | Campos extras retornam 400; cabeçalho de papel não amplia escopo | Bloqueada nos testes |
| Agir sem login, com cookie adulterado, sem CSRF ou origem externa | 401/403 nas tentativas sintéticas | Bloqueada nos testes |
| Continuar com papel removido ou conta desativada | Sessão existente recebe 404/401; papel vem do banco em cada requisição | Bloqueada nos testes |
| Dois atendentes assumirem simultaneamente | Um 201 e um 409; apenas uma entrada de atribuição | Bloqueada nos testes |
| Atendente não responsável responder/encerrar | 403; solicitante também não encerra por conta própria | Bloqueada nos testes |
| Reenviar mensagem/publicação duplicando o histórico | Mesmo ID retorna resultado existente, sem nova entrada | Bloqueada nos testes |
| Reutilizar ação de outro autor ou alterar conteúdo do mesmo ID | 409, sem transferência de autoria | Bloqueada nos testes |
| Sobrescrever estado obsoleto | Versão anterior retorna 409 | Bloqueada nos testes |
| Injetar SQL por texto | Payload preservado como dado, consultas pelo Prisma | Não explorável pelo caminho testado |
| Executar HTML no histórico | Payload renderizado como texto no Chrome; sem elemento/evento executado | Bloqueada no cenário testado |
| Consultar indefinidamente | Endpoint retorna 429 dentro de 61 consultas controladas | Limite observado |

Referências: `backend/src/tickets.ts:30` (escopo), `:48` (detalhe), `:71`
(ações), `:84` (atendente), `:104` (versão), `:108` (isolamento serializável).
O guard de sessão existente reconsulta conta/papéis, valida expiração e CSRF.
A API mantém `Cache-Control: no-store`, Helmet e origem restrita para escrita.
Dados de sessão/senha/e-mail não aparecem no retorno do chamado. UI usa texto React,
sem HTML injetado. Sem upload, chamadas remotas ou comandos de shell no novo fluxo.

## Auditor e segredos

`node security/purple-team/audit.mjs`: 48 arquivos examinados ao final, um alerta
SQL_INTERPOLATION em `backend/prisma/seed.ts:13`; `.env` e `.env.example` omitidos
intencionalmente. Revisão contextual: e-mail fictício interpolado em objeto Prisma,
sem construção de SQL. **Falso positivo**, sem evidência de exploração; nenhum
patch de segurança necessário nessa linha.

Listagem de arquivos rastreados não encontrou `.env` real, ACESSOS, logs ou
sourcemaps; encontrou apenas `.env.example` e a declaração TypeScript de ambiente.
`.gitignore` cobre dados locais, variáveis reais, builds e logs. O auditor examinou
o bundle na cobertura de padrões de segredo. Não houve leitura/impressão de valores
de segredos nem auditoria completa do histórico Git.

Consulta HTTP local ao caminho Vite `/@fs/.../backend/.env` retornou 403; a API
retornou 404 para `/.env`. O caminho `/.env` da SPA retornou fallback 200 sem os
campos de ambiente procurados. Isso não equivale a auditar todos os caminhos do SO.

## Execução reproduzível

Em backend: `npm run build`, `npm test` (11 testes), `npm run test:support`
(9 testes), `npm run test:ui`, `npm run test:communications:ui`,
`npm run test:support:ui`. Na raiz: `pnpm --dir frontend build`, auditor local e
`git diff --check`. Testes usam registros sintéticos, removidos ao final.

## Limitações e riscos residuais

Não foi identificada exploração nos cenários verificados; isso **não certifica
ausência de vulnerabilidades**. Sem pentest independente, revisão completa do
histórico, TLS/infraestrutura cloud, dispositivos diversos ou testes de carga.
Dependências não mudaram; a análise de CVEs não foi repetida neste marco.
O auditor é heurístico, não SAST/análise de fluxo completos. Sem auditoria de todos
os textos potencialmente pessoais que usuários poderiam digitar.

Suporte/admin veem toda a fila desta instituição; não existe isolamento multiescola.
Administração tem exceção explícita à atribuição para responder. Rate limit é por
IP, em memória e por instância; não substitui prevenção de abuso distribuída.
Reatribuição de chamados de atendentes afastados, retenção, exportação, monitoramento
e revisão periódica de permissões devem ser definidos antes de produção.

Rollback: reverter o commit de aplicação e reconstruir API/front. Manter as tabelas
aditivas sem uso preserva o histórico; não executar DROP automaticamente. Exclusão
de dados exige backup validado e decisão explícita. Não houve deploy/merge em produção.
