@echo off
REM TripLedger GCP 部署腳本 (Windows)
REM 使用方式: scripts\deploy-gcp.bat

setlocal enabledelayedexpansion

set PROJECT_ID=tripledger-484503
set REGION=asia-east1
set SERVICE_NAME=tripledger-api

echo.
echo ========================================
echo   TripLedger GCP 部署腳本
echo ========================================
echo.

REM 檢查 gcloud
where gcloud >nul 2>nul
if %errorlevel% neq 0 (
    echo [錯誤] 請先安裝 Google Cloud CLI
    echo        https://cloud.google.com/sdk/docs/install
    exit /b 1
)

REM 設定專案
echo [1/4] 設定專案: %PROJECT_ID%
call gcloud config set project %PROJECT_ID% 2>nul

REM 啟用 API
echo [2/4] 啟用必要的 GCP API...
call gcloud services enable ^
    cloudbuild.googleapis.com ^
    run.googleapis.com ^
    sqladmin.googleapis.com ^
    secretmanager.googleapis.com ^
    containerregistry.googleapis.com ^
    --quiet

REM 進入專案根目錄 (monorepo 結構需要從根目錄構建)
cd /d "%~dp0.."

REM 部署
echo [3/4] 建置和部署中 (這可能需要幾分鐘)...
call gcloud builds submit --config cloudbuild.yaml

REM 取得 URL
echo [4/4] 取得服務 URL...
for /f "tokens=*" %%i in ('gcloud run services describe %SERVICE_NAME% --region %REGION% --format="value(status.url)" 2^>nul') do set SERVICE_URL=%%i

echo.
echo ========================================
if defined SERVICE_URL (
    echo   部署完成！
    echo ========================================
    echo   API URL: %SERVICE_URL%
    echo   Swagger: %SERVICE_URL%/docs
    echo   Health:  %SERVICE_URL%/api/health
) else (
    echo   部署已提交，請稍後檢查 GCP Console
    echo ========================================
)
echo.

endlocal
