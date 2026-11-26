# Cortéx Instituto de Aprendizagem

Plataforma acadêmica e de atendimento. Equipe: **Henry, Eduardo, Joelly, Eduarda, Danilo e Luna**.

## Estado verificado — 26/11/2026

React/TypeScript/Vite com identidade visual aplicada, API NestJS/Prisma e PostgreSQL. Login, vínculos acadêmicos, agenda, comunicados e chamados são persistidos. A demonstração anterior permanece separada do portal integrado.

Atendimento: distribuição automática por disponibilidade e menor carga, histórico, reabertura, CSAT e indicadores de ciclos encerrados. Metas demonstrativas: primeira resposta em 4h úteis e resolução em 16h úteis, seg–sex 09–17h, Bahia, sem feriados.

**Nova entrega:** equipes Centro/Norte, hierarquia com diretor, consultas e métricas por equipe, cadastro de aluno com vínculo pendente de aprovação ADMIN, encaminhamento de dois dias úteis e transferência administrativa. [Relatório e limites](docs/equipes-secretaria-2026-10-11.md).

Pendente: metas/feriados editáveis, SLA de todo o backlog, convites de funcionários e documentos oficiais. A secretaria emite registros textuais demonstrativos. Sem deploy público.
## Guias

| Guia | Conteúdo |
|---|---|
| [Índice](docs/README.md) | Evidências e ordem de leitura |
| [VS Code](COMECE-AQUI.md) | Workspace e execução |
| [Backend](backend/README.md) | Preparo, migrações, contas e endpoints |
| [Entidades e permissões](docs/equipes-entidades-permissoes.md) | Modelo atual e evolução de equipes |
| [Plano de 90 dias](docs/plano-90-dias.md) | Marcos, responsáveis propostos e indicadores |
| [Fluxo Git](docs/fluxo-git.md) | dev → prod (validação) → main |
| [Estrutura](docs/estrutura-do-projeto.md) | Onde editar |
| [Identidade visual](docs/marca/direcao-visual.md) | Marca e tipografia |
| [Operação](docs/operacao-metricas-2026-10-11.md) | Métricas e evidências anteriores |

## Execução

Abra [Cortex.code-workspace](Cortex.code-workspace). Em máquina nova, siga o [preparo da API](backend/README.md) e execute `pnpm --dir frontend install --frozen-lockfile`.

No Windows já preparado, use `scripts\menu_cortex.bat`: escolha iniciar site/API, painel de IA ou tudo junto e o menu abrirá as interfaces no navegador padrão do Windows. O painel de IA requer o ambiente preparado e `GOOGLE_API_KEY` configurada em `ai-agent\cortex_agent\.env`; consulte [guia do agente](ai-agent/README.md). O menu também mostra o estado das portas e permite encerrar os serviços reconhecidos.

Para iniciar somente o site integrado e API pela raiz:

```powershell
.\scripts\iniciar-integracao.ps1
```

Acesse http://127.0.0.1:5173; Vite encaminha `/api` para a porta 3001. O painel de IA fica em http://127.0.0.1:8000. Banco local preparado: 54329. O menu reconhece serviços Cortéx já ativos e não cria instâncias duplicadas; portas de processos não reconhecidos não são reutilizadas nem encerradas. A opção de parada encerra apenas serviços identificados; o PostgreSQL e os dados permanecem. Operações em andamento podem ser interrompidas. Live Server não substitui a API/Vite nos fluxos integrados.

Credenciais fictícias somente em `.local-data/ACESSOS.md`. Não publicar `.env`, tokens, senhas ou dados reais.

## Validação e limites

Em `backend`: `npm run build`, `npm test`, `npm run test:support`, `npm run test:operations`. Interface com serviços ativos: `npm run test:ui`, `npm run test:communications:ui`, `npm run test:support:ui`. Frontend pela raiz: `pnpm --dir frontend build`.

Esta entrega passou em 33 testes HTTP/operação/hierarquia e quatro suítes de interface. Consulte o relatório para cobertura e limitações. Novos comandos: `npm run test:teams` e `npm run test:teams:ui` em backend.

IA integrada ao portal implementada nas Ondas A–H. Antes de usar, aplique as
migrations e configure os segredos locais do ADK/NestJS; a execução live com
Gemini ainda não foi validada nesta rodada. Recuperação de senha, captação
persistida adicional e deploy público permanecem pendentes. O [README anterior](docs/readme-historico-2026-10-11.md) foi preservado como registro histórico.

## IA e ferramentas docentes

**Implementado:** disciplinas e referências externas NotebookLM; feed e respostas
docentes; planos de aula que permanecem rascunhos até a revisão/publicação
explícita; acervo de trechos por disciplina; registro de `duvida_recorrente`,
`tentativa_cola` e `erro_conceitual`; diagnóstico persistido da turma; subagentes
Google ADK e aba **Acervo e IA** conectada ao portal. As respostas recebem
contexto autorizado de turma/disciplina e apresentam IDs de trechos recuperados.

A ingestão local aceita texto colado e arquivos `.txt`/`.md` de até 64 KB
(16.000 caracteres). A busca atual é lexical sobre texto; `embeddingJson` fica
preparado sem exigir `pgvector` ou HNSW. O link NotebookLM é somente uma referência
externa e não é importado/indexado automaticamente. Planos gerados continuam
sugestões para revisão docente.

Para habilitar localmente, aplique `npm run db:migrate` em `backend` e configure
`CORTEX_INTERNAL_TOKEN` com o mesmo segredo em `backend/.env` e
`ai-agent/cortex_agent/.env`; configure `GOOGLE_API_KEY` no ambiente do ADK.
O menu `scripts\\menu_cortex.bat` mantém a inicialização do ADK em
`http://127.0.0.1:8000`; o NestJS faz a ponte servidor-a-servidor e o navegador
não acessa o ADK diretamente. Detalhes e rotas estão no
[guia do backend](backend/README.md) e [guia do agente](ai-agent/README.md).

**Ainda pendente:** validação live com credenciais reais, ingestão nativa de PDF
ou NotebookLM, embeddings e busca vetorial/pgvector-HNSW, recuperação de senha e
deploy público. O protótipo antigo de IA/RAG em outra branch continua sendo
apenas referência histórica.
