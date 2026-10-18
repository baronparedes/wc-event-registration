@echo off
setlocal

cd /d "%~dp0"

set "EXE_PATH=%~dp0wc-attendance-sync.exe"
if not exist "%EXE_PATH%" (
    set "EXE_PATH=%~dp0bin\wc-attendance-sync.exe"
)

if exist "%EXE_PATH%" (
    echo Starting Word Community Attendance Sync in System Tray mode...
    start "" "%EXE_PATH%" --tray %*
    exit /b 0
)

where node >nul 2>nul
if %errorlevel% equ 0 (
    echo Starting Word Community Attendance Sync with Node.js in System Tray mode...
    start "" node cli.js --tray %*
    exit /b 0
)

echo [ERROR] Neither wc-attendance-sync.exe nor Node.js was found.
pause
exit /b 1
