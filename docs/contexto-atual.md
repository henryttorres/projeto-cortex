# Contexto atual — Cortéx

Atualizado em 11/10/2026. Equipe: Henry, Eduardo, Joelly, Eduarda, Danilo e Luna.

## Implementação

Base técnica 03b15d5: React/TypeScript/Vite, Sora/Source Sans 3, landing e demonstração separadas do portal integrado. NestJS/Prisma/PostgreSQL com login, agenda, comunicados, chamados, distribuição automática e indicadores de ciclos encerrados. Disponibilidade de atendente expira em 5min; capacidade automática cinco. CSAT após conclusão, reabertura preserva ciclos. Metas demonstrativas 4h/16h úteis, seg–sex 09–17h Bahia, sem feriados.

Supervisor/coordenador ainda têm alcance institucional e permissões operacionais no código. Equipes, funcionários, transferência, escopo por equipe, SLA aberto e metas editáveis NÃO implementados. IA externa, recuperação e captação pendentes.

## Organização desta entrega

README substituído por entrada atual; histórico preservado em docs/readme-historico-2026-10-11.md. Índice docs/README.md. Novos guias: equipes-entidades-permissoes.md (atual versus proposto), plano-90-dias.md, fluxo-git.md. Responsabilidades ampliadas são propostas. Workspace atualizado: terminal na raiz e tarefas de integração/API.

Branch prod recebeu por fast-forward os cinco commits de codex/integracao-postgresql-agenda. main permanece sem promoção. Fluxo pedido: prod → validação → main; proteção remota obrigatória não configurada. Preservados arquivos preexistentes não rastreados AGENTS.md, documentação integrada e security/.

## Validação

Nesta organização: sete documentos com links conferidos, JSON do workspace válido. Auditor local: 55 arquivos, dois avisos de interpolação de e-mail no seed (dados Prisma, não SQL dinâmico). Cobertura heurística limitada, sem garantia de segurança. Código da aplicação não alterado; builds/testes anteriores não repetidos. Evidência anterior: 27 testes HTTP/operação e três suítes de navegador aprovados, relatório operacao-metricas-2026-10-11.md.

## Retomada

Confirmar se ADMIN exclusivo significa gestão administrativa ou também retirar operações dos demais perfis. Depois implementar equipes/escopos/transferência e testes de acesso cruzado; somente então SLA aberto/metas. PostgreSQL local 54329, API 3001, Vite 5173; não presumir processos ativos. Preparação em backend/README.md, inicialização scripts/iniciar-integracao.ps1. Credenciais privadas .local-data/ACESSOS.md. VS Code deve abrir Cortex.code-workspace desta pasta; não sobrescrever outra cópia main modificada.
