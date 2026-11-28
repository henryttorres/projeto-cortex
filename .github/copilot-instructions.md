# Instrucoes do repositorio Cortéx

Estas instrucoes se aplicam a alteracoes neste repositorio. Antes de editar,
leia os arquivos relevantes e confirme o estado da branch e da arvore de trabalho.

## Escopo e governanca

- Para esta iniciativa, trabalhe somente na branch `dev`; nunca altere `main`.
- Preserve toda alteracao preexistente, inclusive arquivos nao rastreados. Nao
  reverta, mova ou apague arquivos sem necessidade e autorizacao explicita.
- Avance uma etapa por vez. Execute e confira o portao definido para a etapa
  atual antes de iniciar outra.
- Nao faca commit, push, deploy ou operacao irreversivel sem solicitacao explicita.
- Mantenha `.env`, `.venv`, `__pycache__`, `.adk`, `.worktrees` e `.local-data`
  fora do Git. Nunca imprima nem registre credenciais, tokens ou dados reais de
  estudantes.

## Engenharia

- Entenda o fluxo e o formato dos dados antes de escolher uma mudanca. Prefira a
  menor alteracao que resolva o problema, sem camadas ou abstracoes sem uso.
- Ao depurar, reproduza o sintoma, observe o estado real e corrija a origem do
  defeito; nao esconda falhas com retries ou valores padrao sem justificativa.
- Valide dados nas fronteiras (HTTP, arquivos de configuracao e ferramentas).
  Dentro do dominio, use tipos claros e mantenha regras de negocio independentes
  de detalhes de transporte.
- O NestJS/Prisma e o unico escritor duravel do PostgreSQL. O agente Python
  acessa dados somente por endpoints tipados e autenticados do NestJS.
- Preserve revisao humana, autorizacao por turma/disciplina e protecoes contra
  prompt injection e exposicao de dados pessoais. Essas garantias devem ser
  aplicadas em codigo, nao apenas em instrucoes de modelo.
- Divida trabalhos grandes em unidades pequenas. Para cada unidade, indique a
  evidencia de sucesso e execute a verificacao sobre o artefato real antes de
  prosseguir.
- Teste comportamento observavel, nao detalhes internos. Rode o menor teste que
  cobre a alteracao e relate claramente qualquer verificacao que nao foi feita.
- Mantenha leituras, saidas de comandos e mudancas focadas. Resuma evidencias
  extensas em vez de copiar grandes blocos para outros arquivos ou prompts.

## Interface e ambiente local

- Antes de alterar a navegacao, consulte [`docs/ui-feature-map.md`](../docs/ui-feature-map.md)
  e atualize-o junto com a interface quando necessario.
- O notebook de desenvolvimento tem memoria limitada. Mantenha modelos Ollama
  locais enxutos e nao baixe modelos grandes sem necessidade.
- Prefira os componentes e convencoes existentes em React, NestJS e ADK; nao
  adicione dependencias sem demonstrar que sao necessarias.

## Referencia de principios

As praticas acima sao formulacoes especificas do Cortéx, inspiradas em ideias
de engenharia do projeto [Cursor pstack](https://github.com/cursor/plugins/tree/main/pstack),
distribuido sob MIT. Este arquivo nao replica as instrucoes daquele projeto.
