@echo off
title Smart PME Finance - Poste Desktop Windows
cd /d "%~dp0"
echo ============================================================
echo   Lancement de Smart PME Finance - Poste Desktop (PyQt6)
echo ============================================================
python apps\desktop-py\main.py
if errorlevel 1 (
    echo.
    echo Une erreur est survenue lors de l'execution.
    pause
)
