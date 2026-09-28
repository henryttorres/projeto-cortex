# Estrutura do Repositório – Cortéx Instituto de Aprendizagem

Este documento serve como guia operacional para localizar, manter e rastrear as áreas do projeto de forma clara.

## Repositório oficial

- GitHub: https://github.com/henryttorres/projeto-cortex

## Visão geral

```md
projeto-cortex/
├── .gitignore
├── ai_engine/
│   ├── fine-tuning/
│   ├── prompts/
│   └── rag/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   └── services/
│   ├── .env.example
│   └── package.json
├── docs/
│   ├── arquitetura-v0.1.md
│   ├── banco-de-dados/
│   ├── estrutura-do-projeto.md
│   └── readme-demonstracao.md
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── routes/
│   │   └── services/
│   └── package.json
├── index.html
├── readme.md
└── .gitignore
```

## Objetivo de cada área

### `docs/`
Armazena documentação técnica, arquitetura, banco de dados e materiais de apresentação.

### `ai_engine/`
Reúne os artefatos de IA, incluindo prompts, segmentação de conhecimento e materiais de fine-tuning.

### `backend/`
Responsável pela lógica do servidor, API, regras de negócio e integração com IA.

### `frontend/`
Responsável pela interface do usuário e fluxo de navegação do sistema.

## Quando usar cada arquivo

- `readme.md`: guia prático do repositório e organização geral.
- `docs/readme-demonstracao.md`: apresentação institucional e conceitual para GitHub ou pitch.
- `docs/arquitetura-v0.1.md`: visão geral da arquitetura da solução.
- `docs/banco-de-dados/`: diagramas, modelos e scripts de apoio.

## Regras de manutenção

- Manter nomes de pastas estáveis para evitar divergência entre documentação e código.
- Atualizar a documentação sempre que uma área receber nova estrutura ou novo módulo.
- Manter `.gitignore` ativo para evitar o versionamento de arquivos sensíveis.
