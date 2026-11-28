param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$')]
  [string]$BugId,

  [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$')]
  [string]$BaseBranch = 'dev'
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$branch = "bugfix-$BugId"
$worktreeRoot = Join-Path $projectRoot '.worktrees'
$worktreePath = Join-Path $worktreeRoot $branch

git -C $projectRoot rev-parse --show-toplevel *> $null
if ($LASTEXITCODE -ne 0) { throw 'O diretorio do projeto nao e um repositorio Git.' }

git -C $projectRoot rev-parse --verify "$BaseBranch^{commit}" *> $null
if ($LASTEXITCODE -ne 0) { throw "A branch base '$BaseBranch' nao existe ou nao aponta para um commit." }

if (Test-Path -LiteralPath $worktreePath) {
  throw "A worktree ja existe: $worktreePath"
}

git -C $projectRoot show-ref --verify --quiet "refs/heads/$branch"
if ($LASTEXITCODE -eq 0) {
  throw "A branch '$branch' ja existe; escolha outro BugId."
}

New-Item -ItemType Directory -Path $worktreeRoot -Force | Out-Null
git -C $projectRoot worktree add --checkout -b $branch $worktreePath $BaseBranch
if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar a worktree isolada.' }

Write-Output "Worktree criada: $worktreePath"
Write-Output "Branch: $branch (base: $BaseBranch)"
Write-Output "Para iniciar: Set-Location '$worktreePath'"
