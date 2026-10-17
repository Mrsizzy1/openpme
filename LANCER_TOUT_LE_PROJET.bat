@echo off
title Smart PME Finance - Lanceur Principal
cd /d "%~dp0"

echo ====================================================================
echo             SMART PME FINANCE (OPENPME) - DEMARRAGE COMPLET
echo ====================================================================
echo.

echo [1/3] Demarrage du Serveur Backend API NestJS (Port 3001)...
start "Smart PME - API Backend (Port 3001)" cmd /k "npm run dev:api"

timeout /t 4 /nobreak >nul

echo [2/3] Demarrage de l'Application Web Vite (Port 5173)...
start "Smart PME - Web Frontend (Port 5173)" cmd /k "npm run dev:web"

timeout /t 3 /nobreak >nul

echo [3/3] Lancement de l'Application Desktop Windows (PyQt6)...
start "Smart PME - Poste Desktop Windows" cmd /k "python apps\desktop-py\main.py"

echo.
echo ====================================================================
echo  Tous les composants sont demarres !
echo  - Web : http://localhost:5173
echo  - API : http://localhost:3001/api/v1
echo  - Desktop : Fenetre native PyQt6 ouverte
echo ====================================================================
echo.
