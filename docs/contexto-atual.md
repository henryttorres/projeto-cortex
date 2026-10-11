# Contexto atual — Cortéx

Atualizado em 10/10/2026. Equipe: Henry, Eduardo, Joelly, Eduarda, Danilo e Luna. Responsabilidades ampliadas ainda propostas.

## Produto
React/TypeScript/Vite, identidade aplicada, Sora/Source Sans 3 locais, logo PNG, landing, vídeo sem áudio e cinco portais demonstrativos. Guide.tsx segue com botões, sem IA. Storytelling de quatro imagens pendente.

NestJS 11 + Prisma 6.19 + PostgreSQL 17.11: login/sessão/logout, vínculos verificados, agenda com publicação e agora comunicados por turma. Professora/admin escreve, revisa e publica; aluno/responsável lista e lê conforme vínculo e matrícula ativa. Reenvio idempotente evita duplicação. Rascunho somente local, sem anexos/edição/recibo/paginação. Modelo em backend/prisma; migrações de acesso/agenda e comunicados. Portal conectado separado da demonstração. Chamados, captação, recuperação e gestão completa ainda não integrados; sem deploy público/LLM.

## Ambiente e evidências
PostgreSQL dedicado em %LOCALAPPDATA%/CortexRuntime, porta 54329, SCRAM/loopback; sem serviço Windows. API 3001, Vite 5173. Retomada: scripts/iniciar-integracao.ps1 e backend/README.md. Não presumir processos ativos. Credenciais fictícias em .local-data/ACESSOS.md; segredos ignorados pelo Git.

10/10: builds API/front, 11 testes HTTP com PostgreSQL e duas suítes Chrome headless aprovados. Verificados acesso/agenda, revisão/publicação/leitura, autorização, resposta perdida e reenvio único, recarga e mobile 390px. Capturas em docs/evidencias/2026-10-10. Fonte: docs/comunicados-2026-10-10.md; marco anterior em docs/integracao-backend-2026-10-10.md. Não equivale a auditoria completa de segurança/acessibilidade.

## Segurança e documentação
Contrato: security/purple-team/agent.md; NVIDIA/NemoClaw cancelado. Auditor: 41 arquivos, falso positivo contextual no e-mail do seed; consultas Prisma. npm audit sem alertas na etapa anterior, não repetido sem mudança de dependências. Materiais anteriores de segurança preservados, fora do commit deste marco.

Documento integrado histórico: https://docs.google.com/document/d/1MYRpzwEH-NyoWuL4gF0ijMTJeBLSPuTyJjUj7EihBl8/edit . Não atualizado remotamente; snapshot em docs/documentacao-integrada-2026-10-02.md.

## Próximo passo
Integrar chamados/fila de suporte; depois captação/recuperação. Confirmar datas dos 90 dias e responsabilidades. Conferir branch/alterações antes de sincronizar; preservar arquivos preexistentes. Usar apenas dados fictícios.
