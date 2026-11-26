param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('Status', 'Stop')]
  [string]$Action
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$localState = Join-Path $projectRoot '.local-data'
. (Join-Path $PSScriptRoot 'servicos-cortex.ps1')
$services = @(
  @{ Name = 'ai'; Label = 'Painel de IA'; Port = 8000 },
  @{ Name = 'web'; Label = 'Site'; Port = 5173 },
  @{ Name = 'api'; Label = 'API'; Port = 3001 }
)

function Show-ServiceStatus {
  foreach ($service in $services) {
    $listener = Get-CortexPortListener $service.Port | Select-Object -First 1
    $record = Get-CortexServiceRecord $localState $service.Name
    if (!$listener) {
      Write-Output "$($service.Label): parado (porta $($service.Port) livre)"
    } elseif (Test-CortexManagedService $record $listener) {
      Write-Output "$($service.Label): Cortex ativo (porta $($service.Port), PID $($record.ProcessId))"
    } else {
      Write-Output "$($service.Label): porta $($service.Port) ocupada por processo nao reconhecido (PID $($listener.OwningProcess)); nao sera encerrado"
    }
  }

  $database = Get-CortexPortListener 54329 | Select-Object -First 1
  if ($database) {
    Write-Output "PostgreSQL: ativo na porta 54329 (PID $($database.OwningProcess)); banco e dados preservados"
  } else {
    Write-Output 'PostgreSQL: parado na porta 54329'
  }
}

if ($Action -eq 'Status') {
  Show-ServiceStatus
  exit 0
}

$managed = @()
foreach ($service in $services) {
  $record = Get-CortexServiceRecord $localState $service.Name
  $listener = Get-CortexPortListener $service.Port | Where-Object { $record -and $_.OwningProcess -eq [int]$record.ProcessId } | Select-Object -First 1
  if (Test-CortexManagedService $record $listener) {
    $managed += @{ Service = $service; Record = $record }
  } elseif ($listener) {
    Write-Output "$($service.Label): PID $($listener.OwningProcess) nao foi reconhecido como processo gerenciado; preservado."
  }
}

if (!$managed.Count) {
  Write-Output 'Nenhum servico Cortex gerenciado ativo. Nenhum processo foi encerrado.'
  exit 0
}

Write-Output 'Serao encerrados somente os servicos do Cortex identificados abaixo:'
foreach ($item in $managed) {
  Write-Output " - $($item.Service.Label), PID $($item.Record.ProcessId)"
}
Write-Output 'O PostgreSQL e o banco local nao serao encerrados nem apagados.'
$confirmation = Read-Host 'Operacoes em andamento podem ser interrompidas. Confirma? (S/N)'
if ($confirmation -notin @('S', 's', 'SIM', 'sim')) {
  Write-Output 'Cancelado. Nenhum servico foi encerrado.'
  exit 0
}

foreach ($item in $managed) {
  $service = $item.Service
  $record = $item.Record
  $listener = Get-CortexPortListener $service.Port | Where-Object { $_.OwningProcess -eq [int]$record.ProcessId } | Select-Object -First 1
  if (!(Test-CortexManagedService $record $listener)) {
    Write-Output "$($service.Label): identidade mudou durante a parada; preservado."
    continue
  }

  Stop-Process -Id ([int]$record.ProcessId) -ErrorAction Stop
  $deadline = (Get-Date).AddSeconds(10)
  while ((Get-Process -Id ([int]$record.ProcessId) -ErrorAction SilentlyContinue) -and (Get-Date) -lt $deadline) {
    Start-Sleep -Milliseconds 250
  }
  if (Get-Process -Id ([int]$record.ProcessId) -ErrorAction SilentlyContinue) {
    Write-Output "$($service.Label): PID $($record.ProcessId) ainda ativo; registro mantido para nova verificacao."
    continue
  }

  Remove-Item -LiteralPath (Join-Path $localState "service-$($service.Name).json") -Force
  Write-Output "$($service.Label): encerrado (PID $($record.ProcessId))."
}

Write-Output 'PostgreSQL continua ativo; os dados locais foram preservados.'
