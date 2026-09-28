# Cortéx Instituto de Aprendizagem

> Registro histórico: conteúdo preservado do antigo `readme.md` para resolver a colisão com `README.md` no Windows. Caminhos locais e estrutura descritos abaixo eram uma proposta anterior; consulte [estrutura-do-projeto.md](estrutura-do-projeto.md) para os arquivos efetivamente versionados e o README principal para o estado atual.

## Visão geral

O Cortéx Instituto de Aprendizagem é uma solução educacional com foco em atendimento inteligente, organização escolar e suporte operacional para instituições de ensino. A estrutura foi organizada para separar documentação, inteligência artificial, backend e frontend, facilitando a rastreabilidade, manutenção e evolução do projeto.

## Repositório GitHub

- URL do repositório: https://github.com/henryttorres/projeto-cortex
- Diretório local do projeto: `C:\Users\henry\OneDrive\Área de Trabalho\DEV MODE\projeto_escola_cortex`
- Comando de configuração padrão:



> O arquivo `.gitignore` está ativo para proteger dados sensíveis, segredos e artefatos locais do ambiente de desenvolvimento, especialmente por se tratar de uma plataforma educacional.




## Estrutura atual do projeto

A estrutura abaixo reflete o workspace real, sem duplicidades e sem nomes de pastas obsoletos.

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
│   └── banco-de-dados/
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

## Observações sobre organização

- O nome `ai_engine/rag_knowledge` estava desatualizado e foi corrigido para `ai_engine/rag/`, que é o nome real atual do diretório.
- A estrutura de `backend/src` e `frontend/src` está organizada de acordo com a proposta inicial do projeto.
- `docs/banco-de-dados/` foi mantido como diretório de apoio para diagramas ER, modelos e rotinas SQL.
- A pasta `.gitignore` continua ativa na raiz para evitar versionamento de arquivos sensíveis.

## Diretórios principais

### `docs/`
Armazena a documentação inicial do projeto, incluindo arquitetura, banco de dados, fluxos de negócio e decisões técnicas.

### `ai_engine/`
Contém os prompts e as fontes de conhecimento para o módulo de inteligência artificial do sistema.

### `backend/`
Responsável pela API, regras de negócio, autenticação, persistência de dados e integração com a IA.

### `frontend/`
Responsável pela camada visual do sistema e pela experiência do usuário em web e portais por perfil.

## Observações

- A estrutura foi pensada para facilitar a rastreabilidade do projeto em diferentes camadas.
- O diretório de documentação deve ser atualizado sempre que houver mudanças de arquitetura, requisitos ou integração.
- O arquivo `.gitignore` deve continuar ativo para evitar o versionamento de arquivos sensíveis e ambiente local.
