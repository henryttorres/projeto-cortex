# Estrutura — 11/10/2026

| Local | Função |
|---|---|
| README.md / docs/README.md | Entrada e índice |
| Cortex.code-workspace / COMECE-AQUI.md | Ambiente VS Code |
| frontend/src/App.tsx / index.css | Landing e demonstração |
| frontend/src/ConnectedPortal.tsx / connected-portal.css | Portal integrado |
| frontend/src/Communications.tsx / Tickets.tsx / Operations.tsx | Comunicados, atendimento e métricas |
| frontend/src/api.ts | Comunicação e sessão |
| backend/src | API e autorização |
| backend/prisma/schema.prisma / migrations | Modelo físico vigente e evolução |
| backend/test | Testes HTTP, operação e navegador |
| backend/bancodedados | SQL histórico; não aplicar sobre banco integrado |
| docs/evidencias / docs/marca | Capturas e identidade |
| scripts/iniciar-integracao.ps1 | Inicialização após preparo |
| referencias | Materiais antigos |

node_modules/dist são gerados. .env/.local-data são privados e ignorados. Materiais não rastreados, incluindo perfil Purple Team, não devem ser adicionados automaticamente.
