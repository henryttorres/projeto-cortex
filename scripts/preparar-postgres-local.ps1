$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$runtimeRoot = Join-Path $env:LOCALAPPDATA 'CortexRuntime'
$pgBin = Join-Path $runtimeRoot 'pgsql/bin'
$localState = Join-Path $projectRoot '.local-data'
$pgData = Join-Path $runtimeRoot 'data'
if (!(Test-Path (Join-Path $pgBin 'initdb.exe'))) { throw 'Extraia os binários oficiais PostgreSQL em .local-tools/postgres.' }
if (Test-Path (Join-Path $pgData 'PG_VERSION')) { throw 'Banco existente: use iniciar-integracao.ps1. Nenhum dado foi alterado.' }
if (Test-Path (Join-Path $projectRoot 'backend/.env')) { throw 'Configuração existente: preservar .env e preparar o banco manualmente.' }
New-Item -ItemType Directory -Force $localState | Out-Null
$adminPassword = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
$appPassword = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
$demoPassword = 'Cortex-' + [guid]::NewGuid().ToString('N').Substring(0,16) + '!'
$pwFile = Join-Path $localState 'init-password.tmp'
[IO.File]::WriteAllText($pwFile, $adminPassword)
try {
  & "$pgBin/initdb.exe" -D $pgData -U cortex_admin -A scram-sha-256 --pwfile=$pwFile -E UTF8 --locale=C
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao inicializar PostgreSQL.' }
} finally { Remove-Item -LiteralPath $pwFile -ErrorAction SilentlyContinue }
Add-Content -LiteralPath (Join-Path $pgData 'postgresql.conf') -Value "`nlisten_addresses = '127.0.0.1'`nport = 54329"
& "$pgBin/pg_ctl.exe" -D $pgData -l (Join-Path $localState 'postgres.log') -w start
if ($LASTEXITCODE -ne 0) { throw 'Falha ao iniciar PostgreSQL.' }
$env:PGPASSWORD = $adminPassword
try {
  # Valores gerados localmente, sem entrada externa; senha não aparece na linha de comando.
  "CREATE ROLE cortex LOGIN PASSWORD '$appPassword' NOSUPERUSER NOCREATEDB NOCREATEROLE; CREATE DATABASE cortex OWNER cortex;" | & "$pgBin/psql.exe" -h 127.0.0.1 -p 54329 -U cortex_admin -d postgres -v ON_ERROR_STOP=1
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar banco da aplicação.' }
} finally { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
$envText = "DATABASE_URL=postgresql://cortex:$appPassword@127.0.0.1:54329/cortex?schema=public`nPORT=3001`nWEB_ORIGIN=http://127.0.0.1:5173`nNODE_ENV=development`nDEMO_PASSWORD=$demoPassword`n"
[IO.File]::WriteAllText((Join-Path $projectRoot 'backend/.env'), $envText)
[IO.File]::WriteAllText((Join-Path $localState 'postgres-admin.txt'), $adminPassword)
[IO.File]::WriteAllText((Join-Path $localState 'ACESSOS.md'), "# Acessos fictícios locais`n`nAplicação: http://127.0.0.1:5173`n`nContas: ana@demo.cortex.test, lucas@demo.cortex.test, marina@demo.cortex.test, admin@demo.cortex.test, suporte@demo.cortex.test`n`nSenha fictícia compartilhada: $demoPassword`n`nSomente desenvolvimento. Não reutilize em produção. Não publicar este arquivo.`n")
Write-Output 'PostgreSQL local configurado. Credenciais somente nos arquivos locais ignorados pelo Git.'
