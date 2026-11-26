# Fluxo Git: dev → prod → main

Decisão de Henry em 26/11/2026: **dev é a branch de desenvolvimento; prod recebe as entregas para validação; main recebe somente o que foi validado**. O nome `prod` representa a etapa de validação neste projeto; não indica deploy público automático.

1. Conferir pasta, branch, `git status -sb` e `git fetch origin`; preservar alterações locais.
2. Desenvolver e fazer commits em `dev`, selecionando explicitamente os arquivos necessários. Não incluir segredos, `.env`, dados locais ou arquivos temporários.
3. Publicar `origin/dev` após conferir a divergência; nunca force push.
4. Integrar `dev` em `prod` sem reescrever histórico. Validar documentação, build/testes pertinentes, fluxos, autorização e migrações conforme o escopo. Registrar o commit validado e as limitações.
5. Revisar e promover `prod` → `main` somente após a validação. Não declarar requisito planejado como implementado.
6. Sincronizar outras cópias somente após revisar mudanças locais.

Não foram configurados rulesets/checks obrigatórios remotos nesta organização. O fluxo é convenção documentada; não há pipeline de deploy público. `dev`, `prod` e `main` não avançam automaticamente juntos.

Use pull requests ou integração revisada quando disponíveis. Antes de promover, confirme que `prod` contém o estado de `dev` que foi testado; não promova commits de `dev` diretamente para `main` sem a validação definida acima.
