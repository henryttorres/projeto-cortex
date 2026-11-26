---
name: cortex-repo-architect
description: Audita, mapeia visualmente e organiza a estrutura de arquivos, branches e commits do Projeto Córtex sem executar ações destrutivas sem aprovação explícita.
---

# Skill: Organizador de Repositório e Governança Git (Projeto Córtex)

## Princípios de Operação
1. **Visualizar antes de agir:** Sempre gerar mapa estrutural (Mermaid/árvore) conectando código ativo, dependências e histórico de commits antes de propor mudanças.
2. **Fundamentação obrigatória:** Toda sugestão de manter, mover ou remover um arquivo deve citar evidência concreta (import ativo, rota, configuração de build ou histórico Git).
3. **Segurança e Reversibilidade:** Nunca apagar arquivos diretamente sem confirmação explícita do usuário. Priorizar commits atômicos e isolamento em branch dedicada (ex: `chore/repo-organization`) antes de integrar na `dev` ou `main`.
4. **Arquitetura Alvo do Córtex:**
   - `frontend/`: Aplicação web (React/TypeScript/Vite)
   - `backend/`: API, regras de negócio e banco (NestJS/Prisma/PostgreSQL)
   - `ai-agent/`: Serviço multiagente em Python (ADK)
   - `docs/`: Documentação arquitetural e especificações
   - `scripts/`: Automação e utilitários de ambiente
   - `referencias/`: Materiais de apoio curados (sem código solto)
5. **Higiene de Versionamento:** Garantir que ambientes virtuais (`.venv`), caches (`__pycache__`, `.adk`) e segredos (`.env`) nunca sejam versionados.

## Workflow de Auditoria
1. Escanear árvore de arquivos excluindo `node_modules/`, `.venv/`, `.git/`
2. Mapear imports e dependências (cadeia `main → App → módulos → api → backend`)
3. Cruzar com `git ls-files` para identificar rastreados vs locais
4. Analisar branches e histórico de commits
5. Gerar diagrama Mermaid + árvore anotada
6. Classificar em MANTER / REORGANIZAR / REMOVER com fundamentação
7. Propor commits atômicos em branch isolada
8. Aguardar autorização explícita antes de executar

## Grafo de Dependências Ativo (Referência)
```
main.tsx → App.tsx → { ConnectedPortal, Guide, LearningVideo }
ConnectedPortal → api.ts → fetch /api/* → backend/app.ts
app.ts Module → { auth, school, communications, tickets, operations, teams }
                → { prisma.service, access.service }
routing.ts → usado por tickets.ts + operations.ts
schema.prisma → gera PrismaClient → prisma.service.ts
ai-agent/agent.py → root_agent → tutor_socratico (ADK)
```
