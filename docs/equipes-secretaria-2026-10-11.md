# Entrega: equipes e secretaria escolar — 11/10/2026

## Implementado

- Hierarquia: atendente, supervisor, coordenador, diretor e ADMIN. Conta pode ter mais de um papel; o vínculo operacional é TeamMember, sem duplicar credenciais em Employee.
- Equipes fictícias Centro e Norte. Supervisor/coordenador do seed vinculados ao Centro; diretor às duas; atendentes distintos por unidade. ADMIN possui visão institucional.
- Distribuição automática só escolhe atendentes ativos/disponíveis da equipe, com capacidade global de cinco. Chamados novos entram no Centro, equipe padrão do seed.
- Supervisor consulta equipe/indicadores, sem responder/encerrar como gestor. Coordenador/diretor consultam suas equipes e decidem encaminhamentos do respectivo setor. ADMIN gerencia equipes/vínculos e transferências, além de decidir qualquer encaminhamento.
- Atendente responsável cria cadastro de aluno para o responsável que abriu o chamado. GuardianLink nasce não verificado; somente ADMIN aprova e libera consulta. Não cadastra contas privilegiadas nem vincula um estudante já existente por ID arbitrário.
- Encaminhamento para coordenação, direção ou ADMIN, com justificativa, prazo e decisão aprovada/indeferida. Não há encerramento enquanto a decisão estiver pendente.
- Prazo demonstrativo: 960 minutos úteis a partir do encaminhamento, seg–sex 09–17h Bahia, sem feriados. Significa dois dias de oito horas, não 48 horas corridas.
- Transferência ADMIN troca equipe, libera atribuição, redistribui e mantém início/metas do ciclo. Relatório do ciclo aberto acompanha equipe de destino; ciclos já encerrados mantêm equipe histórica.
- Operações da secretaria têm UUID idempotente, controle de versão e registro de autor/motivo no histórico do chamado.
- Interface Secretaria e equipes disponível a todos: solicitante consulta os próprios registros; funcionários veem dados autorizados; ADMIN tem criação de equipe e inclusão/remoção de vínculos de contas existentes. Remover funcionário com chamado ativo é bloqueado.

## Banco e API

Migração aditiva `202610110003_equipes`. Entidades novas SupportTeam e TeamMember; Ticket recebe equipe, encaminhamento e referência de cadastro; TicketCycle recebe equipe histórica. Papéis incluem director. Legados sem equipe não são reatribuídos artificialmente; ADMIN pode transferir os ainda abertos.

| API | Controle |
|---|---|
| GET /teams | Equipes no alcance do perfil |
| GET /teams/accounts | ADMIN, contas operacionais ativas; não devolve credenciais |
| POST /teams | ADMIN cria equipe |
| POST /teams/:id/members | ADMIN altera vínculo; papel precisa existir na conta |
| GET /service | Até 100 chamados autorizados, pendentes primeiro |
| POST /service/:id | Cadastro, encaminhamento, decisão ou transferência conforme papel, equipe e estado |

Solicitante abre o chamado pela aba Atendimento; a aba Secretaria acompanha as decisões. Documentos são textos demonstrativos registrados no histórico, sem PDF, assinatura ou validade oficial. Este é um fluxo escolar de demonstração, não integração ao sistema da instituição de referência.

## Referência consultada

Portal do Aluno Uninassau, sessão já aberta pelo usuário, em 11/10: menu Solicitações separa acadêmico, alterações acadêmicas e documentações (declarações/históricos, meus documentos); atendimento separado. Apenas navegação de leitura, sem enviar pedidos. Não foram copiados dados acadêmicos/pessoais para o código, seed ou evidências. Referência: https://aluno.uninassau.edu.br/Aluno/MeuCursoHome.aspx?IsFuturo=0.

## Validação executada

- Builds TypeScript/API e TypeScript/Vite aprovados.
- 11 testes base, 9 suporte, 7 operação, 6 hierarquia: **33 testes aprovados**. Operação/hierarquia em schemas temporários isolados, com dados sintéticos.
- Quatro suítes Chrome headless: agenda/acesso, comunicados, suporte e secretaria. A última cobre cadastro → ADMIN → encaminhamento → direção → consulta do responsável, desktop/mobile sem overflow.
- Evidências: `evidencias/2026-10-11/secretaria-desktop.png` e `secretaria-mobile.png`.
- Auditor Purple Team: 61 arquivos, três avisos médios heurísticos. Dois são e-mails interpolados no seed e um é URL de API perto de JSX select; não são SQL dinâmico. Sem alertas altos nesta cobertura. Não revisa CVEs/histórico/cloud e não equivale a pentest completo.

Os testes detectaram e corrigiram interferência de um cadastro anterior na aprovação documental posterior; também foi restringido assumir chamado próprio/fora da equipe e removida a permissão operacional implícita de supervisor/coordenador.

## Limites e próximos passos

1. Políticas/feriados editáveis e SLA de primeira resposta/resolução de todo o backlog; hoje o prazo visível é o de encaminhamento.
2. Cadastro completo/convite de funcionários e trilha administrativa específica para mudanças de equipes; hoje os funcionários vêm das contas provisionadas e a auditoria por chamado cobre a secretaria.
3. Emissão documental em arquivo com validação apropriada, modelos e assinatura; atual emissão é demonstrativa textual.
4. Paginação além de 100 solicitações/20 movimentações da secretaria. Histórico completo continua na aba Atendimento.
5. Recuperação de senha, captação persistida e deploy cloud com backup/restauração.

Reversão: reverter código de forma coordenada com a API; manter as colunas/tabelas aditivas e seus dados. Não apagar migrações aplicadas nem usar schema antigo para descartar dados. Nenhum deploy público realizado.
