@echo off
call powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0controle-servicos.ps1" -Action Stop
pause
