@echo off
setlocal

echo Tentando parar qualquer processo do projeto Cortex...
for /f "tokens=2" %%p in ('netstat -ano ^| findstr :4173 2^>nul') do (
    echo Encerrando processo na porta 4173: %%p
    taskkill /PID %%p /F
)

for /f "tokens=2" %%p in ('netstat -ano ^| findstr :5173 2^>nul') do (
    echo Encerrando processo na porta 5173: %%p
    taskkill /PID %%p /F
)

for /f "tokens=1" %%p in ('tasklist ^| findstr /i "vite" 2^>nul') do (
    echo Encerrando processo Vite: %%p
    taskkill /PID %%p /F
)

echo.
echo Servidor encerrado.
pause
