# Documentação do Cortéx

Atualização: 11/10/2026. Implementação conferida no commit `03b15d5`.

## Ordem de leitura

1. [README principal](../README.md): estado do produto.
2. [Plano de 90 dias](plano-90-dias.md): entregas e responsabilidades propostas.
3. [Entidades e permissões](equipes-entidades-permissoes.md): próximo marco, separado do que existe.
4. [Estrutura](estrutura-do-projeto.md) e [VS Code](../COMECE-AQUI.md).
5. [Fluxo Git](fluxo-git.md): validação e promoção.

## Evidências

| Entrega | Documento |
|---|---|
| Arquitetura inicial | [Fase 1](fase-1-arquitetura-e-fluxos.md), modelo conceitual histórico |
| Identidade | [Direção visual](marca/direcao-visual.md) |
| Landing responsiva | [Validação](validacao-2026-09-29.md) |
| Vídeo sem áudio | [Mídia](validacao-2026-10-02.md) |
| Login e agenda | [Integração](integracao-backend-2026-10-10.md) |
| Comunicados | [Relatório](comunicados-2026-10-10.md) |
| Chamados | [Relatório](chamados-2026-10-10.md), [segurança](seguranca-atendimento-2026-10-10.md) |
| Distribuição e indicadores | [Operação](operacao-metricas-2026-10-11.md) |

Datas identificam quando cada verificação ocorreu. Capturas ficam em `evidencias/`. Propostas não comprovam funcionalidades entregues. O [schema Prisma](../backend/prisma/schema.prisma) e migrações definem o banco vigente; SQL inicial em `backend/bancodedados` é histórico e não deve ser aplicado sobre o banco integrado.

A restrição de supervisor/coordenador por equipe ainda precisa ser implementada e testada. Os relatórios anteriores de gestão são propostas quando divergem do código atual.
