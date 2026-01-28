# TripLedger API - Google Cloud Run 部署指南

## 目錄
1. [前置準備](#前置準備)
2. [建立 GCP 專案](#建立-gcp-專案)
3. [設定 Cloud SQL](#設定-cloud-sql)
4. [部署到 Cloud Run](#部署到-cloud-run)
5. [設定環境變數](#設定環境變數)
6. [設定自訂網域](#設定自訂網域)
7. [監控和日誌](#監控和日誌)

---

## 前置準備

### 1. 安裝 Google Cloud CLI

```bash
# Windows (使用 PowerShell)
(New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")
& $env:Temp\GoogleCloudSDKInstaller.exe

# macOS
brew install google-cloud-sdk

# 驗證安裝
gcloud version
```

### 2. 登入 GCP

```bash
gcloud auth login
gcloud auth configure-docker
```

---

## 建立 GCP 專案

### 1. 建立專案

```bash
# 建立新專案
gcloud projects create tripledger-prod --name="TripLedger Production"

# 設定預設專案
gcloud config set project tripledger-prod

# 連結帳單帳戶 (需要在 Console 操作或使用 billing account ID)
# gcloud billing projects link tripledger-prod --billing-account=YOUR_BILLING_ACCOUNT_ID
```

### 2. 啟用必要的 API

```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  containerregistry.googleapis.com
```

---

## 設定 Cloud SQL

### 1. 建立 PostgreSQL 實例

```bash
# 建立 Cloud SQL 實例 (這會花幾分鐘)
gcloud sql instances create tripledger-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=asia-east1 \
  --storage-type=SSD \
  --storage-size=10GB \
  --backup-start-time=03:00

# 設定 root 密碼
gcloud sql users set-password postgres \
  --instance=tripledger-db \
  --password=YOUR_SECURE_PASSWORD

# 建立應用程式資料庫
gcloud sql databases create tripledger --instance=tripledger-db

# 建立應用程式用戶
gcloud sql users create tripledger_user \
  --instance=tripledger-db \
  --password=YOUR_APP_PASSWORD
```

### 2. 取得連線資訊

```bash
# 取得實例連線名稱
gcloud sql instances describe tripledger-db --format="value(connectionName)"
# 輸出: tripledger-prod:asia-east1:tripledger-db
```

---

## 部署到 Cloud Run

### 方法 1: 使用 Cloud Build (推薦)

```bash
cd apps/api

# 提交建置和部署
gcloud builds submit --config cloudbuild.yaml
```

### 方法 2: 手動建置和部署

```bash
cd apps/api

# 1. 建置 Docker 映像
docker build -t gcr.io/tripledger-prod/tripledger-api .

# 2. 推送到 Container Registry
docker push gcr.io/tripledger-prod/tripledger-api

# 3. 部署到 Cloud Run
gcloud run deploy tripledger-api \
  --image gcr.io/tripledger-prod/tripledger-api \
  --region asia-east1 \
  --platform managed \
  --allow-unauthenticated \
  --add-cloudsql-instances tripledger-prod:asia-east1:tripledger-db \
  --set-env-vars "NODE_ENV=production" \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1
```

---

## 設定環境變數

### 1. 使用 Secret Manager 存儲敏感資訊

```bash
# 建立 secrets
echo -n "postgresql://tripledger_user:YOUR_APP_PASSWORD@localhost/tripledger?host=/cloudsql/tripledger-prod:asia-east1:tripledger-db" | \
  gcloud secrets create DATABASE_URL --data-file=-

echo -n "your-super-secret-jwt-key-at-least-32-characters" | \
  gcloud secrets create JWT_SECRET --data-file=-

# LINE Login secrets
echo -n "your-line-channel-id" | \
  gcloud secrets create LINE_CHANNEL_ID --data-file=-

echo -n "your-line-channel-secret" | \
  gcloud secrets create LINE_CHANNEL_SECRET --data-file=-

# Google OAuth secrets
echo -n "your-google-client-id" | \
  gcloud secrets create GOOGLE_CLIENT_ID --data-file=-

echo -n "your-google-client-secret" | \
  gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-
```

### 2. 授權 Cloud Run 存取 Secrets

```bash
# 取得 Cloud Run 服務帳戶
PROJECT_NUMBER=$(gcloud projects describe tripledger-prod --format="value(projectNumber)")

# 授權存取所有 secrets
for secret in DATABASE_URL JWT_SECRET LINE_CHANNEL_ID LINE_CHANNEL_SECRET GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET; do
  gcloud secrets add-iam-policy-binding $secret \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

### 3. 更新 Cloud Run 使用 Secrets

```bash
gcloud run services update tripledger-api \
  --region asia-east1 \
  --add-cloudsql-instances tripledger-prod:asia-east1:tripledger-db \
  --set-secrets "DATABASE_URL=DATABASE_URL:latest" \
  --set-secrets "JWT_SECRET=JWT_SECRET:latest" \
  --set-secrets "LINE_CHANNEL_ID=LINE_CHANNEL_ID:latest" \
  --set-secrets "LINE_CHANNEL_SECRET=LINE_CHANNEL_SECRET:latest" \
  --set-secrets "GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest" \
  --set-secrets "GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest" \
  --set-env-vars "NODE_ENV=production,JWT_EXPIRES_IN=7d"
```

---

## 設定自訂網域

### 1. 驗證網域所有權

```bash
# 在 Google Search Console 驗證網域
# 或使用 DNS TXT 記錄驗證
```

### 2. 對應網域到 Cloud Run

```bash
gcloud run domain-mappings create \
  --service tripledger-api \
  --domain api.tripledger.com \
  --region asia-east1
```

### 3. 設定 DNS

在你的 DNS 供應商新增以下記錄：
- **類型**: CNAME
- **名稱**: api
- **值**: ghs.googlehosted.com

---

## 監控和日誌

### 查看日誌

```bash
# 即時查看日誌
gcloud run services logs read tripledger-api --region asia-east1 --tail 50

# 或在 Console 查看
# https://console.cloud.google.com/run/detail/asia-east1/tripledger-api/logs
```

### 查看指標

```bash
# 查看服務狀態
gcloud run services describe tripledger-api --region asia-east1
```

---

## 成本估算

| 資源 | 規格 | 估算月費 (USD) |
|------|------|----------------|
| Cloud Run | 512MB, 1 vCPU, ~100萬請求/月 | $0-5 |
| Cloud SQL | db-f1-micro, 10GB | ~$10 |
| Cloud Build | 120 分鐘/天免費 | $0 |
| Secret Manager | 6 個 secrets | ~$0.01 |
| **總計** | | **~$10-15/月** |

> 註：Cloud Run 有慷慨的免費額度 (200萬請求/月)，小型應用可能接近免費。

---

## 故障排除

### 常見問題

**1. 資料庫連線失敗**
```bash
# 確認 Cloud SQL 連線設定
gcloud run services describe tripledger-api --region asia-east1 \
  --format="value(spec.template.metadata.annotations['run.googleapis.com/cloudsql-instances'])"
```

**2. 權限不足**
```bash
# 檢查服務帳戶權限
gcloud projects get-iam-policy tripledger-prod \
  --flatten="bindings[].members" \
  --filter="bindings.role:roles/run.admin"
```

**3. 映像建置失敗**
```bash
# 本地測試建置
docker build -t test-api .
docker run -p 8080:8080 test-api
```

---

## 快速部署命令總結

```bash
# 首次設定 (只需執行一次)
gcloud config set project tripledger-prod
gcloud services enable cloudbuild.googleapis.com run.googleapis.com sqladmin.googleapis.com secretmanager.googleapis.com

# 每次部署
cd apps/api
gcloud builds submit --config cloudbuild.yaml

# 查看服務 URL
gcloud run services describe tripledger-api --region asia-east1 --format="value(status.url)"
```
