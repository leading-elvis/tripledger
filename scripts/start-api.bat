@echo off
chcp 65001 >nul
echo.
echo 啟動 TripLedger API...
echo.
cd /d "%~dp0..\apps\api"
npm run dev
