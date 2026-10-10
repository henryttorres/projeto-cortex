# Contexto atual — Cortéx

Atualizado em 10/10/2026. Equipe: Henry, Eduardo, Joelly, Eduarda, Danilo e Luna. Responsabilidades ampliadas ainda são propostas.

## Produto
React/TypeScript/Vite com identidade aplicada, Sora/Source Sans 3 locais, logo PNG, landing, vídeo sem áudio e cinco portais demonstrativos. Guide.tsx segue com botões, sem IA. Storytelling de quatro imagens pendente.

Primeira integração real implementada: NestJS 11 + Prisma 6.19 + PostgreSQL 17.11. Login/sessão/logout, vínculos verificados, agenda e criação por professora/admin. Account, AccountRole, Student, GuardianLink, SchoolClass, Enrollment, Teaching, AgendaEvent e Session em backend/prisma. SQL vazio antigo preservado. Portal conectado separado da demonstração. Recuperação, interesses, comunicados, chamados e gestão completa ainda não integrados; sem deploy público ou LLM.

## Ambiente e validação
PostgreSQL dedicado em %LOCALAPPDATA%/CortexRuntime, porta 54329, SCRAM e loopback; sem serviço Windows. API 3001, Vite 5173. scripts/iniciar-integracao.ps1 e backend/README.md orientam retomada; não presumir processos ativos. Acessos fictícios em .local-data/ACESSOS.md; segredos ignorados pelo Git.

10/10: builds API/front aprovados; testes HTTP com PostgreSQL e UI em Chrome headless validaram login, vínculos, negativas de autorização, CSRF/origem, persistência, recarga e logout. Capturas desktop/mobile em docs/evidencias/2026-10-10. Relatório e limites em docs/integracao-backend-2026-10-10.md. Não equivale a auditoria completa de segurança/acessibilidade.

## Segurança e documentação
Contrato local em security/purple-team/agent.md; NVIDIA/NemoClaw permanece cancelado. Laboratório histórico de 03/10: 16 testes aprovados após correção, distinto da API atual; avaliação sintética 30/30, sem medida comparativa. Auditor atual sinalizou e-mail interpolado do seed; falso positivo contextual, consultas pelo Prisma. npm audit sem alertas após overrides. Materiais de segurança anteriores preservados, não incluídos automaticamente no commit da integração.

Documento integrado com oito guias: https://docs.google.com/document/d/1MYRpzwEH-NyoWuL4gF0ijMTJeBLSPuTyJjUj7EihBl8/edit . Não atualizado remotamente nesta sessão; snapshot histórico em docs/documentacao-integrada-2026-10-02.md.

## Próximo passo
Integrar comunicados por turma, depois chamados/captação e recuperação de acesso. Confirmar início oficial/prazo dos 90 dias e papéis da equipe. Preservar alterações e conferir branch/estado antes de sincronizar DEV MODE. Não usar dados reais no ambiente local.
