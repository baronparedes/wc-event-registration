@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in PATH.
    echo Please install Node.js (version 22 or higher) from https://nodejs.org
    pause
    exit /b 1
)

echo Starting Word Community Attendance Sync...
node cli.js %*

if %errorlevel% neq 0 (
    echo.
    echo Sync service exited with error code %errorlevel%.
    pause
)
