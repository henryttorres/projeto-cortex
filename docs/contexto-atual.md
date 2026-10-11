# Contexto atual — Cortéx

Atualizado em 10/10/2026 (Bahia). Equipe: Henry, Eduardo, Joelly, Eduarda, Danilo e Luna. Responsabilidades ampliadas ainda propostas.

## Produto
React/TypeScript/Vite, identidade aplicada, Sora/Source Sans 3 locais, logo PNG, landing, vídeo sem áudio e cinco portais demonstrativos. Guide.tsx orienta atendimento autenticado; sem IA. Storytelling de quatro imagens pendente.

NestJS 11 + Prisma 6.19 + PostgreSQL 17.11: login/sessão/logout, vínculos verificados, agenda, comunicados e chamados persistidos. Comunicados: revisão/publicação/leitura por turma. Atendimento: abertura revisada, protocolo, fila paginada, atribuição, respostas, encerramento justificado e reabertura. Solicitante vê somente seus chamados; suporte/admin veem fila, sem ampliar acesso acadêmico. Suporte responde nos atribuídos; admin tem exceção explícita. Transações/versão e IDs idempotentes protegem concorrência e reenvio. Rascunhos locais, sem anexos/notificações.

Portal conectado separado da demonstração. Captação, recuperação e gestão completa ainda não integradas; sem deploy público/LLM. Modelos/migrações em backend/prisma.

## Ambiente e evidências
PostgreSQL dedicado em %LOCALAPPDATA%/CortexRuntime, porta 54329, SCRAM/loopback; sem serviço Windows. API 3001, Vite 5173. Retomada: scripts/iniciar-integracao.ps1 e backend/README.md. Não presumir processos ativos. Credenciais fictícias: .local-data/ACESSOS.md, ignoradas pelo Git.

10/10: builds, 11 testes HTTP anteriores + 9 de suporte, três suítes Chrome headless aprovados. Validados IDOR, papéis/contas revogados, CSRF/origem, atribuição concorrente, reenvio, texto inerte, persistência e mobile 390px. Relatórios: docs/chamados-2026-10-10.md e docs/seguranca-atendimento-2026-10-10.md. Evidências do suporte em docs/evidencias/2026-10-11 (data UTC). Não certifica ausência de vulnerabilidades.

## Segurança e documentação
Contrato: security/purple-team/agent.md; NVIDIA/NemoClaw cancelado. Auditor: 48 arquivos, falso positivo contextual no e-mail do seed. Sem revisão completa do histórico Git/CVEs/infra cloud neste marco. Materiais anteriores de segurança preservados fora do commit.

Documento integrado histórico: https://docs.google.com/document/d/1MYRpzwEH-NyoWuL4gF0ijMTJeBLSPuTyJjUj7EihBl8/edit . Não atualizado remotamente; snapshot em docs/documentacao-integrada-2026-10-02.md.

## Próximo passo
Prioridade proposta: gestão e métricas do atendimento. Especificação em docs/gestao-metricas-atendimento.md: gestor/equipe, SLA útil, ciclos, CSAT e dashboard. Ainda não implementados. Henry autorizou metas demonstrativas; proposta 09–17h seg–sex, 4h úteis para primeira resposta e 16h para resolução. Recuperação/captação continuam pendentes. Confirmar datas dos 90 dias e responsabilidades. Conferir branch/alterações antes de sincronizar; usar somente dados fictícios.
