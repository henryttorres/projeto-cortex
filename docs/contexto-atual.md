# Contexto atual — Cortéx

Atualizado em 11/10/2026 (Bahia). Equipe: Henry, Eduardo, Joelly, Eduarda, Danilo e Luna. Responsabilidades ampliadas ainda propostas.

## Produto
React/TypeScript/Vite, identidade aplicada, Sora/Source Sans 3 locais, landing e portais demonstrativos separados do portal integrado. Guide.tsx orienta atendimento; sem IA. Storytelling de quatro imagens pendente.

NestJS/Prisma/PostgreSQL: acesso, agenda, comunicados, chamados, distribuição automática e indicadores persistidos. Atendente ativa disponibilidade (lease 5min, renovação em aba visível); distribuição por menor carga, limite automático cinco por pessoa. Sem vaga, aguarda. Encerramento libera capacidade. Papéis supervisor/coordinator adicionados: consolidado institucional; suporte vê métricas próprias e chamados atribuídos/próprios/livres. Uma única operação, sem cadastro de equipes ou hierarquia organizacional vinculada.

Ciclos registram início/primeira resposta/encerramento/metas/CSAT. Relatório por ciclos encerrados em 7/30/90 dias, conforme pedido de Henry. SLA inicial 4h e resolução 16h úteis, seg–sex 09–17h Bahia, sem feriados. TMA decorrido, CSAT/adesão, série diária e tabela. Reabertura preserva ciclo/nota anterior. Histórico antigo não é reconstruído artificialmente. CSAT apenas solicitante após conclusão.

## Ambiente e evidências
PostgreSQL em %LOCALAPPDATA%/CortexRuntime, porta 54329; API 3001, Vite 5173. Retomada: scripts/iniciar-integracao.ps1. Não presumir processos ativos. Credenciais fictícias em .local-data/ACESSOS.md; supervisor/coordenador usam senha local do seed. Sem deploy público.

11/10: builds aprovados; 11 testes HTTP base, 9 suporte e 7 operação aprovados; três suítes Chrome headless aprovadas, incluindo atribuição automática, CSAT e painel supervisor. Capturas desktop/mobile em docs/evidencias/2026-10-11. Operação testada em schema temporário isolado. Relatório: docs/operacao-metricas-2026-10-11.md.

## Segurança
Contrato security/purple-team/agent.md; NVIDIA/NemoClaw cancelado. Auditor: 55 arquivos, dois falsos positivos contextuais de e-mails no seed. Retentativas concorrentes corrigidas e verificadas. Sem pentest independente, revisão completa de CVEs/cloud/histórico Git. Materiais anteriores de segurança preservados fora do commit.

## Próximo passo
Gestão de equipes/membros, redistribuição e separação supervisor/coordenador por equipe; depois backlog/SLA ativo, metas/feriados editáveis. Recuperação/captação continuam pendentes. Documento Google histórico não atualizado nesta sessão. Confirmar datas dos 90 dias; preservar arquivos preexistentes e usar dados fictícios.
