@echo off
title Smart PME Finance - Lancement du Poste Desktop
echo ========================================================
echo   Smart PME Finance - Demarrage du Poste Desktop PyQt6
echo ========================================================
echo.

python apps\desktop-py\main.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERREUR] Impossible de lancer le client Desktop Python.
    echo Verifiez que PyQt6 est installe avec : pip install PyQt6 PyQt6-WebEngine
    pause
)
