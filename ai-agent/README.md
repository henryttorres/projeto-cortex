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
