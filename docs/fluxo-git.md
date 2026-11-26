# Fluxo Git: dev → prod → main

Decisão de Henry em 26/11/2026: **dev é a branch de desenvolvimento; prod recebe as entregas para validação; main recebe somente o que foi validado**. O nome `prod` representa a etapa de validação neste projeto; não indica deploy público automático.

1. Conferir pasta, branch, `git status -sb` e `git fetch origin`; preservar alterações locais.
2. Desenvolver e fazer commits em `dev`, selecionando explicitamente os arquivos necessários. Não incluir segredos, `.env`, dados locais ou arquivos temporários.
3. Publicar `origin/dev` após conferir a divergência; nunca force push. Abrir PR **`dev` → `prod`** para revisão e integração. Não abrir PR direto de `dev` para `main`.
4. Integrar em `prod` sem reescrever histórico. Validar documentação, build/testes pertinentes, fluxos, autorização e migrações conforme o escopo. Registrar o commit validado e as limitações.
5. Somente depois de aprovada a validação em `prod`, abrir PR **`prod` → `main`**. Revisar e promover; `main` recebe apenas o estado validado. Não declarar requisito planejado como implementado.
6. Sincronizar outras cópias somente após revisar mudanças locais.

**Exceção documental:** somente o panorama de status do README principal pode ser atualizado diretamente em `main`, com data e separação explícita entre estado validado e trabalho em andamento. Isso não promove código ou funcionalidades. Sincronize essa atualização documental com `dev` no próximo ciclo para evitar divergência.

Não foram configurados rulesets/checks obrigatórios remotos nesta organização. O fluxo é convenção documentada; não há pipeline de deploy público. `dev`, `prod` e `main` não avançam automaticamente juntos. Antes da promoção, confirme que `prod` contém o estado de `dev` que foi testado; nunca pule `prod`.
