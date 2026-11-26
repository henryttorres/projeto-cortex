$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$runtime = Join-Path $env:LOCALAPPDATA 'CortexRuntime'
$localState = Join-Path $projectRoot '.local-data'
. (Join-Path $PSScriptRoot 'servicos-cortex.ps1')
New-Item -ItemType Directory -Force $localState | Out-Null
if (!(Test-Path (Join-Path $projectRoot 'backend/.env'))) { throw 'Prepare backend/.env conforme backend/README.md.' }
if (Test-Path (Join-Path $runtime 'data/PG_VERSION')) {
  & "$runtime/pgsql/bin/pg_ctl.exe" -D "$runtime/data" status *> $null
  if ($LASTEXITCODE -ne 0) {
    & "$runtime/pgsql/bin/pg_ctl.exe" -D "$runtime/data" -l "$localState/postgres.log" -w start
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL nao iniciou.' }
  }
}
$nodePath = (Get-Command node).Source
$entries = @(
  @{ Port=3001; File=(Join-Path $projectRoot 'backend/dist/main.js'); Working=(Join-Path $projectRoot 'backend'); Name='api'; Extra='--env-file=.env' },
  @{ Port=5173; File=(Join-Path $projectRoot 'frontend/node_modules/vite/bin/vite.js'); Working=(Join-Path $projectRoot 'frontend'); Name='web'; Extra='' }
)
$toStart = @()
foreach ($entry in $entries) {
  $listener = Get-CortexPortListener $entry.Port | Select-Object -First 1
  if ($listener) {
    $record = Get-CortexServiceRecord $localState $entry.Name
    if (Test-CortexManagedService $record $listener) {
      Write-Output "$($entry.Name) ja ativo: PID $($record.ProcessId), porta $($entry.Port)."
      continue
    }
    throw "Porta $($entry.Port) ocupada por processo nao reconhecido (PID $($listener.OwningProcess)). Confira a opcao 6 antes de iniciar."
  }
  if (!(Test-Path -LiteralPath $entry.File)) { throw "Execute o preparo/build de $($entry.Name)." }
  $toStart += $entry
}
foreach ($entry in $toStart) {
  $arguments = ($entry.Extra + ' "' + $entry.File + '"').Trim()
  $process = Start-Process -FilePath $nodePath -ArgumentList $arguments -WorkingDirectory $entry.Working -WindowStyle Hidden -RedirectStandardOutput "$localState/$($entry.Name).log" -RedirectStandardError "$localState/$($entry.Name)-error.log" -PassThru
  $record = [ordered]@{
    Name = $entry.Name
    ProcessId = $process.Id
    Port = $entry.Port
    StartedAtUtc = $process.StartTime.ToUniversalTime().ToString('o')
    ExpectedCommand = $entry.File
  }
  Save-CortexServiceRecord $localState $record
  Write-Output "$($entry.Name) iniciado: PID $($process.Id), porta $($entry.Port)."
}
foreach ($entry in $entries) {
  $record = Get-CortexServiceRecord $localState $entry.Name
  $deadline = (Get-Date).AddSeconds(30)
  $ready = $false
  do {
    $listener = Get-CortexPortListener $entry.Port | Select-Object -First 1
    if (Test-CortexManagedService $record $listener) {
      $ready = $true
      break
    }
    if (!(Get-Process -Id ([int]$record.ProcessId) -ErrorAction SilentlyContinue)) {
      throw "$($entry.Name) encerrou durante a inicializacao. Consulte .local-data/$($entry.Name)-error.log."
    }
    Start-Sleep -Milliseconds 500
  } while ((Get-Date) -lt $deadline)
  if (!$ready) { throw "$($entry.Name) nao ficou pronto em 30 segundos. Consulte .local-data/$($entry.Name).log." }
}
Write-Output 'Abra http://127.0.0.1:5173. Acessos de demonstracao em .local-data/ACESSOS.md.'
