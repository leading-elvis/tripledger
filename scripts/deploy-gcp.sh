#!/bin/bash
# TripLedger GCP 部署腳本
# 使用方式: ./scripts/deploy-gcp.sh

set -e

# 配置
PROJECT_ID="tripledger-484503"
REGION="asia-east1"
SERVICE_NAME="tripledger-api"
DB_INSTANCE="tripledger-db"

echo "🚀 TripLedger GCP 部署腳本"
echo "=========================="

# 檢查 gcloud 是否已安裝
if ! command -v gcloud &> /dev/null; then
    echo "❌ 請先安裝 Google Cloud CLI"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# 檢查是否已登入
if ! gcloud auth print-identity-token &> /dev/null; then
    echo "📝 請先登入 GCP..."
    gcloud auth login
fi

# 設定專案
echo "📌 設定專案: $PROJECT_ID"
gcloud config set project $PROJECT_ID 2>/dev/null || true

# 確認專案存在
if ! gcloud projects describe $PROJECT_ID &> /dev/null; then
    echo "🔧 建立專案..."
    gcloud projects create $PROJECT_ID --name="TripLedger Production"
    echo "⚠️  請到 GCP Console 連結帳單帳戶後重新執行此腳本"
    exit 1
fi

# 啟用 API
echo "🔌 啟用必要的 GCP API..."
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    sqladmin.googleapis.com \
    secretmanager.googleapis.com \
    containerregistry.googleapis.com \
    --quiet

# 進入專案根目錄 (monorepo 結構需要從根目錄構建)
cd "$(dirname "$0")/.."

# 部署
echo "🏗️  建置和部署..."
gcloud builds submit --config cloudbuild.yaml

# 取得服務 URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)" 2>/dev/null || echo "")

if [ -n "$SERVICE_URL" ]; then
    echo ""
    echo "✅ 部署完成！"
    echo "=========================="
    echo "🌐 API URL: $SERVICE_URL"
    echo "📚 Swagger: $SERVICE_URL/docs"
    echo "❤️  Health:  $SERVICE_URL/api/health"
else
    echo "⚠️  部署可能需要幾分鐘完成，請稍後檢查 GCP Console"
fi
