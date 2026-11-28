# Agente Cortéx (ADK)

Agente modular Python com Google ADK. O `root_agent` direciona consultas para
subagentes de acervo, lacunas, diagnóstico, plano de aula e tutoria socrática.
Respostas sobre o acervo usam trechos indexados no NestJS e devem citar seus
identificadores; os planos permanecem sugestões para revisão humana.

## Preparar o ambiente no Windows

Na raiz do repositório, execute:

```powershell
py -m venv ai-agent\.venv
ai-agent\.venv\Scripts\python.exe -m pip install -r ai-agent\requirements.txt
Copy-Item ai-agent\cortex_agent\.env.example ai-agent\cortex_agent\.env
```

Edite `ai-agent\cortex_agent\.env` e preencha `GOOGLE_API_KEY` com uma chave criada no Google AI Studio. Configure também `CORTEX_BACKEND_URL` e `CORTEX_INTERNAL_TOKEN`; o token deve ser igual ao configurado em `backend\.env`. O arquivo `.env` é ignorado pelo Git; não compartilhe nem faça commit de chaves ou tokens.

No backend, copie `backend\.env.example` para `backend\.env` e configure o mesmo
`CORTEX_INTERNAL_TOKEN`. O NestJS deve estar disponível em `http://127.0.0.1:3001`
e o serviço ADK na porta 8000.

## Roteamento hibrido de modelos

O coordenador usa `ollama_chat/qwen2.5:3b` localmente via LiteLLM/Ollama para
roteamento e triagem. Os especialistas pedagogicos usam `gemini-3.8-flash`.
Configure `CORTEX_MODEL_PROVIDER=hybrid`, `OLLAMA_API_BASE` e `OLLAMA_MODEL` em
`cortex_agent\.env`; mantenha Ollama ativo e o modelo local baixado antes de
iniciar o ADK. A chave `GOOGLE_API_KEY` continua necessaria para os especialistas.
As dependencias fixam uma versao LiteLLM compativel com o extra do Google ADK.

O `POST /api/ai/assist` continua restrito a docentes e administradores. O campo
opcional `studentId` e validado contra a turma ativa; o agente recebe apenas
contexto pedagogico minimizado, sem nome nem identificador do estudante. As
consultas internas usam `CORTEX_INTERNAL_TOKEN` e sao somente de leitura.

## Executar

A partir da raiz:

```powershell
Set-Location ai-agent
.\.venv\Scripts\adk.exe run cortex_agent
```

Para abrir a interface web do ADK:

```powershell
Set-Location ai-agent
.\.venv\Scripts\adk.exe web --port 8000
```

Acesse `http://localhost:8000` e selecione `cortex_agent`. Rode o comando `web`
a partir de `ai-agent`, que é a pasta que contém o agente. A rota de assistência
do portal usa a API de execução ADK (`/run`) e cria sessões temporárias por pedido.

O acervo local armazena texto e `embeddingJson` como JSON para busca lexical. Não
é necessário instalar `pgvector`; embeddings vetoriais e índices HNSW ficam para
uma etapa futura.

## Seeds e diagnostico isolado

As cinco seeds sintéticas podem ser verificadas sem chamar Gemini, Ollama ou
gravar no backend:

```powershell
Set-Location ai-agent
.\.venv\Scripts\python.exe -m cortex_agent.evals.run_seed_evals --all
.\.venv\Scripts\python.exe -m cortex_agent.evals.run_seed_evals --seed '#teste1'
```

O relatório JSON inclui resultado, justificativas, latência e `office_trace`.
Essas verificações exercitam regras determinísticas e fixtures locais; não
representam uma avaliação de respostas geradas por um modelo nem persistem
lacunas no NestJS.

Para criar uma worktree isolada de diagnóstico a partir da raiz:

```powershell
.\scripts\run-bugger-worktree.ps1 -BugId exemplo
```

O script cria `.worktrees/bugfix-exemplo` e a branch `bugfix-exemplo`, sem
alterar a worktree atual.
