# Plano de até 90 dias

Atualização: 11/10/2026. Janelas relativas ao início pactuado; data oficial precisa ser confirmada. Fases se sobrepõem, pois somar os máximos originais excederia 90 dias.

| Fase | Janela | Situação/próximo resultado | Responsabilidade proposta | Indicador de aceite |
|---|---|---|---|---|
| Frontend responsivo | Dias 1–30 | Identidade e portais construídos; validar futuras telas de gestão | Henry/Eduardo; Joelly/Luna na UX | Fluxos críticos desktop/mobile com evidências |
| Dados/API | Dias 15–45 | PostgreSQL integrado; implementar equipes/escopos/transferência | Henry/Eduardo; Danilo em testes | Migração e testes de isolamento aprovados |
| Área restrita/suporte | Dias 31–60 | Chamados e métricas de encerrados entregues; depois SLA aberto/metas | Henry/Eduardo; Danilo em testes; Eduarda nos requisitos | Fluxo completo e métricas verificáveis |
| Guia/IA | Dias 55–70 | Guia por botões existe; IA externa pendente | Henry; Joelly/Luna no roteiro | Encaminhamento e limites de acesso testados |
| Cloud/entrega | Dias 61–90 | Preparar publicação, segurança e apresentação | Henry/Eduardo na implantação; demais em documentação/testes/apresentação | Aplicação publicada, recuperação documentada, demonstração completa |

Responsabilidades ampliadas são propostas para os seis integrantes, ainda não acordadas. Requisitos, testes, documentação e apresentação também são entregas do projeto.

## Próxima sequência

1. Confirmar gestão exclusiva ADMIN versus ações operacionais dos demais.
2. Implementar [equipes/permissões](equipes-entidades-permissoes.md), migração e isolamento.
3. Construir gestão/consulta/transferência; validar desktop/mobile.
4. Implementar SLA aberto e metas ADMIN versionadas.
5. Documentar evidências em prod; promover após validação.
6. Priorizar recuperação de senha/captação, fechar escopo de IA e preparar deploy.

## Resumo para o time

Frontend com identidade e API persistindo login, agenda, comunicados e suporte estão construídos. Última entrega técnica: atribuição automática com disponibilidade e métricas dos ciclos encerrados (SLA inicial/resolução, TMA, CSAT e participação). Próximo marco: equipes com consulta restrita, gestão ADMIN e transferência auditada. Essa camada ainda não está implementada. A organização documental prepara a evolução sem antecipar sua conclusão.
