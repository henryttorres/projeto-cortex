# Cortéx no VS Code

Abra **Cortex.code-workspace** por Arquivo → Abrir Workspace do Arquivo. A barra de título mostra o caminho da cópia em uso.

## Rotina

1. Primeira vez: Terminal → Executar Tarefa → **Cortéx: 1. Instalar dependências**.
2. Trabalhar: Terminal → Executar Tarefa → **Cortéx: 2. Iniciar site**.
3. Abra o endereço do terminal: normalmente http://127.0.0.1:5173/.
4. Edite `frontend/src/App.tsx` (telas) e `frontend/src/index.css` (estilos). Salvar atualiza a página.
5. Antes de entregar, **Ctrl+Shift+B** executa a verificação TypeScript e o build.
6. Para parar, use Ctrl+C no terminal da tarefa. Não execute dois servidores na mesma porta.

Nenhuma tarefa inicia automaticamente. O workspace não instala extensões nem muda configurações globais. No Windows, adiciona ao PATH dos novos terminais um fallback para Node/pnpm do Codex, se existir. Outra máquina precisa de Node.js 24 e pnpm 11 instalados.

## Onde está cada coisa

| Local | Uso |
|---|---|
| `frontend/src/App.tsx` | Telas e interações do protótipo |
| `frontend/src/index.css` | Aparência e responsividade |
| `frontend/index.html` | Entrada da aplicação React; servido pelo Vite |
| `frontend/package.json` | Comandos e dependências; expanda para ver arquivos de configuração agrupados |
| `docs/` | Arquitetura, entidades e validação |
| `referencias/landing-antiga.html` | HTML anterior, preservado como referência |
| `frontend/dist/` | Resultado gerado do build; não editar |

Dependências, cache e build estão ocultos no Explorer para simplificar a navegação, mas continuam no disco. O lockfile está agrupado sob package.json, não apagado.

## Live Server

Para desenvolvimento use **Iniciar site**. O Live Server só serve o build já gerado: execute **Verificar e gerar build** primeiro. O workspace aponta a raiz do Live Server para `frontend/dist`. A opção **Visualizar build** usa o Vite Preview em http://127.0.0.1:4173/ e é a alternativa sem extensão.

## Git e cópias do projeto

Trabalhe sempre na mesma cópia local por sessão; confira o caminho na barra de título. Stashes são backups separados: não aplicar nem apagar sem revisar o conteúdo. Commits ficam no repositório; o Figma não recebe alterações locais automaticamente.

O protótipo usa dados fictícios em memória. Atualizar a página reinicia os dados.
