@echo off
title Smart PME Finance - Poste Desktop Windows
cd /d "%~dp0"

echo ============================================================
echo   Lancement de Smart PME Finance - Poste Desktop (PyQt6)
echo ============================================================

set "PY_EXE=C:\Program Files\Python314\python.exe"
if not exist "%PY_EXE%" (
    set "PY_EXE=python"
)

"%PY_EXE%" apps\desktop-py\main.py
if errorlevel 1 (
    echo.
    echo Erreur lors du lancement avec %PY_EXE%.
    echo Tentative avec le python standard...
    python apps\desktop-py\main.py
    pause
)
