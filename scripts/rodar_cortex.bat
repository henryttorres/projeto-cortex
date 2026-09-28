@echo off
setlocal EnableExtensions
set "APP_DIR=%~dp0..\frontend"
set "RUNTIME=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies"
set "PATH=%PATH%;C:\Program Files\nodejs;%APPDATA%\npm;%RUNTIME%\node\bin;%RUNTIME%\bin\fallback"
if not exist "%APP_DIR%\package.json" (
  echo Pasta frontend nao encontrada ao lado de scripts.
  exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
  echo Instale Node.js 24 e abra novamente o terminal.
  exit /b 1
)
where pnpm.cmd >nul 2>nul
if errorlevel 1 (
  echo pnpm nao encontrado. Configure pnpm 11 antes de iniciar.
  exit /b 1
)
pushd "%APP_DIR%"
if errorlevel 1 exit /b 1
if not exist "node_modules\.bin\vite.cmd" (
  call pnpm.cmd install --frozen-lockfile
  if errorlevel 1 (
    popd
    exit /b 1
  )
)
echo Iniciando Cortex em http://127.0.0.1:5173/ . Para parar, use Ctrl+C nesta janela.
echo Se a porta estiver ocupada, encerre a outra instancia antes de tentar novamente.
call pnpm.cmd dev --host 127.0.0.1 --port 5173 --open
set "RESULT=%ERRORLEVEL%"
popd
exit /b %RESULT%
