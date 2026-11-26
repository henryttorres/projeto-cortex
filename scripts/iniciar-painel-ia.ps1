function Start-CortexAiPanel {
  $projectRoot = Split-Path $PSScriptRoot -Parent
  $agentRoot = Join-Path $projectRoot 'ai-agent'
  $agentEnv = Join-Path $agentRoot 'cortex_agent/.env'
  $adk = Join-Path $agentRoot '.venv/Scripts/adk.exe'
  $localState = Join-Path $projectRoot '.local-data'
  $port = 8000
  . (Join-Path $PSScriptRoot 'servicos-cortex.ps1')

  if (!(Test-Path -LiteralPath $adk)) {
    throw 'Agente nao preparado. Siga ai-agent/README.md para criar o ambiente virtual e instalar as dependencias.'
  }
  if (!(Test-Path -LiteralPath $agentEnv)) {
    throw 'Arquivo ai-agent/cortex_agent/.env ausente. Crie-o a partir de .env.example e configure GOOGLE_API_KEY.'
  }

  $envLines = [IO.File]::ReadAllLines($agentEnv)
  $keyConfigured = $false
  foreach ($line in $envLines) {
    if ($line -match '^\s*GOOGLE_API_KEY\s*=\s*(.*?)\s*$') {
      $value = $matches[1].Trim().Trim('"').Trim("'")
      $keyConfigured = $value.Length -gt 0
      break
    }
  }
  if (!$keyConfigured) {
    throw 'GOOGLE_API_KEY nao configurada em ai-agent/cortex_agent/.env. O valor da chave nao sera exibido.'
  }

  $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  if ($listener) {
    $record = Get-CortexServiceRecord $localState 'ai'
    if (Test-CortexManagedService $record $listener[0]) {
      Write-Output "Painel de IA ja ativo: PID $($record.ProcessId), porta $port."
      return
    }
    throw "Porta $port ocupada (PID $($listener[0].OwningProcess)). Nao iniciei nem encerrei outro processo; use Abrir painel de IA se ele ja estiver ativo."
  }

  New-Item -ItemType Directory -Force $localState | Out-Null
  $process = Start-Process -FilePath $adk -ArgumentList @('web', '--host', '127.0.0.1', '--port', "$port") -WorkingDirectory $agentRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $localState 'ai-agent.log') -RedirectStandardError (Join-Path $localState 'ai-agent-error.log') -PassThru

  $deadline = (Get-Date).AddSeconds(30)
  do {
    Start-Sleep -Milliseconds 500
    $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($listener) {
      $listenerPid = $listener[0].OwningProcess
      $listenerProcess = Get-Process -Id $listenerPid -ErrorAction Stop
      $record = [ordered]@{
        Name = 'ai'
        ProcessId = $listenerPid
        Port = $port
        StartedAtUtc = $listenerProcess.StartTime.ToUniversalTime().ToString('o')
        ExpectedCommand = (Join-Path $agentRoot '.venv\Scripts\python.exe')
      }
      Save-CortexServiceRecord $localState $record
      Write-Output "Painel de IA ouvindo na porta $port (PID $listenerPid): http://127.0.0.1:$port/"
      return
    }
    $process.Refresh()
    if ($process.HasExited) {
      throw "O painel de IA encerrou com codigo $($process.ExitCode). Consulte .local-data/ai-agent-error.log."
    }
  } while ((Get-Date) -lt $deadline)

  throw "O painel de IA nao abriu a porta $port em 30 segundos. Consulte .local-data/ai-agent.log e ai-agent-error.log."
}

$ErrorActionPreference = 'Stop'
try {
  Start-CortexAiPanel
  exit 0
} catch {
  [Console]::Error.WriteLine("Falha ao iniciar painel de IA: $($_.Exception.Message)")
  exit 1
}
