# TripLedger - 完整環境建置與啟動指南

## 專案概述

TripLedger 是一套團體旅遊分帳系統，支援：
- 多人旅程管理
- 帳單記錄與多種分攤方式（平均、精確金額、百分比、份數）
- 智慧結算（最佳化還款路徑，最小化交易次數）
- LINE / Google 社群登入
- LINE / Discord 整合（未來功能）

## 技術架構

| 層級 | 技術 |
|------|------|
| 前端 | Flutter 3.x + Riverpod |
| 後端 | NestJS + TypeScript |
| 資料庫 | PostgreSQL 16 + Prisma ORM |
| 快取 | Redis 7 |
| 容器化 | Docker + Docker Compose |

---

## 第一部分：環境安裝

### 1.1 安裝 Node.js

**Windows:**
1. 前往 https://nodejs.org/
2. 下載 LTS 版本（建議 v18.x 或更高）
3. 執行安裝程式，保持預設選項
4. 驗證安裝：
   ```bash
   node --version   # 應顯示 v18.x.x 或更高
   npm --version    # 應顯示 9.x.x 或更高
   ```

**macOS (使用 Homebrew):**
```bash
brew install node@18
node --version
npm --version
```

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version
```

### 1.2 安裝 Docker Desktop

**Windows / macOS:**
1. 前往 https://www.docker.com/products/docker-desktop/
2. 下載並安裝 Docker Desktop
3. 啟動 Docker Desktop
4. 驗證安裝：
   ```bash
   docker --version          # 應顯示 Docker version 24.x.x 或更高
   docker-compose --version  # 應顯示 Docker Compose version v2.x.x
   ```

**Linux:**
```bash
# 安裝 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 安裝 Docker Compose
sudo apt-get install docker-compose-plugin

# 重新登入後驗證
docker --version
docker compose version
```

### 1.3 安裝 Flutter

**Windows:**
1. 前往 https://docs.flutter.dev/get-started/install/windows
2. 下載 Flutter SDK zip 檔案
3. 解壓縮到 `C:\flutter`（避免路徑有空格）
4. 將 `C:\flutter\bin` 加入系統 PATH 環境變數
5. 驗證安裝：
   ```bash
   flutter --version   # 應顯示 Flutter 3.x.x
   flutter doctor       # 檢查環境配置
   ```

**macOS:**
```bash
brew install --cask flutter
flutter --version
flutter doctor
```

**Linux:**
```bash
# 下載並解壓縮
cd ~
git clone https://github.com/flutter/flutter.git -b stable
export PATH="$PATH:$HOME/flutter/bin"

# 加入 ~/.bashrc 或 ~/.zshrc
echo 'export PATH="$PATH:$HOME/flutter/bin"' >> ~/.bashrc
source ~/.bashrc

flutter --version
flutter doctor
```

### 1.4 Flutter 額外設定

```bash
# 接受 Android licenses
flutter doctor --android-licenses

# 如果要開發 iOS (僅 macOS)
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch

# 再次檢查環境
flutter doctor
```

---

## 第二部分：專案設定

### 2.1 取得專案原始碼

```bash
# 如果從 Git 取得
git clone <repository-url> TripLedger
cd TripLedger
```

### 2.2 啟動資料庫服務

```bash
# 方法一：使用設定腳本（Windows）
scripts\setup.bat

# 方法二：手動啟動 Docker 容器
cd infrastructure/docker
docker-compose up -d

# 確認容器運行中
docker ps
# 應該看到 tripledger-db (PostgreSQL) 和 tripledger-redis
```

**等待資料庫就緒（約 10 秒）**

驗證資料庫連線：
```bash
docker exec tripledger-db pg_isready -U tripledger
# 應顯示：/var/run/postgresql:5432 - accepting connections
```

### 2.3 設定後端 API

```bash
# 進入 API 目錄
cd apps/api

# 安裝 npm 依賴
npm install

# 建立環境變數檔案
# Windows:
copy .env.example .env
# macOS/Linux:
cp .env.example .env
```

**編輯 `.env` 檔案：**
```env
# 資料庫連線（使用 Docker 預設值）
DATABASE_URL="postgresql://tripledger:tripledger_secret@localhost:5432/tripledger?schema=public"

# JWT 設定
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"

# 選填：社群登入 API Keys
LINE_CHANNEL_ID=""
LINE_CHANNEL_SECRET=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

### 2.4 初始化資料庫

```bash
# 確保在 apps/api 目錄下

# 產生 Prisma Client
npx prisma generate

# 執行資料庫遷移（建立資料表）
npx prisma migrate dev --name init

# 如果遷移成功，應該看到：
# ✔ Generated Prisma Client
# ✔ The database is now in sync with your Prisma schema
```

**驗證資料庫結構：**
```bash
# 開啟 Prisma Studio 視覺化介面
npx prisma studio
# 會在瀏覽器開啟 http://localhost:5555
```

### 2.5 設定前端 Flutter

```bash
# 進入 mobile 目錄
cd apps/mobile

# 安裝 Flutter 依賴
flutter pub get

# 產生程式碼（Riverpod、Freezed、JSON 序列化）
dart run build_runner build --delete-conflicting-outputs
```

---

## 第三部分：啟動應用程式

### 3.1 啟動後端 API

```bash
# 在 apps/api 目錄下
npm run dev

# 成功啟動後會顯示：
# [Nest] LOG [NestApplication] Nest application successfully started
# 伺服器運行於 http://localhost:3000
```

**驗證 API 運行：**
- 開啟瀏覽器訪問 http://localhost:3000/docs （Swagger API 文件）
- 或使用 curl 測試：
  ```bash
  curl http://localhost:3000/api
  ```

### 3.2 啟動前端 Flutter App

```bash
# 在 apps/mobile 目錄下

# 列出可用裝置
flutter devices

# 啟動 App（選擇裝置）
flutter run

# 或指定裝置
flutter run -d chrome      # 網頁版
flutter run -d windows     # Windows 桌面版
flutter run -d <device-id> # 特定裝置/模擬器
```

### 3.3 同時啟動（開發模式）

**終端機 1 - 後端：**
```bash
cd apps/api
npm run dev
```

**終端機 2 - 前端：**
```bash
cd apps/mobile
flutter run
```

---

## 第四部分：執行測試

### 4.1 後端測試

```bash
# 在 apps/api 目錄下

# 執行所有單元測試
npm run test

# 監看模式（檔案變更自動重跑）
npm run test:watch

# 測試覆蓋率報告
npm run test:cov
# 報告產生於 apps/api/coverage/

# 執行 E2E 整合測試
npm run test:e2e

# 執行單一測試檔案
npx jest src/modules/auth/auth.service.spec.ts

# 執行符合模式的測試
npx jest --testNamePattern="should create"
```

### 4.2 前端測試

```bash
# 在 apps/mobile 目錄下

# 執行所有測試
flutter test

# 執行單一測試檔案
flutter test test/widget_test.dart

# 測試覆蓋率
flutter test --coverage
# 報告產生於 apps/mobile/coverage/

# 執行整合測試
flutter test integration_test/
```

### 4.3 程式碼品質檢查

**後端 Lint：**
```bash
cd apps/api

# 執行 ESLint 檢查
npm run lint

# 格式化程式碼
npm run format
```

**前端 Lint：**
```bash
cd apps/mobile

# 執行 Flutter 分析
flutter analyze

# 格式化程式碼
dart format .
```

---

## 第五部分：常用開發工具

### 5.1 Prisma Studio（資料庫管理）

```bash
cd apps/api
npx prisma studio
# 開啟 http://localhost:5555
```

### 5.2 pgAdmin（進階資料庫管理）

```bash
# 啟動包含 pgAdmin 的 Docker 配置
cd infrastructure/docker
docker-compose --profile dev up -d

# 開啟 http://localhost:5050
# 帳號: admin@tripledger.local
# 密碼: admin
```

### 5.3 Redis CLI

```bash
# 連接 Redis
docker exec -it tripledger-redis redis-cli

# 常用指令
KEYS *       # 列出所有 keys
GET <key>    # 取得值
FLUSHALL     # 清除所有資料（開發用）
```

---

## 第六部分：疑難排解

### 問題：Docker 容器無法啟動

```bash
# 檢查 Docker 服務是否運行
docker info

# 查看容器日誌
docker logs tripledger-db
docker logs tripledger-redis

# 重新啟動容器
docker-compose -f infrastructure/docker/docker-compose.yml down
docker-compose -f infrastructure/docker/docker-compose.yml up -d
```

### 問題：Prisma migrate 失敗

```bash
# 重設資料庫（會清除所有資料）
npx prisma migrate reset

# 或手動重建
docker-compose -f infrastructure/docker/docker-compose.yml down -v
docker-compose -f infrastructure/docker/docker-compose.yml up -d
# 等待 10 秒後
npx prisma migrate dev --name init
```

### 問題：Flutter 依賴衝突

```bash
cd apps/mobile

# 清除快取
flutter clean
flutter pub cache repair

# 重新安裝
flutter pub get
```

### 問題：Port 已被佔用

```bash
# 檢查 port 3000 (API)
# Windows:
netstat -ano | findstr :3000
# macOS/Linux:
lsof -i :3000

# 檢查 port 5432 (PostgreSQL)
# Windows:
netstat -ano | findstr :5432
# macOS/Linux:
lsof -i :5432
```

---

## 快速參考卡

| 任務 | 指令 |
|------|------|
| 啟動資料庫 | `docker-compose -f infrastructure/docker/docker-compose.yml up -d` |
| 停止資料庫 | `docker-compose -f infrastructure/docker/docker-compose.yml down` |
| 啟動後端 | `cd apps/api && npm run dev` |
| 啟動前端 | `cd apps/mobile && flutter run` |
| 後端測試 | `cd apps/api && npm run test` |
| 前端測試 | `cd apps/mobile && flutter test` |
| 資料庫 UI | `cd apps/api && npx prisma studio` |
| API 文件 | http://localhost:3000/docs |

---

## 下一步

1. **設定社群登入 API Keys**
   - LINE Login: https://developers.line.biz/console/
   - Google OAuth: https://console.cloud.google.com/apis/credentials

2. **執行種子資料（Seed）**
   ```bash
   cd apps/api
   npm run db:seed
   ```

3. **開始開發新功能**
   - 後端模組位於 `apps/api/src/modules/`
   - 前端頁面位於 `apps/mobile/lib/features/`