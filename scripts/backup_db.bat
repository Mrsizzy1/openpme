@echo off
setlocal enabledelayedexpansion

title Smart PME Finance - Sauvegarde Automatique de la Base de Donnees
echo ========================================================
echo    Smart PME Finance - Systeme de Sauvegarde (Backup)
echo ========================================================
echo.

set BACKUP_DIR=%~dp0..\backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%

set BACKUP_FILE=%BACKUP_DIR%\smart_pme_backup_%TIMESTAMP%.sql
set DB_NAME=smart_pme_finance
set DB_USER=postgres
set DB_HOST=localhost
set DB_PORT=5432

echo [%TIME%] Demarrage du dump PostgreSQL de '%DB_NAME%'...

pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -F p -b -v -f "%BACKUP_FILE%" %DB_NAME%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCES] Sauvegarde creee avec succes :
    echo %BACKUP_FILE%
    echo.
    echo Nettoyage des sauvegardes vieilles de plus de 30 jours...
    forfiles /p "%BACKUP_DIR%" /s /m *.sql /d -30 /c "cmd /c del @path" 2>nul
    echo Termine avec succes.
) else (
    echo.
    echo [ERREUR] Echec de la commande pg_dump.
    echo Verifiez que PostgreSQL est demarre et accessible sur le port %DB_PORT%.
)

timeout /t 5
