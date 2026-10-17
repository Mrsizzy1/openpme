@echo off
setlocal enabledelayedexpansion

title Smart PME Finance - Restauration de la Base de Donnees
echo ========================================================
echo    Smart PME Finance - Restauration d'Urgence (Disaster)
echo ========================================================
echo.

if "%~1"=="" (
    echo [USAGE] Glissez-deposez un fichier .sql de sauvegarde sur ce script,
    echo         ou lancez : restore_db.bat chemin\vers\backup.sql
    echo.
    pause
    exit /b 1
)

set BACKUP_FILE=%~1
set DB_NAME=smart_pme_finance
set DB_USER=postgres
set DB_HOST=localhost
set DB_PORT=5432

echo [ATTENTION] Cette operation va restaurer la base '%DB_NAME%'
echo depuis le fichier : %BACKUP_FILE%
echo.
set /p CONFIRM="Confirmez-vous la restauration ? (O/N) : "
if /i not "%CONFIRM%"=="O" (
    echo Operation annulee.
    exit /b 0
)

echo.
echo [%TIME%] Restauration en cours...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%BACKUP_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCES] La base de donnees a ete restauree avec succes.
) else (
    echo.
    echo [ERREUR] Echec lors de la restauration.
)

pause
