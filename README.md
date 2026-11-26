# Cortéx Instituto de Aprendizagem

Plataforma acadêmica e de atendimento. Equipe: **Henry, Eduardo, Joelly, Eduarda, Danilo e Luna**.

## Estado da versão em `main` — última validação: 11/10/2026

React/TypeScript/Vite com identidade visual aplicada, API NestJS/Prisma e PostgreSQL. Login, vínculos acadêmicos, agenda, comunicados e chamados são persistidos. A demonstração anterior permanece separada do portal integrado.

Atendimento: distribuição automática por disponibilidade e menor carga, histórico, reabertura, CSAT e indicadores de ciclos encerrados. Metas demonstrativas: primeira resposta em 4h úteis e resolução em 16h úteis, seg–sex 09–17h, Bahia, sem feriados.

**Nova entrega:** equipes Centro/Norte, hierarquia com diretor, consultas e métricas por equipe, cadastro de aluno com vínculo pendente de aprovação ADMIN, encaminhamento de dois dias úteis e transferência administrativa. [Relatório e limites](docs/equipes-secretaria-2026-10-11.md).

Pendente: metas/feriados editáveis, SLA de todo o backlog, convites de funcionários e documentos oficiais. A secretaria emite registros textuais demonstrativos. Sem deploy público.

## Panorama de desenvolvimento

**Atualizado em: 26/11/2026.**

Este panorama acompanha o trabalho em andamento sem declarar funcionalidades não validadas como prontas. A atualização deste resumo é documental e pode ser publicada diretamente em `main`; isso **não** promove código nem altera o estado validado do produto acima.

### Branches e localização do trabalho

- **`main`**: branch padrão e referência do estado estável descrito acima.
- **`prod`**: etapa de integração e validação; não representa deploy público automático.
- **`dev`**: desenvolvimento ativo. Contém a automação local do menu e a base inicial do agente Google ADK, ainda sem integração de RAG ou painel dentro do portal. Consulte o [README de desenvolvimento em `dev`](https://github.com/henryttorres/projeto-cortex/blob/dev/README.md) e o [guia de fluxo Git em `dev`](https://github.com/henryttorres/projeto-cortex/blob/dev/docs/fluxo-git.md).
- **`feat/integracao-ia-institucional`**: protótipo antigo e separado de IA/RAG, mantido apenas como referência; não é a implementação atual.

### Próximos passos de IA — planejados, não implementados

1. **Etapa A — ferramentas docentes:** `Subject` por turma, perguntas docentes e rascunhos de planos de aula; `notebookLmUrl` opcional como referência. A ingestão de conteúdo do NotebookLM continua pausada. Publicar um plano exigirá revisão humana registrada por usuário autorizado.
2. **Etapa B — painel e integração:** painel no portal, ferramentas/subagentes ADK e ponte NestJS–ADK. O navegador não acessará o ADK diretamente; a autenticação entre serviços usará segredo guardado somente no ambiente local.
3. **RAG inicial:** `content` e `embeddingJson`, sem exigir pgvector ou índice HNSW nesta etapa.

A prova live dos cenários do agente ainda não foi validada: a API Gemini retornou erros 503 e 429. Nenhum item planejado acima deve ser tratado como funcionalidade disponível.

### Promoção de código

Código e funcionalidades seguem **`dev` → `prod` (revisão e validação) → `main`**. Só o estado validado em `prod` pode ser promovido para `main`. A exceção de atualização direta em `main` aplica-se somente a este panorama documental; ela não libera código nem funcionalidades.

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

No Windows já preparado, pela raiz:

```powershell
.\scripts\iniciar-integracao.ps1
```

Acesse http://127.0.0.1:5173. Vite encaminha `/api` para a porta 3001. Banco local preparado: 54329. O script recusa portas ocupadas. Live Server não substitui a API/Vite nos fluxos integrados.

Credenciais fictícias somente em `.local-data/ACESSOS.md`. Não publicar `.env`, tokens, senhas ou dados reais.

## Validação e limites

Em `backend`: `npm run build`, `npm test`, `npm run test:support`, `npm run test:operations`. Interface com serviços ativos: `npm run test:ui`, `npm run test:communications:ui`, `npm run test:support:ui`. Frontend pela raiz: `pnpm --dir frontend build`.

Esta entrega passou em 33 testes HTTP/operação/hierarquia e quatro suítes de interface. Consulte o relatório para cobertura e limitações. Novos comandos: `npm run test:teams` e `npm run test:teams:ui` em backend.

IA integrada ao portal, recuperação de senha, captação persistida e deploy permanecem pendentes. O guia interativo não é IA integrada. O [README anterior](docs/readme-historico-2026-10-11.md) foi preservado como registro histórico; o schema Prisma prevalece sobre modelos antigos.
