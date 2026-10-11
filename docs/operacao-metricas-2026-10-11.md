# Distribuição automática e indicadores — 11/10/2026

Marco retomado após interrupção por limite de uso. Código anterior foi conferido;
os testes de operação não tinham sido gravados. Implementação validada localmente,
sem deploy público. Não é uma plataforma completa de gestão de funcionários.

## Entrega

- Disponibilidade explícita: atendente ativa **Receber chamados**, ou pausa.
- Distribuição por menor carga entre contas ativas com papel support e disponibilidade
  válida; até cinco chamados simultâneos na distribuição automática. Empate por ID;
  fila ordenada pela criação. O próprio solicitante não recebe seu chamado.
- Sem atendente/vaga, o chamado permanece aberto. Distribuição acontece na abertura,
  reabertura, liberação de vaga e renovação de disponibilidade, em lotes de 25.
- Disponibilidade expira em cinco minutos, renovada a cada minuto enquanto a aba
  está visível. Logout a remove. Não equivale a escala de trabalho ou presença real.
- Papéis de supervisor/coordenador e dashboard por ciclos encerrados no banco.
- CSAT opcional de 1–5 pelo solicitante após encerramento; notas 4/5 são satisfeitas.
  Avaliação repetida idêntica não duplica; mudança de nota ou autoria indevida é recusada.
- Reabrir gera novo ciclo, preservando o encerramento e a nota anteriores.

## Hierarquia implementada e limites

| Perfil | Fila/ação | Relatório |
|---|---|---|
| Solicitante | Seus chamados | Não acessa métricas de operação |
| Atendente | Próprios chamados atribuídos, seus pedidos e fila ainda livre | Somente ciclos encerrados por ele |
| Supervisor | Toda a operação e intervenção em chamados | Consolidado institucional |
| Coordenador | Mesmo alcance do supervisor neste MVP | Consolidado institucional |
| Administrador | Mantém alcance administrativo existente | Consolidado institucional |

Sem cadastro de equipes, vínculo supervisor→funcionário, gestão de escala ou tela
para conceder papéis. A hierarquia é de acesso, para **uma operação institucional**.
Não há isolamento entre departamentos/escolas. Perfis são provisionados no banco;
não há endpoint permitindo promover a própria conta. Atendente não vê chamado já
atribuído a colega; gestão mantém acesso. O fallback manual de assumir foi preservado.

Contas fictícias novas: `supervisor@demo.cortex.test` e
`coordenador@demo.cortex.test`. Usam a mesma senha fictícia local do seed, consultável
em `.local-data/ACESSOS.md`; não publicada no Git. Não são contas de pessoas reais.

## Medição

TicketCycle guarda início, primeira resposta, encerramento, responsável pela conclusão,
metas e versão de política, nota e data da avaliação. Não reconstruímos ciclos antigos
como se houvesse medição exata. Um chamado anterior pode começar a ter ciclos ao reabrir.

Política demonstrativa `demo-bahia-9-17-v1`: Bahia UTC−3, seg–sex 09–17h, sem
feriados/pausas. SLA inicial 240 minutos úteis; resolução 960. Fora do expediente
nada é acumulado: um ciclo inteiramente no domingo pode registrar zero minuto útil.
A primeira resposta exige mensagem humana da equipe; atribuição automática não conta.
Uma resposta de encerramento pode ser também a primeira resposta.

**Mudança em relação à proposta anterior:** conforme pedido de Henry, a população
do relatório são os ciclos **encerrados no período**, não todos os ciclos iniciados.
Isso não é um painel de SLA vencido dos chamados ainda abertos. A interface explicita
o recorte; acompanhamento preventivo do backlog é um próximo incremento.

| Indicador | Cálculo desta versão |
|---|---|
| Encerrados | Número de ciclos concluídos nos últimos 7/30/90 dias |
| SLA primeira resposta | Ciclos com primeira resposta dentro de 240 minutos úteis / ciclos com primeira resposta registrada |
| SLA resolução | Ciclos encerrados dentro de 960 minutos úteis / ciclos encerrados |
| TMA decorrido | Média útil entre primeira resposta e encerramento; inclui esperas, não mede trabalho ativo |
| Tempo de resolução | Média útil entre início e encerramento |
| CSAT | Notas 4/5 / avaliações válidas; mostra tamanho da amostra |
| Adesão | Avaliações / ciclos encerrados elegíveis |

Sem denominador, mostrar Sem dados. Não confundir isso com duração zero. Autoavaliação
de ciclo concluído pelo próprio solicitante não é permitida. Agrupamento individual
é pelo responsável pelo encerramento, explicitado no título; não mede contribuição
parcial quando a gestão intervém. Gráfico diário usa data da Bahia e inclui os dois
dias parciais de uma janela móvel. Limite de 10.000 ciclos por consulta com erro
explícito, sem truncar resultado silenciosamente.

## API

- GET/POST `/api/operations/availability`: atendente consulta/renova/pausa a própria
  disponibilidade; corpo `{ available: boolean }`, sem ID arbitrário de funcionário.
- GET `/api/operations/metrics?days=30`: 7/30/90; escopo calculado no servidor,
  parâmetros extras de agente/equipe são rejeitados.
- POST `/api/tickets/:id/rating`: `{ cycleId, score }`; apenas solicitante do ciclo.

Sessão, CSRF, origem e DTOs continuam ativos. Transações serializáveis protegem
distribuição, capacidade e reenvio. Teste concorrente revelou esgotamento prematuro
de retentativas; corrigido com cinco tentativas limitadas e intervalo crescente.
Conflito persistente retorna 409, permitindo repetir sem duplicar a abertura.

## Verificações

- Build API e frontend aprovados na retomada.
- 11 testes HTTP anteriores e 9 de suporte aprovados.
- 7 testes de operação: calendário, concorrência/capacidade, fechamento, CSAT,
  autorização, fórmulas com datas controladas e preservação de ciclos/reabertura.
- Três suítes de navegador aprovadas: acesso/agenda, comunicados e suporte;
  esta última agora inclui distribuição automática, CSAT e dashboard do supervisor.
- Capturas `docs/evidencias/2026-10-11/indicadores-desktop.png` e
  `indicadores-mobile.png`; mobile 390px sem overflow horizontal da página.
- Os valores nas capturas vieram de atendimento sintético concluído durante o
  teste. Esses registros são removidos ao final; o painel pode ficar vazio.

Operação é testada em schema PostgreSQL temporário, evitando que roteamento global
altere a fila normal. O teste valida o identificador interno antes de remover somente
esse schema. Não executar os testes em produção.

Purple Team: auditor examinou 55 arquivos e apontou duas interpolações de e-mail
fictício no seed (linhas 13/27), ambas dados em consultas Prisma, sem construção de SQL.
Não foram encontrados segredos pelo escopo heurístico; isso não prova ausência.
Código de teste usa SQL de limpeza com identificador gerado internamente e validado,
sem entrada do usuário. Não houve nova análise de CVEs, infraestrutura cloud, histórico
Git completo ou pentest independente. Sem NVIDIA/NemoClaw ou serviços remotos de análise.

## Como demonstrar e continuar

1. Abrir localhost; em uma sessão Suporte, ativar Receber chamados.
2. Em outra sessão/navegador, Ana abre um chamado. Suporte atualiza a fila e recebe
   o registro automaticamente; manter a aba visível para renovar disponibilidade.
3. Suporte responde e encerra; Ana avalia. Supervisor abre Indicadores e atualiza.
4. Consultar 7/30/90 dias. Suporte também pode consultar apenas seus resultados.

Próximo marco: gestão de equipes/membros, redistribuição de chamados de funcionários
afastados e separação supervisor/coordenador por equipe. Depois, backlog/SLA ativo,
metas editáveis e feriados. Recuperação de acesso/captação permanecem pendentes.
Rollback: reverter aplicação e reconstruir, preservando tabelas aditivas para não
perder histórico. Não remover banco/dados automaticamente.
