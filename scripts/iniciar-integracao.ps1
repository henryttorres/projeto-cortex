$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$runtime = Join-Path $env:LOCALAPPDATA 'CortexRuntime'
$localState = Join-Path $projectRoot '.local-data'
New-Item -ItemType Directory -Force $localState | Out-Null
if (!(Test-Path (Join-Path $projectRoot 'backend/.env'))) { throw 'Prepare backend/.env conforme backend/README.md.' }
if (Test-Path (Join-Path $runtime 'data/PG_VERSION')) {
  & "$runtime/pgsql/bin/pg_ctl.exe" -D "$runtime/data" status *> $null
  if ($LASTEXITCODE -ne 0) {
    & "$runtime/pgsql/bin/pg_ctl.exe" -D "$runtime/data" -l "$localState/postgres.log" -w start
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL não iniciou.' }
  }
}
$nodePath = (Get-Command node).Source
$entries = @(
  @{ Port=3001; File=(Join-Path $projectRoot 'backend/dist/main.js'); Working=(Join-Path $projectRoot 'backend'); Name='api'; Extra='--env-file=.env' },
  @{ Port=5173; File=(Join-Path $projectRoot 'frontend/node_modules/vite/bin/vite.js'); Working=(Join-Path $projectRoot 'frontend'); Name='web'; Extra='' }
)
foreach ($entry in $entries) {
  if (Get-NetTCPConnection -LocalPort $entry.Port -State Listen -ErrorAction SilentlyContinue) { throw "Porta $($entry.Port) ocupada. Confira o processo existente antes de iniciar." }
  if (!(Test-Path -LiteralPath $entry.File)) { throw "Execute o preparo/build de $($entry.Name)." }
}
foreach ($entry in $entries) {
  $arguments = ($entry.Extra + ' "' + $entry.File + '"').Trim()
  $process = Start-Process -FilePath $nodePath -ArgumentList $arguments -WorkingDirectory $entry.Working -WindowStyle Hidden -RedirectStandardOutput "$localState/$($entry.Name).log" -RedirectStandardError "$localState/$($entry.Name)-error.log" -PassThru
  Write-Output "$($entry.Name) iniciado: PID $($process.Id), porta $($entry.Port)."
}
Write-Output 'Abra http://127.0.0.1:5173. Acessos fictícios em .local-data/ACESSOS.md.'
