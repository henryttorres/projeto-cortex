# Contexto atual — Cortéx

Atualizado em 11/10/2026. Equipe acadêmica: Henry, Eduardo, Joelly, Eduarda, Danilo e Luna. Primeiro commit 27/09: dia 15 provisório do plano, confirmar data oficial.

## Implementado

React/TypeScript/Vite; NestJS/Prisma/PostgreSQL. Login, agenda, comunicados, chamados, distribuição por disponibilidade/capacidade e métricas de ciclos encerrados. Identidade Sora/Source Sans 3 preservada.

Nova entrega: SupportTeam/TeamMember, director e vínculos hierárquicos. Seed Centro/Norte: supervisor/coordenador Centro, diretor ambas, suporte Centro e atendente2 Norte. ADMIN institucional; gestores consultam equipes vinculadas; supervisor não opera chamados. Coordenador/diretor decidem encaminhamentos do respectivo setor. ADMIN gere equipes/vínculos e transferências.

Secretaria: atendente responsável cadastra aluno para responsável solicitante, vínculo não verificado até ADMIN aprovar. Encaminha a coordenação/direção/ADMIN com justificativa, decisão e prazo de 960 minutos úteis (seg–sex 09–17h Bahia, sem feriados). Encerramento bloqueado enquanto pendente. Decisões textuais demonstrativas, sem documento oficial. UUID/versão/histórico por chamado. Transferência mantém início/metas; ciclo aberto passa ao destino, encerrados preservados.

## Evidências e ambiente

Relatório docs/equipes-secretaria-2026-10-11.md; migração 202610110003_equipes aplicada localmente. Builds aprovados; 33 testes HTTP/operação/hierarquia; quatro suítes Chrome headless, incluindo secretaria desktop/mobile sem overflow. Auditor 61 arquivos: três falsos positivos contextuais, sem prova de segurança completa.

API 3001 reiniciada, Vite 5173 existente, PostgreSQL 54329. Confirmar processos na retomada. Credenciais fictícias .local-data/ACESSOS.md; novos perfis usam senha seed. Documentos pessoais do portal de referência não copiados. Workspace desta pasta atualizado.

## Continuidade

Fluxo autorizado prod → testes → main. Preservar AGENTS.md, docs/documentacao-integrada-2026-10-02.md e security/ preexistentes não rastreados. Sem deploy público.

Próximos: SLA aberto completo/metas/feriados editáveis; convite/cadastro completo de funcionários e auditoria administrativa; documentos em arquivo; paginação secretaria (hoje 100 chamados/20 movimentos; histórico completo em Atendimento); recuperação/captação/cloud. SQL inicial é histórico. Não inventar equipe para legados sem vínculo.
