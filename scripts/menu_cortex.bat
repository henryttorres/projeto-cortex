@echo off
setlocal EnableExtensions
:menu
cls
echo ==== CORTEX - DESENVOLVIMENTO LOCAL ====
echo [1] Iniciar site + API
echo [2] Iniciar painel de IA
echo [3] Iniciar tudo - site, API e painel de IA
echo [4] Abrir site no navegador
echo [5] Abrir painel de IA no navegador
echo [6] Status dos servicos e do banco
echo [7] Parar site, API e painel de IA (mantem dados)
echo [8] Sair
choice /c 12345678 /n /m "Escolha: "
if errorlevel 8 exit /b 0
if errorlevel 7 goto parar
if errorlevel 6 goto status
if errorlevel 5 goto abrir_ia
if errorlevel 4 goto abrir_site
if errorlevel 3 goto iniciar_tudo
if errorlevel 2 goto iniciar_ia
goto iniciar_site

:iniciar_site
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar-integracao.ps1"
if errorlevel 1 (
  pause
  goto menu
)
start "" "http://127.0.0.1:5173/"
echo Site aberto no navegador padrao.
pause
goto menu

:iniciar_ia
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar-painel-ia.ps1"
if errorlevel 1 (
  pause
  goto menu
)
start "" "http://127.0.0.1:8000/"
echo Painel de IA aberto no navegador padrao.
pause
goto menu

:iniciar_tudo
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar-integracao.ps1"
if errorlevel 1 (
  pause
  goto menu
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar-painel-ia.ps1"
if errorlevel 1 (
  start "" "http://127.0.0.1:5173/"
  echo Site aberto; confira a mensagem acima para resolver o painel de IA.
  pause
  goto menu
)
start "" "http://127.0.0.1:5173/"
start "" "http://127.0.0.1:8000/"
echo Site e painel de IA abertos no navegador padrao.
pause
goto menu

:abrir_site
call "%~dp0abrir_cortex_navegador.bat"
goto menu

:abrir_ia
start "" "http://127.0.0.1:8000/"
goto menu

:parar
call "%~dp0parar_cortex.bat"
goto menu

:status
call powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0controle-servicos.ps1" -Action Status
pause
goto menu
