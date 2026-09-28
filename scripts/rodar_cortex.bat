@echo off
setlocal

set "NODE_DIR=C:\Program Files\nodejs"
set "APP_DIR=%~dp0frontend"
set "PORT=4173"
set "URL=http://localhost:%PORT%"

where node >nul 2>nul
if errorlevel 1 (
    set "PATH=%NODE_DIR%;%PATH%"
)

where node >nul 2>nul
if errorlevel 1 (
    echo Node.js nao foi encontrado em C:\Program Files\nodejs.
    echo Instale o Node.js LTS e tente novamente.
    pause
    exit /b 1
)

where pnpm >nul 2>nul
if errorlevel 1 (
    echo pnpm nao encontrado. Instalando...
    call npm install -g pnpm@11
)

cd /d "%APP_DIR%"

echo.
echo Instalando dependencias...
call pnpm install --frozen-lockfile

echo.
echo Abrindo o projeto em %URL%
start "" "%URL%"

echo Iniciando projeto React...
call pnpm dev --host 0.0.0.0 --port %PORT%

if errorlevel 1 (
    echo.
    echo Falha ao iniciar o projeto.
    pause
    exit /b 1
)
