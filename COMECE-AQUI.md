# Cortéx no VS Code

Abra **Cortex.code-workspace** por Arquivo → Abrir Workspace do Arquivo. O título mostra o caminho para distinguir cópias.

1. Confira `git status -sb`: integração em **prod**. Preserve mudanças/stashes.
2. Máquina nova: [preparo da API](backend/README.md) e `pnpm --dir frontend install --frozen-lockfile`.
3. Ambiente preparado: tarefa **Cortéx: Iniciar integração local**. Inicia banco portátil existente/API/Vite; recusa portas ocupadas.
4. Abra http://127.0.0.1:5173. Acessos fictícios em .local-data/ACESSOS.md (privado).
5. Edite conforme [estrutura](docs/estrutura-do-projeto.md). Landing em App.tsx; portal integrado em ConnectedPortal.tsx e módulos.
6. Execute builds/testes pertinentes. Reinicie API após recompilar; Vite atualiza frontend.

Terminal abre na raiz. Tarefas têm diretório próprio. Nenhuma inicia automaticamente ou instala extensões. Dados da API persistem; a demonstração antiga continua simulada.

## Cópias locais

O print mostra projeto_escola_cortex, main*, possivelmente outra cópia modificada. Não resetar, apagar ou aplicar pull nela sem revisar. Esta sessão trabalha em `C:\Users\henry\OneDrive\Documentos\ChatGPT\Projeto Cortéx`. Abra seu workspace para acessar os arquivos atuais.

Use Vite/API; Live Server não atende fluxos integrados. O script inicia processos em segundo plano e informa PIDs; verifique a identidade antes de encerrá-los. Logs em .local-data.

Consulte [prod → main](docs/fluxo-git.md) e o [índice documental](docs/README.md).
