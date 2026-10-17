@echo off
setlocal EnableDelayedExpansion

:: Check for Administrator privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] This script must be run as Administrator.
    echo Please right-click install-windows-service.bat and select "Run as administrator".
    pause
    exit /b 1
)

set "EXE_PATH=%~dp0wc-attendance-sync.exe"
if not exist "%EXE_PATH%" (
    set "EXE_PATH=%~dp0bin\wc-attendance-sync.exe"
)
if not exist "%EXE_PATH%" (
    set "EXE_PATH=%~dp0..\..\dist\wc-attendance-sync.exe"
)

if not exist "%EXE_PATH%" (
    echo [ERROR] Could not find wc-attendance-sync.exe.
    echo Please compile or copy wc-attendance-sync.exe into this directory.
    pause
    exit /b 1
)

set "SERVICE_NAME=WCAttendanceSync"

echo ========================================================
echo   Word Community Attendance Sync - Windows Service Setup
echo ========================================================
echo Binary: %EXE_PATH%
echo.
echo Choose an installation option:
echo [1] Install as Windows Background Task (Task Scheduler, starts on boot)
echo [2] Install via NSSM (if nssm.exe is in PATH or directory)
echo [3] Uninstall service / task
echo [4] Exit
echo.

set /p OPTION="Select option [1-4]: "

if "%OPTION%"=="1" goto INSTALL_TASK
if "%OPTION%"=="2" goto INSTALL_NSSM
if "%OPTION%"=="3" goto UNINSTALL
if "%OPTION%"=="4" exit /b 0

echo Invalid selection.
pause
exit /b 1

:INSTALL_TASK
echo.
echo Registering task with Task Scheduler...
schtasks /create /f /tn "%SERVICE_NAME%" /tr "\"%EXE_PATH%\" --watch" /sc onstart /ru SYSTEM /rl HIGHEST
if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Task "%SERVICE_NAME%" created! It will automatically start when Windows boots.
    echo Starting task now...
    schtasks /run /tn "%SERVICE_NAME%"
) else (
    echo [ERROR] Failed to create scheduled task.
)
pause
exit /b 0

:INSTALL_NSSM
where nssm >nul 2>&1
if %errorlevel% neq 0 (
    if not exist "%~dp0nssm.exe" (
        echo [ERROR] nssm.exe was not found in PATH or the current folder.
        echo Download nssm from https://nssm.cc or choose Option [1].
        pause
        exit /b 1
    )
    set "NSSM=%~dp0nssm.exe"
) else (
    set "NSSM=nssm"
)

echo.
echo Installing Windows Service via NSSM...
%NSSM% install "%SERVICE_NAME%" "%EXE_PATH%" "--watch"
%NSSM% set "%SERVICE_NAME%" AppDirectory "%~dp0"
%NSSM% set "%SERVICE_NAME%" Start SERVICE_AUTO_START
%NSSM% start "%SERVICE_NAME%"
echo.
echo [SUCCESS] Windows Service "%SERVICE_NAME%" installed and started!
pause
exit /b 0

:UNINSTALL
echo.
echo Removing service/task...
schtasks /delete /f /tn "%SERVICE_NAME%" >nul 2>&1
where nssm >nul 2>&1 && nssm stop "%SERVICE_NAME%" >nul 2>&1 && nssm remove "%SERVICE_NAME%" confirm >nul 2>&1
echo [SUCCESS] "%SERVICE_NAME%" uninstalled.
pause
exit /b 0
