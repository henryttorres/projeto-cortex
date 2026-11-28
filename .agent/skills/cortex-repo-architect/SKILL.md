---
name: cortex-repo-architect
description: Mapear e alterar o Cortéx com mudancas pequenas, limites explicitos e verificacoes reproduziveis.
---

# Cortex repository architect

Use esta skill para mudancas de arquitetura, integracao entre camadas ou
alteracoes que afetem varias partes do Projeto Cortéx. As instrucoes de
repositorio em `.github/copilot-instructions.md` continuam obrigatorias.

## Antes de mudar

1. Confirme que a branch ativa e `dev`; leia `git status` e preserve tudo que ja
   estava modificado ou nao rastreado.
2. Siga os imports, contratos HTTP, modelos de dados e fluxos de UI envolvidos.
   Consulte o mapa da interface em [docs/ui-feature-map.md](../../../docs/ui-feature-map.md).
3. Separe fatos observados de hipoteses. Para defeitos, reproduza o caso e
   localize a primeira decisao incorreta antes de propor o ajuste.
4. Declare o formato dos dados que atravessa cada fronteira e quem e
   responsavel por validar, autorizar, persistir e apresentar esses dados.

## Durante a mudanca

- Mantenha o escopo curto e elimine caminhos mortos antes de acrescentar novas
  camadas. Modele estados que se repetem ou ramificam muito em tipos ou
  estruturas explicitas.
- Valide entrada externa na fronteira e mantenha a logica central testavel sem
  depender de framework ou transporte.
- Preserve NestJS/Prisma como escritor exclusivo do banco. O agente Python deve
  usar os clientes HTTP internos autenticados; nao importar nem conectar Prisma
  ou PostgreSQL no agente.
- Torne comandos de setup seguros para repeticao quando possivel. Nao sobrescreva
  configuracao ou estado local existente para simplificar uma inicializacao.
- Mantenha trabalho dividido por etapa. Se o portao atual falhar, corrija ou
  documente o bloqueio antes de seguir para a proxima etapa.
- Para diagnosticos de UI, registre a rota/tela, perfil, seletores, estado e
  dados de teste que permitem repetir o fluxo. Nao use dados reais de estudantes.

## Verificacao e entrega

- Execute a verificacao que observa o comportamento requerido, alem de lint,
  build ou analise estatica quando forem os seletores existentes do projeto.
- Confira o diff e o estado do repositorio depois das mudancas. Nao declare
  sucesso com base apenas em arquivos gerados, timestamps ou uma compilacao que
  nao exercita o comportamento.
- Relate o que mudou, quais verificacoes passaram e o que permanece sem teste.
- Nao faca commit, push ou deploy sem pedido explicito. Nesta iniciativa, nao
  saia da branch `dev`.

## Principios de trabalho

Esta skill usa formulacoes proprias para o Cortéx, inspiradas em praticas do
[Cursor pstack](https://github.com/cursor/plugins/tree/main/pstack): reduzir
complexidade, respeitar fronteiras, corrigir a causa inicial, dividir a entrega
em unidades verificaveis e limitar contexto a evidencias uteis. Nao copie texto
de skills externas para este arquivo.
