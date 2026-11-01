REM OCC - Object Control Center
REM @author Cleiton Otávio de Sousa
REM @version 1.0.0
@echo off
title OCC - Object Control Center
cd /d "%~dp0"

echo ========================================================
echo   Iniciando OCC - Object Control Center
echo ========================================================
echo.

echo [1/2] Iniciando Backend Proxy (Express na porta 3001)...
start "OCC Backend (Porta 3001)" cmd /k "cd /d "%~dp0backend" && npm run dev"

ping -n 3 127.0.0.1 >nul

echo [2/2] Iniciando Frontend (Vite/React na porta 5173)...
start "OCC Frontend (Porta 5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ========================================================
echo   Servicos iniciados em janelas dedicadas:
echo     - Backend:  http://localhost:3001
echo     - Frontend: http://localhost:5173
echo.
echo   Para encerrar a aplicacao, basta fechar as janelas
echo   abertas do Backend e do Frontend.
echo ========================================================
echo.
echo Abrindo o frontend no navegador em instantes...
ping -n 3 127.0.0.1 >nul
start http://localhost:5173
