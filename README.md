# Cortéx Instituto de Aprendizagem

Plataforma acadêmica e de atendimento. Equipe: **Henry, Eduardo, Joelly, Eduarda, Danilo e Luna**.

## Estado verificado — 11/10/2026

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

No Windows já preparado, pela raiz:

```powershell
.\scripts\iniciar-integracao.ps1
```

Acesse http://127.0.0.1:5173. Vite encaminha `/api` para a porta 3001. Banco local preparado: 54329. O script recusa portas ocupadas. Live Server não substitui a API/Vite nos fluxos integrados.

Credenciais fictícias somente em `.local-data/ACESSOS.md`. Não publicar `.env`, tokens, senhas ou dados reais.

## Validação e limites

Em `backend`: `npm run build`, `npm test`, `npm run test:support`, `npm run test:operations`. Interface com serviços ativos: `npm run test:ui`, `npm run test:communications:ui`, `npm run test:support:ui`. Frontend pela raiz: `pnpm --dir frontend build`.

Esta entrega passou em 33 testes HTTP/operação/hierarquia e quatro suítes de interface. Consulte o relatório para cobertura e limitações. Novos comandos: `npm run test:teams` e `npm run test:teams:ui` em backend.

IA externa, recuperação de senha, captação persistida e deploy permanecem pendentes. O guia interativo não é IA integrada. O [README anterior](docs/readme-historico-2026-10-11.md) foi preservado como registro histórico; o schema Prisma prevalece sobre modelos antigos.
