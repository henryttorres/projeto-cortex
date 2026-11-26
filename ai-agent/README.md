# Agente Cortéx (ADK)

Ambiente local isolado para desenvolver o agente Python com Google ADK. O `root_agent` encaminha dúvidas de aprendizagem ao `tutor_socratico`, que conduz o aluno pelas etapas Definir, Selecionar, Criar, Conferir e Aplicar.
O protótipo usa o modelo `gemini-3.8-flash`, conforme configurado no agente.

Esta primeira versão não consulta o acervo de professores nem registra lacunas. O tutor solicita material ao aluno quando necessário e não inventa citações; as integrações serão adicionadas em etapas posteriores.

O teste live dos cenários do agente ainda não foi validado: a API Gemini retornou erros 503 e 429. Portanto, não há confirmação de execução bem-sucedida desses cenários. O roadmap aprovado — incluindo painel integrado, RAG sem dependência inicial de pgvector e ponte via NestJS — está descrito no [README principal](../README.md#ia-estado-e-próximos-passos); essas funcionalidades ainda não existem.

## Preparar o ambiente no Windows

Na raiz do repositório, execute:

```powershell
py -m venv ai-agent\.venv
ai-agent\.venv\Scripts\python.exe -m pip install -r ai-agent\requirements.txt
Copy-Item ai-agent\cortex_agent\.env.example ai-agent\cortex_agent\.env
```

Edite `ai-agent\cortex_agent\.env` e preencha `GOOGLE_API_KEY` com uma chave criada no Google AI Studio. O arquivo `.env` e ignorado pelo Git; não compartilhe nem faça commit da chave.

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

Acesse `http://localhost:8000` e selecione `cortex_agent`. Rode o comando `web` a partir de `ai-agent`, que e a pasta que contem o agente.
