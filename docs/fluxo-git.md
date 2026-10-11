# Fluxo Git: prod → main

Decisão de Henry em 11/10/2026: **prod recebe integração inicial; main recebe entregas validadas**. O nome prod representa a etapa de validação neste projeto; não indica deploy público automático.

1. Conferir pasta, `git status -sb` e `git fetch origin`; preservar alterações/stashes.
2. Trabalhar em prod ou integrar nela branches de trabalho sem reescrever histórico. Commits em português e arquivos explicitamente selecionados.
3. Publicar origin/prod após conferir divergência; nunca force push.
4. Documentação: conferir links/consistência. Código: build/testes pertinentes. Comportamento: fluxos/autorização. Banco: migração/integridade. Registrar commit testado e limitações.
5. Revisar prod → main com evidências antes da promoção. Não declarar requisito planejado como implementado.
6. Sincronizar outras cópias somente após revisar mudanças locais.

Não foram configurados rulesets/checks obrigatórios remotos nesta organização. O fluxo é convenção documentada; não há pipeline de deploy público.

Na conferência, origin/main e origin/prod estavam cinco commits atrás de 03b15d5. A integração em prod preserva hashes por avanço direto. A antiga branch de trabalho não precisa ser apagada. main permanece separada para a promoção validada.
