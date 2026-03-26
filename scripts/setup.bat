@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   TripLedger Environment Setup
echo ========================================
echo.

:: Check Node.js
echo [1/6] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Node.js not installed
    echo     Download: https://nodejs.org/
    pause
    exit /b 1
)
echo [OK] Node.js installed

:: Check Docker
echo [2/6] Checking Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Docker not installed
    echo     Download: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)
echo [OK] Docker installed

:: Start database
echo [3/6] Starting PostgreSQL database...
cd /d "%~dp0..\infrastructure\docker"
docker-compose up -d
if %errorlevel% neq 0 (
    echo [X] Failed to start database
    pause
    exit /b 1
)
echo [OK] Database started

:: Wait for database
echo [4/6] Waiting for database to be ready (10 seconds)...
timeout /t 10 /nobreak >nul

:: Install backend dependencies
echo [5/6] Installing backend dependencies...
cd /d "%~dp0..\apps\api"
call npm install
if %errorlevel% neq 0 (
    echo [X] Failed to install backend dependencies
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed

:: Run database migrations
echo [6/6] Running database migrations...
call npx prisma generate
call npx prisma migrate dev --name init
if %errorlevel% neq 0 (
    echo [!] Database migration may have issues, please check manually
)
echo [OK] Database migration completed

echo.
echo ========================================
echo   [OK] Environment setup completed!
echo ========================================
echo.
echo Next steps:
echo   1. Start backend: cd apps\api ^&^& npm run dev
echo   2. Start frontend: cd apps\mobile ^&^& flutter run
echo.
echo API docs: http://localhost:3000/docs
echo.
pause