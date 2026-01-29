@echo off
echo ================================
echo   UNI - Quick Start Script
echo ================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [X] Node.js not found!
    echo.
    echo Install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Node.js found
echo.

echo Installing dependencies...
call npm install

if %errorlevel% neq 0 (
    echo [X] Installation failed
    pause
    exit /b 1
)

echo [OK] Dependencies installed
echo.
echo Starting Uni...
echo.
echo    Open: http://localhost:3000
echo    Stop:  Press Ctrl+C
echo.
echo ================================
echo.

call npm start
