# TripLedger 部署進度追蹤

> 最後更新：2026-01-21

## 目前狀態：✅ API 已上線，Web/App 可連線

### 線上服務
- **API URL**: https://tripledger-api-297896850903.asia-east1.run.app
- **API 文件**: https://tripledger-api-297896850903.asia-east1.run.app/docs
- **GCP 專案**: tripledger-484503
- **區域**: asia-east1

---

## 已完成項目 ✅

### 1. Google Cloud Run 部署
- [x] 建立 `Dockerfile`（支援 monorepo 結構）
- [x] 建立 `cloudbuild.yaml`（CI/CD 自動化部署）
- [x] 建立 `.dockerignore` 優化映像檔大小
- [x] API 成功部署並運行

### 2. 資料庫設定
- [x] Cloud SQL (PostgreSQL) 實例：`tripledger-db`
- [x] 資料庫使用者：`tripledger_user`
- [x] Secret Manager 設定完成：
  - `database-url` ✅
  - `jwt-secret` ✅
  - `jwt-refresh-secret` ✅
- [x] Prisma migration 執行完成

### 3. Google OAuth 設定
| 平台 | Client ID | 狀態 |
|------|-----------|------|
| Android | 自動驗證（package + SHA-1） | ✅ Debug SHA-1 已設定 |
| iOS | `297896850903-o0d95vmns7p061nmugfidb8oco5it2ck` | ✅ Info.plist 已設定 |
| Web | `297896850903-b275hfg2qmgp1gpipad0r985tg3nqr8p` | ✅ index.html 已設定 |

**Android Debug SHA-1**: `B7:02:24:2C:9A:D9:35:D4:DB:6B:91:7B:9B:C7:A1:AA:61:67:A0:BD`

### 4. Flutter 設定
- [x] 新增 Web 平台支援
- [x] `api_config.dart` 新增 `forceProduction` 開關
- [x] Web index.html 加入 Google Client ID

### 5. CORS 設定
- [x] 後端支援環境變數控制 CORS
- [x] 目前允許所有來源（未設定 CORS_ORIGIN）

---

## 待辦事項 📋

### 高優先級 🔴

#### LINE Login 設定
- [ ] 前往 [LINE Developers Console](https://developers.line.biz/console/)
- [ ] 建立 LINE Login Channel
- [ ] 取得 Channel ID 和 Channel Secret
- [ ] 更新 `apps/mobile/ios/Runner/Info.plist` 中的 `LineSDKChannelID`
- [ ] 更新 `apps/mobile/android/app/src/main/res/values/strings.xml`（如需要）

#### Android Release 設定
- [ ] 產生 release keystore
- [ ] 取得 release SHA-1：
  ```bash
  keytool -list -v -keystore your-release-key.keystore -alias your-alias
  ```
- [ ] 在 Google Cloud Console 新增 release SHA-1
- [ ] 建置 release APK：`flutter build apk --release`

#### iOS 測試
- [ ] 需要 Apple Developer 帳號
- [ ] 在 Xcode 設定 Bundle ID 和 Signing
- [ ] 測試 iOS 模擬器或實機

### 中優先級 🟡

#### 自訂網域
- [ ] 購買網域（如 tripledger.com）
- [ ] 在 Cloud Run 設定自訂網域對應
- [ ] 更新 Flutter `api_config.dart` 中的 `prodBaseUrl`
- [ ] 更新 Google OAuth 授權網域

#### Web 部署
- [ ] 建置 Flutter Web：`flutter build web`
- [ ] 部署到 Firebase Hosting 或 Cloud Storage
- [ ] 設定自訂網域（如 app.tripledger.com）

#### CI/CD 完善
- [ ] 加入自動測試步驟
- [ ] 設定 staging 環境
- [ ] 加入版本號管理

#### 監控告警
- [ ] 設定 Cloud Monitoring
- [ ] 設定錯誤通知（Email/Slack）
- [ ] 設定 uptime check

### 低優先級 🟢

#### CORS 限制（正式上線時）
- [ ] 確定 Web 正式網域
- [ ] 透過 gcloud 設定 CORS_ORIGIN：
  ```bash
  gcloud run services update tripledger-api --region asia-east1 \
    --update-env-vars "CORS_ORIGIN=https://your-domain.com"
  ```

#### 效能優化
- [ ] 評估是否需要 min-instances > 0（減少冷啟動）
- [ ] 設定 CDN 快取靜態資源

#### 日誌管理
- [ ] 設定 Cloud Logging 查詢
- [ ] 設定日誌保留策略

---

## 重要檔案位置

| 檔案 | 用途 |
|------|------|
| `cloudbuild.yaml` | Cloud Build 部署設定 |
| `apps/api/Dockerfile` | API Docker 映像設定 |
| `apps/api/src/main.ts` | API 入口（含 CORS 設定） |
| `apps/mobile/lib/core/config/api_config.dart` | Flutter API 端點設定 |
| `apps/mobile/web/index.html` | Web Google OAuth 設定 |
| `apps/mobile/ios/Runner/Info.plist` | iOS Google/LINE 設定 |
| `apps/mobile/android/app/build.gradle` | Android 建置設定 |

---

## 常用指令

### 部署 API
```bash
cd D:\Project\TripLedger
gcloud builds submit --config cloudbuild.yaml
```

### 執行 Flutter
```bash
cd apps/mobile

# Web
flutter run -d chrome

# Android
flutter run -d <device_id>

# 列出裝置
flutter devices
```

### 建置 Release
```bash
cd apps/mobile

# Android APK
flutter build apk --release

# Android App Bundle
flutter build appbundle --release

# iOS
flutter build ios --release

# Web
flutter build web --release
```

### 切換環境
```dart
// apps/mobile/lib/core/config/api_config.dart
static const bool forceProduction = true;  // 連線正式環境
static const bool forceProduction = false; // 連線本地開發
```

### 資料庫操作
```bash
cd apps/api

# 產生 Prisma Client
npm run db:generate

# 執行 Migration
npm run db:migrate

# 開啟 Prisma Studio
npm run db:studio
```

### Cloud Run 管理
```bash
# 查看服務狀態
gcloud run services describe tripledger-api --region asia-east1

# 查看日誌
gcloud run services logs read tripledger-api --region asia-east1

# 更新環境變數
gcloud run services update tripledger-api --region asia-east1 \
  --update-env-vars "KEY=VALUE"
```

---

## 環境變數清單

### Cloud Run (Secret Manager)
| 名稱 | 說明 | Secret 名稱 |
|------|------|-------------|
| DATABASE_URL | PostgreSQL 連線字串 | database-url |
| JWT_SECRET | JWT 簽名密鑰 | jwt-secret |
| JWT_REFRESH_SECRET | Refresh Token 密鑰 | jwt-refresh-secret |

### Cloud Run (環境變數)
| 名稱 | 值 | 說明 |
|------|-----|------|
| NODE_ENV | production | 執行環境 |
| CORS_ORIGIN | (未設定) | CORS 允許來源，未設定則允許所有 |

---

## 問題排解

### API 回傳 401 Unauthorized
1. 確認 JWT_SECRET 已正確設定
2. 確認 token 未過期
3. 檢查 Authorization header 格式：`Bearer <token>`

### CORS 錯誤（Web）
1. 確認 API 已部署最新版本（含 CORS 設定）
2. 檢查瀏覽器 console 的錯誤訊息
3. 暫時移除 CORS_ORIGIN 環境變數測試

### Google 登入失敗
1. 確認 OAuth Client ID 正確
2. Android：確認 SHA-1 已在 Google Cloud Console 註冊
3. Web：確認 JavaScript 來源已授權
4. iOS：確認 Info.plist 中的 GIDClientID 正確

### 資料庫連線失敗
1. 確認 Cloud SQL 實例正在運行
2. 確認 DATABASE_URL secret 格式正確
3. 確認 Cloud Run 有 Cloud SQL 連線權限
