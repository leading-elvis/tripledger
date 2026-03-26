# TripLedger

跨平台旅遊分帳系統，支援社交登入（LINE、Google），適用於旅遊情境的群組費用分攤。

## 技術架構

| 層級 | 技術 |
|------|------|
| 後端 | NestJS + TypeScript + Prisma ORM + PostgreSQL |
| 前端 | Flutter + Riverpod |
| 部署 | Google Cloud Run + Cloud SQL |
| 容器 | Docker |

## 專案結構

```
TripLedger/
├── apps/
│   ├── api/          # NestJS 後端 API
│   └── mobile/       # Flutter 行動應用
├── infrastructure/
│   └── docker/       # Docker 配置
├── docs/             # 額外文件
└── scripts/          # 自動化腳本
```

## 快速開始

### 環境需求

- Node.js 20+
- Flutter 3.x
- Docker & Docker Compose
- PostgreSQL 16 (透過 Docker)

### 本地開發

```bash
# 1. 啟動資料庫
cd infrastructure/docker && docker-compose up -d

# 2. 安裝依賴並執行遷移
npm install
npm run db:migrate
npm run db:generate

# 3. 啟動後端
npm run api:dev

# 4. 啟動 Flutter App
cd apps/mobile
flutter pub get
flutter run
```

詳細設定請參考 [GETTING_STARTED.md](GETTING_STARTED.md)。

## 主要功能

- **社交登入**: LINE、Google OAuth
- **旅程管理**: 建立旅程、邀請成員、設定預設貨幣
- **帳單分攤**: 支援平均、指定金額、百分比、份數、細項分攤
- **收據掃描**: OCR 辨識 + AI 品牌建議
- **多幣別**: 自動匯率轉換
- **結算優化**: 最小化交易次數的結算演算法
- **推播通知**: Firebase Cloud Messaging

## 文件索引

| 文件 | 說明 |
|------|------|
| [GETTING_STARTED.md](GETTING_STARTED.md) | 完整開發環境設定指南 |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Cloud Run 部署指南 |
| [CLAUDE.md](CLAUDE.md) | 開發者指南與架構說明 |
| [IOS_SETUP_NOTES.md](IOS_SETUP_NOTES.md) | iOS 開發環境設定 |
| [docs/IAP_PLAN.md](docs/IAP_PLAN.md) | 內購功能規劃 |

## 開發命令

```bash
# 後端
npm run api:dev        # 開發模式
npm run api:test       # 執行測試
npm run db:studio      # Prisma Studio

# 前端 (apps/mobile)
flutter run            # 執行 App
flutter test           # 執行測試
dart run build_runner build  # 程式碼生成
```

## API 文件

後端啟動後，Swagger 文件位於: `http://localhost:3000/docs`

## 授權

Private - All Rights Reserved
