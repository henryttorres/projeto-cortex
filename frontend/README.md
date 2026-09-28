# Cortéx — protótipo local de baixa fidelidade

Código exportado do Figma Make em 28/09/2026, a partir do arquivo Wireframe Cortéx V0.1, cuja versão 4 inclui os fluxos internos V0.2.

## Executar

Requisitos: Node.js 24 e pnpm 11 (ambiente usado na validação).

```sh
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

Abrir http://127.0.0.1:5173/. Para verificar os tipos e gerar a distribuição:

```sh
pnpm build
```

O build executa TypeScript antes do Vite. `pnpm preview` serve o resultado em http://127.0.0.1:4173/.

## Como navegar

Landing → Entrar/Já tenho cadastro → Explorar portal de demonstração → perfil fictício.

Aluno, responsável, professor, administração e suporte compartilham dados somente na memória da mesma aba. Recarregar reinicia comunicados, chamados e respostas. Não usar dados pessoais ou senhas reais. Não há autenticação, API, armazenamento persistente ou IA conectada.

## Origem e adaptação

- `src/` foi copiada da exportação, preservando a landing e os perfis.
- Configuração Vite substituída por configuração local sem plugins privados do Make.
- HTML possui idioma pt-BR, título e orientação noindex para o protótipo.
- Versões das dependências preservadas pelo lockfile exportado.
- Histórico de respostas, revisão do encerramento e limpeza de rascunhos evoluídos localmente.
- A pasta original em Downloads e o arquivo Figma permanecem intactos. Alterações locais não sincronizam automaticamente com o Make.
- O `referencias/landing-antiga.html` é uma referência anterior; a aplicação atual está nesta pasta.

Evidências e roteiro: [validação de 28/09](../docs/validacao-2026-09-28.md).
