function Get-CortexServiceRecord {
  param([string]$StateDirectory, [string]$Name)
  $path = Join-Path $StateDirectory "service-$Name.json"
  if (!(Test-Path -LiteralPath $path)) { return $null }
  try {
    return Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
  } catch {
    return $null
  }
}

function Get-CortexPortListener {
  param([int]$Port)
  return @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Test-CortexManagedService {
  param($Record, $Listener)
  if (!$Record -or !$Record.ProcessId -or !$Record.Port -or !$Record.StartedAtUtc -or !$Record.ExpectedCommand -or !$Listener) { return $false }
  if ([int]$Listener.OwningProcess -ne [int]$Record.ProcessId -or [int]$Listener.LocalPort -ne [int]$Record.Port) { return $false }

  $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($Record.ProcessId)" -ErrorAction SilentlyContinue
  if (!$process -or !$process.CommandLine) { return $false }
  if ($process.CommandLine.IndexOf([string]$Record.ExpectedCommand, [StringComparison]::OrdinalIgnoreCase) -lt 0) { return $false }

  $running = Get-Process -Id $Record.ProcessId -ErrorAction SilentlyContinue
  if (!$running) { return $false }
  try {
    $recordStart = [DateTimeOffset]::Parse($Record.StartedAtUtc).UtcDateTime
  } catch {
    return $false
  }
  return [Math]::Abs(($running.StartTime.ToUniversalTime() - $recordStart).TotalSeconds) -le 2
}

function Save-CortexServiceRecord {
  param([string]$StateDirectory, $Record)
  $Record | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $StateDirectory "service-$($Record.Name).json") -Encoding UTF8
}
