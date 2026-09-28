@echo off
setlocal EnableExtensions
:menu
cls
echo ==== CORTEX - DESENVOLVIMENTO LOCAL ====
echo [1] Iniciar site - porta 5173
echo [2] Abrir site no navegador
echo [3] Como parar o servidor
echo [4] Ver conexoes nas portas 5173 e 4173
echo [5] Sair
choice /c 12345 /n /m "Escolha: "
if errorlevel 5 exit /b 0
if errorlevel 4 goto status
if errorlevel 3 goto parar
if errorlevel 2 goto abrir
call "%~dp0rodar_cortex.bat"
pause
goto menu
:abrir
call "%~dp0abrir_cortex_navegador.bat"
goto menu
:parar
call "%~dp0parar_cortex.bat"
goto menu
:status
echo Conexoes TCP - esta listagem nao identifica sozinha o projeto.
netstat -ano -p tcp | findstr /R /C:":5173 " /C:":4173 "
pause
goto menu
