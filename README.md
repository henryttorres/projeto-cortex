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
| [Fluxo Git](docs/fluxo-git.md) | prod → validação → main |
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

A IA integrada ao portal, recuperação de senha, captação persistida e deploy permanecem pendentes. O guia interativo não é IA integrada. O [README anterior](docs/readme-historico-2026-10-11.md) foi preservado como registro histórico; o schema Prisma prevalece sobre modelos antigos.

## IA: estado e próximos passos

**Implementado:** existe uma base local com Google ADK. O `root_agent` encaminha dúvidas acadêmicas ao `tutor_socratico`, que conduz o estudante pelas etapas do Método Cortéx e evita entregar respostas prontas. Ainda não consulta materiais dos professores, não registra lacunas e não possui RAG. O teste live dos cenários do agente não foi validado: a API Gemini retornou erros 503 e 429.

O painel de IA disponível hoje é a interface de desenvolvimento do ADK, não um painel integrado ao portal. O menu local pode iniciar ou parar site, API e painel, mostrar o estado dos serviços e abrir as interfaces; ao parar, preserva o PostgreSQL e os dados. Consulte o [guia do agente](ai-agent/README.md) e a seção de [execução local](#execução).

**Planejado para desenvolvimento posterior — não implementado:**

1. **Etapa A — ferramentas docentes:** adicionar `Subject` vinculado a uma turma, perguntas docentes e rascunhos de planos de aula. Incluir `notebookLmUrl` opcional como referência; a ingestão de conteúdo do NotebookLM continua pausada. Publicar um plano exigirá revisão humana registrada por usuário autorizado.
2. **Etapa B — painel e integração de IA:** criar o painel do portal, ferramentas/subagentes ADK e uma ponte NestJS–ADK. O navegador não chamará o ADK diretamente; a comunicação entre serviços usará segredo interno guardado apenas no ambiente local, nunca no Git.
3. **RAG inicial:** armazenar conteúdo em `RagDocumentChunk` com `content` e `embeddingJson`. Nesta primeira etapa, não exigir a extensão pgvector nem índice HNSW; busca vetorial pode ser habilitada depois.

Ao retomar o trabalho no Antigravity, reconciliar primeiro o plano com o schema Prisma e as permissões atuais; implementar e validar a Etapa A antes da Etapa B. O protótipo antigo de IA/RAG em outra branch serve apenas como referência, não como implementação vigente. Os itens acima são decisões de planejamento, não funcionalidades disponíveis hoje.
