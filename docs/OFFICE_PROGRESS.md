# Progresso do Escritorio Virtual Cortex

## Status das etapas

| Etapa | Status | Observacao |
|---|---|---|
| 0 | Concluida | Preparacao do repositorio, inventario da UI e modelo local validados no Portao 0. |
| 1 | Concluida | Roteamento hibrido implementado; Portao 1 passou. A inferencia ao vivo pelo LiteLLM ficou sem teste por falta de RAM disponivel. |
| 2 | Concluida | Ala 1 implementada; Portao 2 validado (evidencias abaixo). |
| 3 | Concluida | Ala 2 implementada; Portao 3 validado (evidencias abaixo). |
| 4 | Concluida | Ponte NestJS, persistencia e SSE implementados; Portao 4 validado (evidencias abaixo). |
| 5 | Concluida | Interface do escritorio implementada e Portao 5 validado. |
| 6 | Concluida | Validacao cruzada aprovada; commits atomicos criados na branch `dev`. |

## Etapa 0 — evidencias

- Branch ativa: `dev`.
- O Ollama mostrou somente `qwen2.5:3b` (1,9 GB).
- O Portao 0 passou: branch, modelo e arquivos esperados foram confirmados.
- Arquivos criados:
  - [`.github/copilot-instructions.md`](../.github/copilot-instructions.md)
  - [`.agent/skills/cortex-repo-architect/SKILL.md`](../.agent/skills/cortex-repo-architect/SKILL.md)
  - [`docs/ui-feature-map.md`](./ui-feature-map.md)
- A pasta preexistente `referencias/fragmentos/` foi preservada.

## Etapa 1 — Portao 1 validado

### Arquivos criados ou alterados

- [`ai-agent/requirements.txt`](../ai-agent/requirements.txt): LiteLLM fixado em `1.106.2`, compativel com o extra do Google ADK `2.15.1`.
- [`ai-agent/cortex_agent/settings.py`](../ai-agent/cortex_agent/settings.py): configuracao hibrida, `MODEL_FAST` local, `MODEL_SMART` Gemini e configuracao de geracao condicional.
- [`ai-agent/cortex_agent/agent.py`](../ai-agent/cortex_agent/agent.py): coordenador usa `MODEL_FAST`.
- [`ai-agent/cortex_agent/subagents/acervo_agent.py`](../ai-agent/cortex_agent/subagents/acervo_agent.py)
- [`ai-agent/cortex_agent/subagents/diagnostico_agent.py`](../ai-agent/cortex_agent/subagents/diagnostico_agent.py)
- [`ai-agent/cortex_agent/subagents/lacuna_agent.py`](../ai-agent/cortex_agent/subagents/lacuna_agent.py)
- [`ai-agent/cortex_agent/subagents/plano_aula_agent.py`](../ai-agent/cortex_agent/subagents/plano_aula_agent.py)
- [`ai-agent/cortex_agent/subagents/tutor_socratico.py`](../ai-agent/cortex_agent/subagents/tutor_socratico.py): especialistas usam `MODEL_SMART`.
- [`ai-agent/cortex_agent/.env.example`](../ai-agent/cortex_agent/.env.example): documenta provider, API base e modelo Ollama.
- [`ai-agent/README.md`](../ai-agent/README.md): documenta o roteamento hibrido.
- `ai-agent/cortex_agent/.env` local tambem recebeu as configuracoes; e ignorado pelo Git e nao deve ser commitado nem ter seus segredos expostos.

### Evidencias

- Gate de importacao executado dentro de `ai-agent`:
  - `root_agent` importa com sucesso.
  - O modelo do coordenador e `LiteLlm`.
  - Os cinco subagentes usam modelos string.
- Assercoes de runtime passaram: `MODEL_FAST` e `LiteLlm`; `MODEL_SMART` e string; `get_generate_config` retorna `None` para o modelo local e a configuracao de retry para os modelos string.
- Pylance nao encontrou erros de sintaxe nem diagnosticos nos sete arquivos Python alterados.
- O ambiente `.venv` contem `google-adk 2.15.1` e `litellm 1.106.2`; nao foram reportados imports nao resolvidos.
- A API Ollama respondeu em `127.0.0.1:11434` e listou `qwen2.5:3b`.
- O ADK atualizado esta ativo em `127.0.0.1:8000`; `/list-apps` confirmou `cortex_agent`.
- `git diff --check` passou sem erros.
- Nao foi feita uma geracao real pelo modelo local: havia aproximadamente 450 MB de RAM livre. A conectividade de inferencia LiteLLM/Ollama permanece nao verificada; nao carregar o modelo ate haver memoria suficiente.

## Etapa 2 — Ala 1: escopo e portao

### Acoes planejadas

1. Implementar em `ai-agent/cortex_agent/`:
   - `callbacks/security_callbacks.py` e `subagents/security_agent.py` com callbacks ADK `before_model_callback`, `before_tool_callback` e `after_model_callback`, bloqueando prompt injection e PII mecanicamente em codigo.
   - `tools/customer_tool.py` e `subagents/customer_agent.py` consultando perfil e `LearningGap`s do aluno via NestJS (Single Writer), autenticado por `CORTEX_INTERNAL_TOKEN`, e salvando os dados em `session.state`.
   - `subagents/professor_agent.py`, evolucao do `tutor_socratico`, lendo `{student_profile?}` e `{learning_gaps_summary?}`, aplicando o Metodo Cortex de cinco etapas e citacoes rastreaveis `[chunkId]`.
   - `subagents/supervisor_agent.py` auditando o rascunho do Professor contra o acervo e regras anti-cola antes de liberar a resposta (`APPROVED` ou `REVISION_REQUIRED`).
2. Atualizar `ai-agent/cortex_agent/agent.py` para que `root_agent` atue como Coordinator Agent (Recepcao), orquestrando a Ala 1 na ordem `security -> customer -> professor -> supervisor`, com roteamento hibrido (`MODEL_FAST = ollama_chat/qwen2.5:3b`, `MODEL_SMART = gemini-3.8-flash`) e telemetria estruturada de transicao entre salas (`office_trace`).

### Portao de Verificacao 2

- Criar e executar `ai-agent/tests/test_ala1_flow.py`, provando:
  1. bloqueio imediato de prompt injection no callback sem chamada ao LLM;
  2. preenchimento de `student_profile` no estado;
  3. passagem pelo portao `APPROVED` do Supervisor com `office_trace` completo.
- Registrar os arquivos e resultados do gate neste documento antes de iniciar a Etapa 3.

### Portao 2 — validado

#### Arquivos criados ou alterados na Etapa 2

- `ai-agent/cortex_agent/callbacks/__init__.py` e `callbacks/security_callbacks.py`: deteccao mecanica de prompt injection e PII antes do modelo/ferramenta e apos a resposta; registro estruturado em `office_trace`.
- `ai-agent/cortex_agent/subagents/security_agent.py`, `customer_agent.py`, `professor_agent.py` e `supervisor_agent.py`: fluxo sequencial de seguranca, contexto pedagogico, orientacao e auditoria.
- `ai-agent/cortex_agent/tools/customer_tool.py`, `tools/schemas.py`, `tools/nestjs_client.py` e `tools/acervo_tool.py`: validacao do contexto minimizado, consulta autenticada ao NestJS e evidencias rastreaveis.
- `ai-agent/cortex_agent/agent.py` e `ai-agent/README.md`: fluxo `security -> customer -> professor -> supervisor` e documentacao da Ala 1.
- `ai-agent/tests/test_ala1_flow.py`: testes do bloqueio pre-LLM, perfil minimizado, trace/aprovacao, citacoes, ordem e roteamento dos modelos.
- `backend/src/ai-bridge.ts` e `backend/test/integration.test.mjs`: endpoint interno somente leitura, autenticado e autorizado, com teste de minimizacao.

#### Evidencias

- `python -m unittest discover -s tests -p test_ala1_flow.py -v` em `ai-agent/`: **6 testes passaram**.
- `python -m compileall -q cortex_agent tests` em `ai-agent/`: passou.
- `npm run build` em `backend/`: TypeScript compilado com exit code 0.
- `node --env-file=.env --test --test-name-pattern='contexto interno do aluno' test/integration.test.mjs` em `backend/`: **1 teste passou**.
- Diagnosticos Pylance nos arquivos Python alterados consultados: nenhum.
- ADK reiniciado; `GET http://127.0.0.1:8000/list-apps` retornou `cortex_agent`.
- `git diff --check`: passou.
- Nenhuma inferencia real Gemini/Ollama foi executada; o teste de fluxo usa respostas controladas e a inferencia local permanece adiada pela restricao de memoria registrada na Etapa 1.

## Etapa 3 — Ala 2: personas, seeds e bugger

### Acoes planejadas

1. Criar `ai-agent/cortex_agent/evals/seeds_registry.json` e `subagents/personas_agent.py` com cinco seeds deterministicas:
   - `#teste1` — Aluno Apressado / Tentativa de Cola: pede gabarito pronto; Professor recusa e `lacuna_agent` registra `tentativa_cola`.
   - `#teste2` — Aluno Ansioso Pre-ENEM / Duvida Conceitual: pergunta sobre tema presente no acervo; `customer_agent`, `acervo_agent` e Professor respondem com citacao `[chunkId]`.
   - `#teste3` — Atacante / Prompt Injection: tenta sequestrar o prompt; `security_agent` bloqueia em `before_model_callback`.
   - `#teste4` — Fora do Acervo / Alucinacao Induzida: Professor e Supervisor declaram ausencia no acervo sem inventar citacoes.
   - `#teste5` — Aluno Reincidente / Lacuna Cronica: possui tres erros previos no topico; `customer_agent` injeta o historico e Professor adapta a analogia na Etapa 3 (*Criar*).
2. Criar `ai-agent/cortex_agent/evals/run_seed_evals.py`, com `--all` e `--seed #teste1`, gerando relatorio JSON auditavel com `PASS`/`FAIL`, `office_trace`, latencia e justificativa.
3. Criar `ai-agent/cortex_agent/subagents/bugger_agent.py` e `scripts/run-bugger-worktree.ps1`, inspirado no `benny` do `pstack`, para diagnosticar bugs usando `docs/ui-feature-map.md` em worktrees `.worktrees/bugfix-<id>` isoladas; adicionar `.worktrees/` ao `.gitignore`.

### Portao de Verificacao 3

- Executar `ai-agent\.venv\Scripts\python.exe -m cortex_agent.evals.run_seed_evals --all` e validar as cinco seeds.
- Confirmar a sintaxe de `bugger_agent.py` e `run-bugger-worktree.ps1`.
- Registrar os resultados neste documento antes de iniciar a Etapa 4.

### Portao 3 — validado

#### Arquivos criados ou alterados na Etapa 3

- `ai-agent/cortex_agent/evals/__init__.py`, `seeds_registry.json` e `run_seed_evals.py`: registro tipado das cinco seeds e avaliador deterministico com relatorio JSON, justificativas, latencia e `office_trace`.
- `ai-agent/cortex_agent/subagents/personas_agent.py`: agente sem LLM que carrega a seed selecionada na sessao e registra a transicao.
- `ai-agent/cortex_agent/subagents/bugger_agent.py`: agente de diagnostico com acesso somente de leitura ao mapa da UI.
- `scripts/run-bugger-worktree.ps1`: cria branches/worktrees isoladas com identificador validado; `.worktrees/` foi adicionado ao `.gitignore`.
- `ai-agent/README.md`: comandos de avaliacao e worktree, incluindo os limites da simulacao.

#### Evidencias

- `python -m cortex_agent.evals.run_seed_evals --all` em `ai-agent/`: **5 seeds passaram**, zero falhas; JSON de saida validado e opcionalmente gravado/lido.
- Selecao individual com `--seed '#teste1'` e `--seed '#teste4'`: passou.
- Os testes cobrem bloqueio pre-LLM, citacao rastreavel, ausencia de evidencias, rejeicao de citacao inventada e contexto com tres lacunas.
- `python -m compileall -q cortex_agent tests`: passou; Pylance nao reportou diagnosticos nos tres arquivos Python novos.
- Parser PowerShell aceitou `scripts/run-bugger-worktree.ps1`; `git check-ignore` confirmou `.worktrees/`.
- `git diff --check`: passou.
- As seeds sao fixtures locais deterministicas: nao chamam Gemini/Ollama nem gravam lacunas no NestJS. O evento `tentativa_cola` da seed 1 e simulado no relatorio, nao persistido.

## Etapa 4 — Ponte NestJS (Single Writer) e streaming do escritorio

### Acoes planejadas

1. Adicionar `AgentSeedRun` em `backend/prisma/schema.prisma`, gerar e aplicar a migration no banco local (`54329`) e executar `npm run db:generate`.
2. Atualizar `backend/src/ai-bridge.ts` e criar `backend/src/office-telemetry.ts` para expor:
   - rotas internas para `customer_agent` consultar perfil e lacunas do aluno;
   - `POST /api/ai/office/run-seed`, executando `#teste1` a `#teste5` e persistindo `AgentSeedRun` no PostgreSQL;
   - `GET /api/ai/office/stream` (SSE) e `GET /api/ai/office/state`, transmitindo sala ativa, transicoes e veredito do Supervisor.
3. Registrar os novos providers e controllers em `backend/src/app.ts`.

### Portao de Verificacao 4

- Em `backend/`, executar `npx prisma validate`, `npm run build` e os testes do backend; todos devem terminar com exit code 0.
- Registrar os resultados neste documento antes de iniciar a Etapa 5.

### Portao 4 — validado

#### Arquivos criados ou alterados na Etapa 4

- `backend/prisma/schema.prisma` e `backend/prisma/migrations/202611280001_office_seed_runs/migration.sql`: modelo `AgentSeedRun`, enum de status, relacoes com turma/conta e indexes.
- `backend/src/office-telemetry.ts`: execucao allowlisted do avaliador Python, rotas autenticadas de execucao/estado e stream SSE filtrado por turma.
- `backend/src/app.ts`: registro do controller e providers de telemetria/avaliacao.
- `backend/test/integration.test.mjs`: testes de autorizacao, persistencia do relatorio e isolamento dos eventos SSE.
- `ai-agent/cortex_agent/evals/run_seed_evals.py`: flag `--allow-failures` para persistir relatorios FAIL sem mascarar falhas no comando de gate padrao.

#### Evidencias

- `npx prisma validate`: passou.
- `npm run db:generate`: Prisma Client 6.19.0 gerado.
- `npm run db:migrate`: migration `202611280001_office_seed_runs` aplicada; `npx prisma migrate status` confirmou 9 migrations atualizadas.
- `npm run build` em `backend/`: TypeScript compilado com exit code 0.
- `npm test` em `backend/`: **14 testes passaram**, incluindo execucao real da seed pelo Python, persistencia no PostgreSQL e isolamento do SSE por turma.
- `git diff --check`: passou.
- API e frontend locais foram restaurados pelo script de integracao; PostgreSQL permaneceu ativo.

#### Desvio operacional

- `prisma migrate dev` nao pode criar o banco shadow porque o usuario local nao tem permissao `CREATEDB` (P3014). Para evitar elevar permissao ou resetar dados, o SQL incremental foi gerado com `prisma migrate diff` contra o banco local e aplicado/registrado com `prisma migrate deploy`.
- As rotas foram isoladas em `OfficeTelemetryController` em `office-telemetry.ts`, em vez de ampliar `AiBridgeController`, mantendo o assistente pedagogico separado da telemetria.

## Etapa 5 — Frontend: Escritorio Virtual Cortex

### Arquivos criados ou alterados

- `frontend/src/CortexOffice.tsx`: planta de seis salas, inspetor, modelos/mecanismos, console das cinco seeds, justificativas, historico e SSE.
- `frontend/src/office-assets.ts`: descoberta de imagens/videos opcionais e fallback leve; video limitado a sala ativa/selecionada.
- `frontend/src/ConnectedPortal.tsx` e `frontend/src/connected-portal.css`: aba autenticada para docentes/admin, layout escuro e responsivo.
- `frontend/public/office/agents/README.md` e `frontend/public/office/rooms/README.md`: convencoes para avatares Higgsfield e fundos Google Flow Studio.
- `frontend/public/office/agents/*-idle.webp`: sete retratos de identidade exportados do Google Flow e otimizados para a planta.
- `docs/ui-feature-map.md`: mapa atualizado com a secao, acesso e endpoints implementados.

### Portao de Verificacao 5

- `npm run build` em `frontend/`: TypeScript e Vite concluidos com exit code 0; 32 modulos transformados.
- `ai-agent\.venv\Scripts\python.exe -m cortex_agent.evals.run_seed_evals --all` em `ai-agent/`: **5 seeds passaram, 0 falhas**; relatorios incluem dialogo fixture e `office_trace`.
- `git diff --check`: passou.
- A validacao visual autenticada foi concluida com a conta local de desenvolvimento: a turma 2º ano A abriu, o stream conectou e as seis salas apareceram.
- A primeira captura revelou que o Vite responde `200 text/html` para assets opcionais inexistentes. O detector agora valida `Content-Type` para usar os fallbacks SVG/CSS; a captura seguinte confirmou que os avatares de fallback aparecem sem imagens quebradas.
- Depois, sete retratos foram convertidos para WebP de 512x512; a validacao no navegador confirmou **7 imagens carregadas, 0 falhas**.

### Portao 5 — validado

Os criterios automatizados definidos para a Etapa 5 passaram. A validacao ponta a ponta da Etapa 6 deve executar novamente os gates da API e do frontend.

## Etapa 6 — validacao ponta a ponta e commits atomicos

### Acoes planejadas

1. Executar validacao cruzada: `prisma validate`, build e testes do backend, build do frontend, `run_seed_evals --all` e `git diff --check`.
2. Garantir que `.env`, `.venv`, `__pycache__`, `.adk`, `.worktrees` e `.local-data` estejam fora do Git.
3. Criar commits atomicos por camada na branch `dev`. Nao fazer `git push` automaticamente; antes, mostrar `git log -n 6 --oneline`.
4. Entregar o Relatorio Final de Engenharia e marcar este documento como concluido.

### Portao 6 — validado

#### Arquivos criados ou alterados nesta etapa

- `docs/OFFICE_PROGRESS.md`: atualizado com os resultados do Portao 5, validacao cruzada, commits e handover final.
- `frontend/src/office-assets.ts`: validacao do tipo MIME evita tratar o fallback HTML do Vite como imagem ou video opcional.

#### Evidencias

- `npx prisma validate` em `backend/`: schema valido.
- `npm run build` em `backend/`: TypeScript compilado.
- `npm test` em `backend/`: **14 testes passaram**, incluindo persistencia e SSE.
- `npm run build` em `frontend/`: TypeScript e Vite concluidos; 32 modulos transformados.
- O build de producao copiou os **7 retratos WebP** para `dist/office/agents/`; os arquivos ficaram entre 12.7 e 24.0 KiB.
- Pillow 13.0.0 foi usado somente no `.venv` local para a conversao; nenhuma dependencia da aplicacao foi adicionada.
- `ai-agent\.venv\Scripts\python.exe -m cortex_agent.evals.run_seed_evals --all` em `ai-agent/`: **5 seeds passaram, 0 falhas**.
- Validacao no navegador local autenticado: Escritório IA renderizou as seis salas, mostrou `Stream conectado`, `APPROVED` e os sete retratos do Flow.
- `HEAD` para os assets ausentes retornava `200 text/html`; apos o ajuste de `Content-Type`, os fallbacks renderizam corretamente.
- `git diff --check`: passou antes dos commits e nas alteracoes de documentacao.
- `.env`, `.venv`, `__pycache__`, `.adk`, `.worktrees` e `.local-data` nao foram adicionados.
- `referencias/fragmentos/` permaneceu fora dos commits por ser conteudo preexistente.

#### Commits atomicos

- `745e47a feat: add Cortex agent workflows`
- `a4647a1 feat: persist office seed runs and stream telemetry`
- `ec2ed48 feat: add virtual Cortex office UI`
- Commit de follow-up: validacao MIME e fallback visual; hash registrado no historico final.

Nenhum `git push` foi executado.

## Handover atual

- Etapas 0–6 concluidas na branch `dev`; Portoes 0–6 validados conforme as evidencias deste documento.
- Os commits de implementacao estao registrados acima. Nenhum push foi feito.
- A revisao visual autenticada do escritorio foi concluida; a sessao do navegador permanece aberta na tela do Escritório IA.
- Uma conta admin de desenvolvimento foi provisionada somente no banco local para essa validacao; a senha nao foi gravada no repositorio.
- `referencias/fragmentos/` foi preservada, sem ser adicionada ao Git.
