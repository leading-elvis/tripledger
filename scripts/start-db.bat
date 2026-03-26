@echo off
chcp 65001 >nul
echo.
echo 啟動資料庫服務...
echo.
cd /d "%~dp0..\infrastructure\docker"
docker-compose up -d
echo.
echo ✓ 資料庫已啟動
echo   PostgreSQL: localhost:5432
echo   Redis: localhost:6379
echo.
pause
