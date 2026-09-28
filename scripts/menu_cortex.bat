@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "ROOT=%~dp0"
set "FRONTEND=%ROOT%frontend"
set "PORT=4173"
set "ALT_PORT=5173"
set "BASE_URL=http://localhost:%PORT%"

:menu
cls
echo =========================================================
 echo MENU DO PROJETO CORTEX
 echo =========================================================
 echo [1] Iniciar projeto
 echo [2] Abrir no navegador
 echo [3] Parar servidor
 echo [4] Ver status da porta
 echo [5] Sair
 echo =========================================================
set /p "CHOICE=Escolha uma opcao: "

if "%CHOICE%"=="1" goto iniciar
if "%CHOICE%"=="2" goto abrir
if "%CHOICE%"=="3" goto parar
if "%CHOICE%"=="4" goto status
if "%CHOICE%"=="5" exit /b 0

echo Opcao invalida.
ping -n 2 127.0.0.1 >nul
goto menu

:check_node
where node >nul 2>nul
if not errorlevel 1 goto check_pnpm

set "NODE_PATH=C:\Program Files\nodejs"
if exist "%NODE_PATH%\node.exe" (
    set "PATH=%NODE_PATH%;%PATH%"
    goto check_pnpm
)

echo Node.js nao foi encontrado.
echo Instale o Node.js LTS e tente novamente.
pause
exit /b 1

:check_pnpm
where pnpm >nul 2>nul
if not errorlevel 1 goto ok_env

where npm >nul 2>nul
if errorlevel 1 (
    echo npm nao encontrado. Instale o Node.js primeiro.
    pause
    exit /b 1
)

echo pnpm nao encontrado. Instalando pnpm...
call npm install -g pnpm@11
if errorlevel 1 (
    echo Falha ao instalar pnpm.
    pause
    exit /b 1
)

:ok_env
set "PATH=%APPDATA%\npm;%PATH%"
exit /b 0

:port_busy
set "PORT_STATUS=OCUPADA"
exit /b 0

:port_free
set "PORT_STATUS=DISPONIVEL"
exit /b 0

:check_port
set "PORT_STATUS=DISPONIVEL"
netstat -ano -p tcp | findstr /R ":%~1 " >nul
if not errorlevel 1 (
    call :port_busy
) else (
    call :port_free
)
exit /b 0

:iniciar
call :check_node
call :check_pnpm

for /f "tokens=2" %%p in ('netstat -ano -p tcp ^| findstr /R ":%PORT% " 2^>nul') do (
    echo Porta %PORT% ocupada. Encerrando processo antigo...
    taskkill /PID %%p /F >nul 2>&1
)

for /f "tokens=2" %%p in ('netstat -ano -p tcp ^| findstr /R ":%ALT_PORT% " 2^>nul') do (
    echo Porta %ALT_PORT% ocupada. Encerrando processo antigo...
    taskkill /PID %%p /F >nul 2>&1
)

for /f "tokens=1" %%p in ('tasklist ^| findstr /I "vite" 2^>nul') do (
    echo Encerrando processo Vite antigo: %%p
    taskkill /PID %%p /F >nul 2>&1
)

echo.
echo Preparando ambiente...
cd /d "%FRONTEND%"
call pnpm install --frozen-lockfile
if errorlevel 1 (
    echo Falha ao instalar dependencias.
    pause
    goto menu
)

echo.
echo Iniciando servidor em %BASE_URL%
call pnpm dev --host 0.0.0.0 --port %PORT%

echo.
echo Servidor encerrado.
pause
goto menu

:abrir
start "" "http://localhost:4173/"
if errorlevel 1 (
    echo Nao foi possivel abrir o navegador.
    pause
)
goto menu

:status
call :check_port %PORT%
if "%PORT_STATUS%"=="OCUPADA" (
    echo Porta %PORT% esta ocupada.
) else (
    echo Porta %PORT% esta livre.
)

call :check_port %ALT_PORT%
if "%PORT_STATUS%"=="OCUPADA" (
    echo Porta %ALT_PORT% esta ocupada.
) else (
    echo Porta %ALT_PORT% esta livre.
)

pause
goto menu

:parar
for /f "tokens=2" %%p in ('netstat -ano -p tcp ^| findstr /R ":4173 " 2^>nul') do (
    echo Encerrando processo da porta 4173: %%p
    taskkill /PID %%p /F >nul 2>&1
)

for /f "tokens=2" %%p in ('netstat -ano -p tcp ^| findstr /R ":5173 " 2^>nul') do (
    echo Encerrando processo da porta 5173: %%p
    taskkill /PID %%p /F >nul 2>&1
)

for /f "tokens=1" %%p in ('tasklist ^| findstr /I "vite" 2^>nul') do (
    echo Encerrando processo Vite: %%p
    taskkill /PID %%p /F >nul 2>&1
)

echo.
echo Servidor encerrado.
pause
goto menu
