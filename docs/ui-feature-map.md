# Mapa de interface Cortéx

Este mapa descreve a UI observada no codigo e separa funcionalidades futuras de
rotas que ja existem. A aplicacao atual e uma SPA com telas escolhidas por estado
React; `ConnectedPortal` nao cria URLs diferentes para cada secao.

## Entrada e navegacao atual

### Fluxo de entrada

[`App.tsx`](../frontend/src/App.tsx) restaura a sessao e seleciona uma tela entre
`landing`, `signup`, `login`, `recovery`, `profiles` e `portal`. Uma sessao
autenticada abre [`ConnectedPortal.tsx`](../frontend/src/ConnectedPortal.tsx).
Sem sessao, a navegacao e controlada por callbacks e estado local, nao por
React Router.

### Portal conectado

`ConnectedPortal` mantem a secao atual, o contexto academico selecionado, dados
carregados, erros, avisos e o estado de rascunho. A selecao de contexto usa
`#real-context`: docentes e administradores escolhem uma turma; outros perfis
academicos escolhem um estudante.

| Secao em estado | Rotulo visivel | Acesso observado |
|---|---|---|
| `agenda` | Agenda | Perfis academicos; secao inicial dos demais perfis |
| `communications` | Comunicados | Perfis academicos |
| `teacher-dashboard` | Painel docente | Professor ou administrador |
| `ai-panel` | Acervo e IA | Professor ou administrador |
| `cortex-office` | Escritório IA | Professor ou administrador |
| `support` | Atendimento | Disponivel no menu do portal |
| `metrics` | Indicadores | Suporte, supervisor, coordenador, diretor ou administrador |
| `service` | Secretaria e equipes | Disponivel no menu do portal |

O perfil de professor abre inicialmente `teacher-dashboard`; suporte,
supervisao, coordenacao e direcao abrem `support`; os demais comecam em
`agenda`. A navegacao e desabilitada enquanto um componente filho mantem um
rascunho ativo. O menu tambem oferece sair da conta.

## Painel docente

[`TeacherDashboard.tsx`](../frontend/src/TeacherDashboard.tsx) recebe `classId`
e `className` do portal. Ao abrir ou atualizar, busca disciplinas, perguntas e
rascunhos da turma.

| Area | Seletores e acoes | Estados e resultado |
|---|---|---|
| Cabecalho | Atualizar painel | Carregamento, erro e aviso |
| Disciplinas | Campo `#subject-name`; botao Adicionar disciplina; seletor `#teacher-subject` | Lista da turma; mensagem quando vazia |
| Caderno externo | Campo `#notebook-link`; Salvar referencia | Link NotebookLM e aviso de que nao indexa o acervo |
| Perguntas | Lista por estudante, disciplina e horario; campo de resposta por pergunta | Contadores recebidas/aguardando/respondidas; resposta ou formulario |
| Planejamento | Seletor de disciplina e campos de titulo, objetivos, materiais, atividades e avaliacao | Salva como rascunho; publicacao exige checkbox de revisao e confirmacao explicita |

Erros de sessao expirada encerram a sessao; demais erros sao apresentados no
painel. As operacoes de gravacao mostram estado ocupado e aviso de sucesso.

## Acervo e IA

[`AiPanel.tsx`](../frontend/src/AiPanel.tsx) recebe a turma do portal. A
disciplina e escolhida em `#ai-subject`; sem disciplina cadastrada, a UI orienta
a cria-la no Painel docente.

1. **Acervo:** seleciona arquivo `.txt` ou `.md` (ate 64 KB), ou cola texto
   (ate 16.000 caracteres), informa titulo e origem e adiciona trechos a
   `/classes/:classId/rag-chunks`.
2. **Lacunas:** escolhe `duvida_recorrente`, `tentativa_cola` ou
   `erro_conceitual`, descreve o sinal pedagogico e registra em
   `/classes/:classId/learning-gaps`.
3. **Diagnostico:** solicita a geracao e apresenta resumo, recomendacoes,
   indicadores e autoria.
4. **Assistente docente:** envia a pergunta para `/ai/assist`, mostra a resposta
   como sugestao para revisao e lista citacoes `[chunkId]` quando disponiveis.

Os estados visiveis incluem carregamento, salvamento, erro, aviso, resposta,
diagnostico e lista de lacunas. Trocar de disciplina limpa a resposta anterior.
A UI alerta para nao registrar nomes ou dados pessoais nas lacunas.

## Escritorio IA

[`CortexOffice.tsx`](../frontend/src/CortexOffice.tsx) implementa a secao
`cortex-office` para professores e administradores. A planta apresenta seis
salas, conectores SVG, inspetor de sala, modelo/mecanismo ativo, console para
cinco seeds, dialogo sintetico de referencia, justificativas, historico
persistido e eventos recebidos por SSE.

O escritorio divide a planta em duas alas:

| Ala | Sala prevista | Agente(s) previstos |
|---|---|---|
| Operacao ao vivo | Recepcao | Coordinator / root |
| Operacao ao vivo | Seguranca e supervisao | Security e Supervisor |
| Operacao ao vivo | Inteligencia do aluno | Customer |
| Operacao ao vivo | Sala de aula | Professor |
| Bastidores e QA | Laboratorio de simulacao | Personas |
| Bastidores e engenharia | Oficina | Bugger |

### Controles e estados

- Planta de seis salas com sala selecionada, sala ativa no turno e conectores
  SVG; a responsividade adapta o grid para telas menores.
- Inspetor com papel, modelo/mecanismo e eventos recentes; estados distinguem
  conexao, reconexao e indisponibilidade do stream.
- SSE de transicoes e veredito do supervisor: `APPROVED`, `BLOCKED` ou
  `REVISION_REQUIRED`.
- Console para `#teste1` a `#teste5`, com fixture sintetica, justificativas,
  `office_trace` e historico persistido no PostgreSQL.
- Slots estaticos em `frontend/public/office/agents/` e
  `frontend/public/office/rooms/`. Avatar SVG/CSS e fallback; assets opcionais
  podem substitui-lo. Videos sao carregados somente na sala ativa ou
  selecionada para limitar uso de memoria.
- Paleta do escritorio: fundo `#0A192F`, destaque `#00F0FF` e texto claro,
  sem dependencia 3D pesada.

### Fluxo

1. Professor entra no portal autenticado e escolhe a turma.
2. Abre **Escritório IA** e observa o estado do stream.
3. Seleciona uma sala para consultar seu papel, modelo e telemetria.
4. Dispara uma seed registrada; a UI apresenta a entrada/fixture, transicoes,
   justificativas e veredito.
5. Se o stream ou API falhar, apresenta o erro sem inventar atividade ou
   resultado persistido.

O frontend usa somente a API autenticada do NestJS: `POST /api/ai/office/run-seed`,
`GET /api/ai/office/state` e `GET /api/ai/office/stream`. O frontend nao acessa
PostgreSQL. Os testes de seed sao fixtures deterministicas locais e nao gravam
lacunas pedagogicas.
