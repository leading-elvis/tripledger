# TripLedger 進階功能實作指南

> 最後更新：2026-01-31
>
> 本文件基於 [IAP_PLAN.md](./IAP_PLAN.md) 和現有專案分析，提供詳細的實作步驟指引。

---

## 實作進度總覽

| Sprint | 功能 | 狀態 | 完成日期 |
|--------|------|------|----------|
| Sprint 1 | 付費框架 MVP | ✅ 完成 | 2026-01-28 |
| Sprint 2 | 智慧收據掃描 | ✅ 完成 | 2026-01-29 |
| Sprint 3 | 電子發票 QR Code | ⏸️ 暫緩 | - |
| Sprint 4 | 付費牆整合 | ✅ 完成 | 2026-01-30 |
| Sprint 6 | 語音快速記帳 | 🔲 待開發 | - |
| Sprint 8 | 多國貨幣支援 | ✅ 完成 | 2026-01-30 |

> **Sprint 3 暫緩說明**：電子發票 QR Code 掃描功能因套件相容性問題暫緩。Sprint 2 的 OCR 收據掃描已能滿足大部分使用需求。後端 API 已完成部署，前端功能尚未實作，未來可視需求重啟開發。

---

## 近期完成更動

### 2026-01-31

#### 第六次審查修復

**後端安全性強化**：
- `auth.service.ts`：強化 Demo 登入控制
  - 使用更安全的環境變數名稱 `ALLOW_DEMO_LOGIN_FOR_APP_REVIEW=ENABLED_FOR_APPLE_REVIEW`
  - 生產環境啟用時記錄警告日誌
- `bill.dto.ts`：URL 驗證限制只允許 HTTP/HTTPS 協議，防止 `javascript:` 和 `data:` XSS 風險
- `notifications.service.ts`：修復時間差資訊洩露
  - `markAsRead` 和 `delete` 使用 `findFirst({ where: { id, userId }})` 取代分開的查詢
  - 防止通知 ID 枚舉攻擊
- `bills.service.ts`：錯誤訊息不再洩露用戶 ID，改用通用訊息「部分參與者不是此旅程的成員」
- `health.controller.ts`：生產環境不暴露資料庫錯誤詳情

**前端 mounted 檢查修復**：
- `add_bill_page.dart`：`_loadMembers()` 在 setState 前加上 `if (!mounted) return` 檢查
- `edit_bill_page.dart`：`_loadData()` 在 setState 前加上 mounted 檢查

#### 第五次審查修復

**後端安全性修復**：
- `trips.service.ts`：修復成員暱稱/角色更新授權繞過漏洞
  - 將 `memberId` 參數統一解釋為 User ID（與 `removeMember` 一致）
  - 使用 `tripId_userId` 複合唯一鍵進行更新，確保只能更新屬於該旅程的成員
  - 防止 TOCTOU（Time-of-check Time-of-use）競態條件
- `settlement.service.ts`：修復結算建立競態條件
  - 使用資料庫交易包裝成員驗證和結算建立
  - 新增重複待處理結算檢查，防止同一對用戶建立多筆待處理結算
- `exchange-rate.service.ts`：修復 API 金鑰可能洩漏到日誌的問題
  - 錯誤日誌只記錄錯誤訊息，不記錄完整錯誤物件（避免包含 URL 中的 API 金鑰）

**前端記憶體洩漏修復**：
- `scan_receipt_page.dart`：修復相機控制器記憶體洩漏
  - 在 `didChangeAppLifecycleState` 中，釋放相機後設定 `_cameraController = null`
  - 在 `_initializeCamera` 開始時先釋放舊的控制器
  - 初始化完成前檢查 `mounted` 狀態，避免在 widget 已被釋放後設定狀態
- `login_page.dart`：改善 Demo 登入對話框 TextEditingController 釋放
  - 使用 `isDisposed` 旗標防止重複釋放
  - `onPopInvokedWithResult` 中無論 `didPop` 為何都嘗試釋放控制器

**DTO 驗證強化**：
- `trip.dto.ts`：
  - `CreateTripDto.name` 新增 `@IsNotEmpty()`
  - `JoinTripDto.inviteCode` 新增 `@IsNotEmpty()`
- `bill.dto.ts`：
  - `BillShareInputDto.userId` 新增 `@IsNotEmpty()`
  - `BillItemInputDto.name` 新增 `@IsNotEmpty()`
  - `BillItemInputDto.participantIds` 新增 `@ArrayMinSize(1)` 和 `@IsNotEmpty({ each: true })`
  - `CreateBillDto.title` 新增 `@IsNotEmpty()`
  - `CreateBillDto.participants` 新增 `@ArrayMinSize(1)`
- `settlement.dto.ts`：
  - `CreateSettlementDto.tripId` 新增 `@IsNotEmpty()`
  - `CreateSettlementDto.receiverId` 新增 `@IsNotEmpty()`
  - `CreateSettlementDto.amount` 新增 `@IsInt()` 確保為整數
- `purchase.dto.ts`：
  - `RestorePurchaseDto.receiptDataList` 新增 `@IsArray()`、`@ArrayMinSize(1)` 和 `@IsNotEmpty({ each: true })`

#### 第四次審查修復

**資料庫結構修復**：
- 新增遷移 `20260131000000_add_notification_currency`：為 notifications 表新增 currency 欄位（修復 schema 與遷移不一致）
- 新增遷移 `20260131000001_add_ondelete_and_indexes`：
  - 為 `bills.payer_id`、`bill_shares.user_id`、`bill_item_shares.user_id`、`settlements.payer_id`、`settlements.receiver_id` 新增 `ON DELETE RESTRICT` 約束，防止刪除使用者時產生孤兒資料
  - 新增索引：`bills(trip_id, created_at)`、`bills(payer_id)`、`bill_shares(user_id)`、`settlements(status)`

**安全性修復**：
- `purchase.service.ts`：購買旅程進階版時新增角色檢查，只有 OWNER 或 ADMIN 可以購買
- `auth.service.ts`：Demo 登入使用時序安全的字串比較（`timingSafeEqual`），防止時序攻擊

#### 第三次審查修復

**安全性修復**：
- `settlement.service.ts`：新增收款方成員身份驗證，防止向非旅程成員發起結算
- `auth.service.ts`：移除 Demo 登入的硬編碼預設帳密（`apple_reviewer` / `TripLedger2024!`），改為必須從環境變數設定
- `purchase.service.ts`：移除開發環境跳過收據驗證的功能（`SKIP_RECEIPT_VERIFICATION`）

**資料一致性修復**：
- `schema.prisma`：Notification 模型新增 `currency` 欄位，支援多幣種通知
- `notification.dto.ts`：`CreateNotificationDto` 和 `NotificationResponseDto` 新增 currency 欄位
- `notifications.service.ts`：`createNotification` 和 `createManyNotifications` 方法支援傳遞 currency

---

### 2026-01-30

#### 鍵盤關閉修復
修復 6 個頁面無法點擊空白處關閉鍵盤的問題，統一使用 `GestureDetector` + `FocusScope.of(context).unfocus()` 模式：
- `features/bills/presentation/add_bill_page.dart`
- `features/bills/presentation/edit_bill_page.dart`
- `features/trips/presentation/edit_trip_page.dart`
- `features/ocr/presentation/scan_result_page.dart`
- `features/trips/presentation/trips_list_page.dart`
- `features/trips/presentation/trip_detail_page.dart`

#### 登出快取清除
登出時使用 `ref.invalidate()` 清除 Riverpod 快取，防止帳號切換後顯示舊資料。

#### 進階版剩餘天數顯示
- 旅程列表顯示進階版剩餘天數徽章
- 付費牆顯示當前已購買天數和疊加後總天數

#### 可疊加購買提示
付費牆新增提示文字，說明購買天數可疊加。

#### Sprint 8 多國貨幣前端 UI 整合
完成前端多國貨幣支援 UI 整合：
- 新增 `core/utils/currency_utils.dart`（貨幣工具類別、格式化函數）
- 新增 `shared/widgets/currency_picker.dart`（可搜尋的貨幣選擇器）
- 更新 `trip_model.dart`、`bill_model.dart`（新增貨幣欄位）
- 更新 `edit_trip_page.dart`（旅程預設貨幣選擇器）
- 更新 `add_bill_page.dart`（帳單貨幣選擇、金額顯示）
- 更新 `edit_bill_page.dart`（編輯帳單貨幣選擇）
- 更新 `settlement_page.dart`（結算頁貨幣顯示）
- 全域替換硬編碼 `NT$` 為 `CurrencyUtils.formatAmount()`

#### 多國貨幣顯示與計算修復
修復多國貨幣相關顯示問題：
- `trip_detail_page.dart`：帳單列表金額使用 `bill.currency` 顯示正確貨幣符號
- `bill_detail_page.dart`：帳單詳情、品項金額、分攤金額使用正確貨幣
- `trip_stats_page.dart`：所有統計圖表（分類、成員、趨勢）使用旅程預設貨幣
- **總花費計算修正**：使用 `baseAmount`（已換算金額）而非 `amount`（原始金額）進行加總

#### 錯誤訊息關閉按鈕修復
修復 SnackBar 關閉按鈕無法點擊的問題：
- `shared/utils/error_handler.dart`：移除手動 `hideCurrentSnackBar()` 調用
- 原因：`SnackBarAction` 點擊後會自動關閉，手動調用時 context 可能已失效

#### Sprint 8 多國貨幣後端實作
完成後端多國貨幣支援：
- 建立 `20260130100000_add_multi_currency` 遷移（Currency enum、ExchangeRate 表、Trip/Bill 貨幣欄位）
- 實作 `exchange-rate` 模組（ExchangeRateService + Controller + DTO）
  - 支援 15 種貨幣：TWD, USD, JPY, EUR, KRW, CNY, HKD, GBP, THB, VND, SGD, MYR, PHP, IDR, AUD
  - 記憶體 + 資料庫雙層快取（1 小時 TTL）
  - 每小時自動更新匯率（Cron 排程）
  - API 不可用時使用預設匯率
- 更新 `bills.service.ts`：建立/更新帳單時自動計算 `exchangeRate` 和 `baseAmount`
- 更新 `settlement.service.ts`：使用 `baseAmount` 計算餘額和結算建議
- 新增 `features/exchange-rate/data/exchange_rate_repository.dart`（前端 API 呼叫）

---

## 目錄

1. [現有專案狀態分析](#一現有專案狀態分析)
2. [技術缺口分析](#二技術缺口分析)
3. [Sprint 1：付費框架 MVP](#三sprint-1付費框架-mvp)
4. [Sprint 2：智慧收據掃描](#四sprint-2智慧收據掃描)
5. [Sprint 3：電子發票 QR Code](#五sprint-3電子發票-qr-code)
6. [Sprint 4：付費牆整合](#六sprint-4付費牆整合)
7. [Sprint 6：語音快速記帳](#七sprint-6語音快速記帳)
8. [Sprint 8：多國貨幣支援](#八sprint-8多國貨幣支援)
9. [測試策略](#九測試策略)
10. [風險評估與緩解](#十風險評估與緩解)

---

## 一、現有專案狀態分析

### 1.1 已完成功能

| 領域 | 功能 | 實作狀態 |
|------|------|----------|
| **認證** | LINE 登入 | ✅ 完成 |
| **認證** | Google 登入 | ✅ 完成 |
| **認證** | JWT Token 管理 | ✅ 完成 |
| **旅程** | CRUD + 邀請碼 | ✅ 完成 |
| **旅程** | QR Code 分享/掃描 | ✅ 完成 |
| **帳單** | 5 種分攤方式 | ✅ 完成 |
| **帳單** | 收據圖片上傳 (S3) | ✅ 完成 |
| **結算** | 最佳化演算法 | ✅ 完成 |
| **通知** | FCM 推播 | ✅ 完成 |
| **廣告** | Banner 廣告 | ✅ 完成 |
| **UI** | 深淺色主題 | ✅ 完成 |

### 1.2 現有技術棧

```
後端                           前端
├── NestJS + TypeScript       ├── Flutter 3.x
├── Prisma ORM               ├── Riverpod 狀態管理
├── PostgreSQL               ├── Go Router 導航
├── Firebase Admin SDK       ├── Dio HTTP 客戶端
├── AWS S3                   ├── flutter_secure_storage
└── JWT 認證                  └── Google AdMob
```

### 1.3 部署環境

| 項目 | 服務 | 狀態 |
|------|------|------|
| **後端 API** | Google Cloud Run | ✅ 已部署 |
| **資料庫** | Google Cloud SQL (PostgreSQL) | ✅ 已部署 |
| **機密管理** | Google Secret Manager | ✅ 已設定 |
| **CI/CD** | Google Cloud Build | ✅ 已設定 |

**API 網址**：`https://tripledger-api-297896850903.asia-east1.run.app`

**本機開發環境**：
- ✅ Google Cloud CLI (`gcloud`) 已安裝
- ✅ Cloud SQL Proxy 可用於本機連線資料庫

**常用指令**：
```bash
# 部署 API 至 Cloud Run
gcloud builds submit --config cloudbuild.yaml

# 本機連線 Cloud SQL（需先啟動 Cloud SQL Proxy）
cloud-sql-proxy tripledger-project:asia-east1:tripledger-db

# 查看 Cloud Run 日誌
gcloud run services logs read tripledger-api --region asia-east1

# 查看 Secret Manager 密鑰
gcloud secrets list
```

### 1.4 現有目錄結構

```
apps/
├── api/src/
│   ├── common/
│   │   ├── decorators/      # @CurrentUser
│   │   ├── guards/          # JwtAuthGuard
│   │   ├── prisma/          # PrismaService
│   │   ├── firebase/        # FCM 推播
│   │   └── s3/              # 檔案上傳
│   │
│   └── modules/
│       ├── auth/            # 認證
│       ├── users/           # 用戶
│       ├── trips/           # 旅程
│       ├── bills/           # 帳單
│       ├── settlement/      # 結算
│       └── notifications/   # 通知
│
└── mobile/lib/
    ├── core/
    │   ├── config/          # 主題、路由、API
    │   ├── network/         # Dio 客戶端
    │   ├── storage/         # 安全儲存
    │   └── services/        # FCM、廣告
    │
    ├── features/
    │   ├── auth/
    │   ├── trips/
    │   ├── bills/
    │   ├── settlement/
    │   ├── notifications/
    │   └── settings/
    │
    └── shared/
        ├── models/
        ├── widgets/
        └── utils/
```

---

## 二、技術缺口分析

### 2.1 需要新增的後端模組

| 模組 | 用途 | 依賴 |
|------|------|------|
| `purchase/` | 內購驗證與記錄 | Apple/Google API |
| `ocr/` | 收據 OCR 辨識 | Claude API |
| `einvoice/` | 電子發票解析 | - |
| `voice/` | 語音解析 | Claude API |
| `mapping/` | 企業品牌對照 | - |

### 2.2 需要新增的資料表

```prisma
// 內購相關
model Purchase { ... }

// OCR 相關
model CompanyBrandMapping { ... }
model UserBrandMapping { ... }

// 電子發票相關
model ImportedInvoice { ... }
model UserCarrier { ... }     // Sprint 5 (長期)

// 用戶欄位擴充
model User {
  isAdFree      Boolean   @default(false)
  adFreeSince   DateTime?
}

model Trip {
  isPremium         Boolean   @default(false)
  premiumExpiresAt  DateTime?
}
```

### 2.3 需要新增的前端功能

| 功能目錄 | 用途 | Sprint |
|----------|------|--------|
| `features/purchase/` | 內購服務 | 1 |
| `features/ocr/` | 收據掃描 | 2 |
| `features/einvoice/` | 電子發票 | 3 |
| `features/voice/` | 語音記帳 | 6 |

### 2.4 需要新增的 Flutter 套件

| 套件 | 用途 | Sprint |
|------|------|--------|
| `in_app_purchase` | 內購 | 1 |
| `google_mlkit_text_recognition` | OCR | 2 |
| `speech_to_text` | 語音辨識 | 6 |
| `record` | 錄音 | 6 |
| `audio_waveforms` | 波形動畫 | 6 |
| `permission_handler` | 權限管理 | 2, 6 |

---

## 三、Sprint 1：付費框架 MVP

### 3.1 目標
建立完整的內購基礎架構，讓 App 具備收費能力。

### 3.2 後端實作

#### 3.2.1 資料庫遷移

**檔案**：`apps/api/prisma/schema.prisma`

```prisma
// 新增 Enum
enum ProductType {
  CONSUMABLE      // 消耗型（旅程進階）
  NON_CONSUMABLE  // 非消耗型（去廣告）
}

enum Platform {
  IOS
  ANDROID
}

// 新增購買記錄表
model Purchase {
  id            String      @id @default(uuid())
  userId        String
  user          User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  productId     String      // App Store / Google Play 產品 ID
  productType   ProductType

  // 消耗型專用
  tripId        String?
  trip          Trip?       @relation(fields: [tripId], references: [id], onDelete: SetNull)
  daysGranted   Int?

  // 收據驗證
  platform      Platform
  receiptData   String      @db.Text
  transactionId String      @unique

  // 時間
  purchasedAt   DateTime    @default(now())
  expiresAt     DateTime?

  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@index([userId])
  @@index([tripId])
}

// 修改 User
model User {
  // ... 現有欄位

  isAdFree      Boolean     @default(false)
  adFreeSince   DateTime?

  purchases     Purchase[]
}

// 修改 Trip
model Trip {
  // ... 現有欄位

  premiumExpiresAt  DateTime?

  purchases     Purchase[]
}
```

**執行**：
```bash
cd apps/api
npx prisma migrate dev --name add_purchase_system
npx prisma generate
```

#### 3.2.2 內購模組結構

**建立目錄**：
```
apps/api/src/modules/purchase/
├── purchase.module.ts
├── purchase.controller.ts
├── purchase.service.ts
├── dto/
│   ├── verify-purchase.dto.ts
│   └── restore-purchase.dto.ts
├── interfaces/
│   ├── apple-receipt.interface.ts
│   └── google-receipt.interface.ts
└── services/
    ├── apple-verification.service.ts
    └── google-verification.service.ts
```

#### 3.2.3 核心 API 端點

**檔案**：`apps/api/src/modules/purchase/purchase.controller.ts`

```typescript
@Controller('purchase')
@UseGuards(JwtAuthGuard)
export class PurchaseController {

  // 驗證購買收據
  @Post('verify')
  async verifyPurchase(
    @CurrentUser() user: User,
    @Body() dto: VerifyPurchaseDto
  ): Promise<PurchaseResponse>

  // 取得購買歷史
  @Get('history')
  async getPurchaseHistory(
    @CurrentUser() user: User
  ): Promise<Purchase[]>

  // 恢復購買（非消耗型）
  @Post('restore')
  async restorePurchase(
    @CurrentUser() user: User,
    @Body() dto: RestorePurchaseDto
  ): Promise<RestoreResponse>

  // 檢查旅程進階狀態
  @Get('trip/:tripId/status')
  async getTripPremiumStatus(
    @Param('tripId') tripId: string
  ): Promise<TripPremiumStatus>

  // 檢查用戶去廣告狀態
  @Get('ad-free-status')
  async getAdFreeStatus(
    @CurrentUser() user: User
  ): Promise<AdFreeStatus>
}
```

#### 3.2.4 Apple 收據驗證

**檔案**：`apps/api/src/modules/purchase/services/apple-verification.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { SignedDataVerifier } from '@apple/app-store-server-library';

@Injectable()
export class AppleVerificationService {
  private verifier: SignedDataVerifier;

  constructor() {
    // 初始化 App Store Server API v2
    this.verifier = new SignedDataVerifier(
      [/* Apple Root CA */],
      true, // enableOnlineChecks
      Environment.PRODUCTION,
      process.env.APPLE_BUNDLE_ID,
      process.env.APPLE_APP_ID,
    );
  }

  async verifyReceipt(receiptData: string): Promise<VerificationResult> {
    try {
      const decodedPayload = await this.verifier.verifyAndDecodeTransaction(receiptData);
      return {
        isValid: true,
        transactionId: decodedPayload.transactionId,
        productId: decodedPayload.productId,
        purchaseDate: new Date(decodedPayload.purchaseDate),
        expiresDate: decodedPayload.expiresDate
          ? new Date(decodedPayload.expiresDate)
          : null,
      };
    } catch (error) {
      return { isValid: false, error: error.message };
    }
  }
}
```

#### 3.2.5 Google 收據驗證

**檔案**：`apps/api/src/modules/purchase/services/google-verification.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';

@Injectable()
export class GoogleVerificationService {
  private androidPublisher;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    this.androidPublisher = google.androidpublisher({
      version: 'v3',
      auth,
    });
  }

  async verifyPurchase(
    productId: string,
    purchaseToken: string
  ): Promise<VerificationResult> {
    try {
      const response = await this.androidPublisher.purchases.products.get({
        packageName: process.env.ANDROID_PACKAGE_NAME,
        productId,
        token: purchaseToken,
      });

      return {
        isValid: response.data.purchaseState === 0, // 0 = purchased
        transactionId: response.data.orderId,
        productId,
        purchaseDate: new Date(parseInt(response.data.purchaseTimeMillis)),
      };
    } catch (error) {
      return { isValid: false, error: error.message };
    }
  }
}
```

### 3.3 前端實作

#### 3.3.1 建立目錄結構

```
apps/mobile/lib/features/purchase/
├── data/
│   └── purchase_repository.dart
├── domain/
│   ├── purchase_service.dart
│   └── models/
│       ├── product_model.dart
│       └── purchase_status_model.dart
├── presentation/
│   ├── purchase_page.dart
│   ├── paywall_dialog.dart
│   └── widgets/
│       ├── premium_badge.dart
│       ├── product_card.dart
│       └── restore_button.dart
└── providers/
    ├── purchase_provider.dart
    └── premium_status_provider.dart
```

#### 3.3.2 安裝套件

**檔案**：`apps/mobile/pubspec.yaml`

```yaml
dependencies:
  # 內購
  in_app_purchase: ^3.1.13
```

#### 3.3.3 內購服務封裝

**檔案**：`apps/mobile/lib/features/purchase/domain/purchase_service.dart`

```dart
import 'dart:async';
import 'package:in_app_purchase/in_app_purchase.dart';

class PurchaseService {
  static final PurchaseService _instance = PurchaseService._internal();
  factory PurchaseService() => _instance;
  PurchaseService._internal();

  final InAppPurchase _iap = InAppPurchase.instance;
  StreamSubscription<List<PurchaseDetails>>? _subscription;

  // 產品 ID 清單
  static const Set<String> _productIds = {
    'trip_premium_3d',
    'trip_premium_7d',
    'trip_premium_30d',
    'remove_ads_forever',
  };

  List<ProductDetails> _products = [];
  List<ProductDetails> get products => _products;

  // 初始化
  Future<void> initialize() async {
    final available = await _iap.isAvailable();
    if (!available) {
      throw Exception('內購功能不可用');
    }

    // 載入產品資訊
    final response = await _iap.queryProductDetails(_productIds);
    if (response.error != null) {
      throw Exception('載入產品失敗: ${response.error!.message}');
    }
    _products = response.productDetails;

    // 監聽購買事件
    _subscription = _iap.purchaseStream.listen(
      _onPurchaseUpdate,
      onError: _onPurchaseError,
    );
  }

  // 購買產品
  Future<void> buyProduct(ProductDetails product, {String? tripId}) async {
    final purchaseParam = PurchaseParam(
      productDetails: product,
      applicationUserName: tripId, // 用於消耗型綁定旅程
    );

    if (product.id == 'remove_ads_forever') {
      await _iap.buyNonConsumable(purchaseParam: purchaseParam);
    } else {
      await _iap.buyConsumable(purchaseParam: purchaseParam);
    }
  }

  // 恢復購買
  Future<void> restorePurchases() async {
    await _iap.restorePurchases();
  }

  // 處理購買更新
  void _onPurchaseUpdate(List<PurchaseDetails> purchases) async {
    for (final purchase in purchases) {
      if (purchase.status == PurchaseStatus.purchased ||
          purchase.status == PurchaseStatus.restored) {
        // 驗證收據 → 呼叫後端 API
        await _verifyAndDeliver(purchase);
      }

      if (purchase.pendingCompletePurchase) {
        await _iap.completePurchase(purchase);
      }
    }
  }

  Future<void> _verifyAndDeliver(PurchaseDetails purchase) async {
    // 呼叫後端驗證 API
    // PurchaseRepository.verify(...)
  }

  void _onPurchaseError(dynamic error) {
    // 錯誤處理
  }

  void dispose() {
    _subscription?.cancel();
  }
}
```

#### 3.3.4 狀態管理

**檔案**：`apps/mobile/lib/features/purchase/providers/premium_status_provider.dart`

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

// 用戶去廣告狀態
final isAdFreeProvider = FutureProvider<bool>((ref) async {
  final repo = ref.read(purchaseRepositoryProvider);
  return repo.getAdFreeStatus();
});

// 旅程進階狀態
final tripPremiumStatusProvider = FutureProvider.family<TripPremiumStatus, String>(
  (ref, tripId) async {
    final repo = ref.read(purchaseRepositoryProvider);
    return repo.getTripPremiumStatus(tripId);
  },
);

// 進階功能存取守衛
final canAccessPremiumFeatureProvider = Provider.family<bool, String>(
  (ref, tripId) {
    final status = ref.watch(tripPremiumStatusProvider(tripId));
    return status.maybeWhen(
      data: (s) => s.isPremium,
      orElse: () => false,
    );
  },
);
```

### 3.4 App Store / Google Play 設定

#### 3.4.1 App Store Connect

1. 前往 App Store Connect → 我的 App → 功能 → App 內購買項目
2. 建立以下產品：

| 產品 ID | 類型 | 參考名稱 | 價格 |
|---------|------|----------|------|
| `trip_premium_3d` | 消耗品 | 旅程進階 3 天 | NT$15 |
| `trip_premium_7d` | 消耗品 | 旅程進階 7 天 | NT$30 |
| `trip_premium_30d` | 消耗品 | 旅程進階 30 天 | NT$90 |
| `remove_ads_forever` | 非消耗品 | 永久去廣告 | NT$90 |

3. 設定 App Store Server Notification URL
4. 下載並設定 App Store Server API Key

#### 3.4.2 Google Play Console

1. 前往 Google Play Console → 應用程式 → 營利 → 產品
2. 建立對應的 4 個應用程式內產品
3. 設定 Google Cloud 服務帳號
4. 下載 JSON 金鑰檔案

### 3.5 環境變數新增

**檔案**：`apps/api/.env`

```env
# Apple IAP
APPLE_BUNDLE_ID=com.tripledger.tripledger
APPLE_APP_ID=your-app-id
APPLE_SHARED_SECRET=your-shared-secret

# Google IAP
ANDROID_PACKAGE_NAME=com.tripledger.tripledger
GOOGLE_SERVICE_ACCOUNT={"type":"service_account",...}
```

### 3.6 完成清單

- [x] 建立 Prisma 遷移檔案
- [x] 執行資料庫遷移
- [x] 建立 purchase 模組目錄結構
- [x] 實作 Apple 收據驗證服務（App Store Server API v2）
- [x] 實作 Google 收據驗證服務
- [x] 實作 PurchaseController
- [x] 實作 PurchaseService
- [x] 前端安裝 in_app_purchase 套件
- [x] 實作 PurchaseService (Flutter)
- [x] 實作 PurchaseRepository
- [x] 實作 Riverpod providers
- [x] App Store Connect 建立產品（4 個產品）
- [x] App Store Server API 金鑰設定
- [x] GCP Secret Manager 設定 Apple 憑證
- [ ] Google Play Console 建立產品（待 Google Play 上架後）
- [ ] 測試 Sandbox 購買流程

---

## 四、Sprint 2：智慧收據掃描

### 4.1 目標
實作 OCR 辨識 + 企業對照表，為後續功能奠定基礎。

### 4.2 後端實作

#### 4.2.1 資料庫擴充

**新增至 `schema.prisma`**：

```prisma
// 企業品牌對照表（全域共用）
model CompanyBrandMapping {
  id              String   @id @default(uuid())
  companyName     String   @unique  // 公司登記名稱
  taxId           String?  @unique  // 統一編號
  brandName       String             // 品牌名稱
  category        BillCategory?      // 預設分類
  aliases         String[]           // 別名列表
  isVerified      Boolean  @default(false)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([companyName])
  @@index([taxId])
}

// 用戶個人化對照（學習記憶）
model UserBrandMapping {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  companyName     String   // 原始公司名稱
  customBrandName String   // 用戶自訂品牌名稱
  useCount        Int      @default(1)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([userId, companyName])
  @@index([userId])
}

// 修改 User 新增關聯
model User {
  // ... 現有欄位
  brandMappings   UserBrandMapping[]
}
```

#### 4.2.2 OCR 模組結構

```
apps/api/src/modules/ocr/
├── ocr.module.ts
├── ocr.controller.ts
├── ocr.service.ts
├── dto/
│   ├── scan-receipt.dto.ts
│   └── learn-mapping.dto.ts
├── interfaces/
│   └── ocr-result.interface.ts
└── services/
    ├── text-parser.service.ts      # 文字解析
    ├── brand-lookup.service.ts     # 品牌對照查詢
    └── ai-suggestion.service.ts    # AI 推測（Claude）
```

#### 4.2.3 核心 API

```typescript
@Controller('ocr')
@UseGuards(JwtAuthGuard)
export class OcrController {

  // 掃描收據（前端上傳已辨識的文字）
  @Post('scan-receipt')
  async scanReceipt(
    @CurrentUser() user: User,
    @Body() dto: ScanReceiptDto
  ): Promise<OcrResult>

  // 查詢品牌對照
  @Get('company-mapping')
  async getCompanyMapping(
    @Query('companyName') companyName: string,
    @CurrentUser() user: User
  ): Promise<BrandMapping>

  // 用戶學習記憶
  @Post('learn')
  async learnMapping(
    @CurrentUser() user: User,
    @Body() dto: LearnMappingDto
  ): Promise<void>
}
```

#### 4.2.4 品牌查詢服務

```typescript
@Injectable()
export class BrandLookupService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiSuggestionService,
  ) {}

  async lookup(companyName: string, userId: string): Promise<BrandResult> {
    // 1. 優先查詢用戶個人化對照
    const userMapping = await this.prisma.userBrandMapping.findUnique({
      where: { userId_companyName: { userId, companyName } },
    });
    if (userMapping) {
      return {
        brandName: userMapping.customBrandName,
        source: 'USER_HISTORY',
        confidence: 1.0,
      };
    }

    // 2. 查詢全域對照表
    const globalMapping = await this.prisma.companyBrandMapping.findFirst({
      where: {
        OR: [
          { companyName: { contains: companyName } },
          { aliases: { has: companyName } },
        ],
      },
    });
    if (globalMapping) {
      return {
        brandName: globalMapping.brandName,
        category: globalMapping.category,
        source: 'MAPPING_TABLE',
        confidence: 0.95,
      };
    }

    // 3. AI 推測
    const aiResult = await this.aiService.suggestBrand(companyName);
    return {
      brandName: aiResult.suggestion,
      source: 'AI_SUGGEST',
      confidence: aiResult.confidence,
    };
  }
}
```

#### 4.2.5 企業對照 Seed 資料

**檔案**：`apps/api/prisma/seed-company-mappings.ts`

```typescript
const mappings = [
  // 便利商店
  { companyName: '統一超商股份有限公司', taxId: '22555003', brandName: '7-Eleven', category: 'FOOD' },
  { companyName: '全家便利商店股份有限公司', taxId: '23060248', brandName: '全家', category: 'FOOD' },
  { companyName: '萊爾富國際股份有限公司', taxId: '27363224', brandName: '萊爾富', category: 'FOOD' },
  { companyName: '來來超商股份有限公司', taxId: '97168356', brandName: 'OK超商', category: 'FOOD' },

  // 咖啡連鎖
  { companyName: '統一星巴克股份有限公司', taxId: '70771734', brandName: '星巴克', category: 'FOOD' },
  { companyName: '路易莎職人咖啡股份有限公司', taxId: '24772925', brandName: '路易莎', category: 'FOOD' },
  { companyName: '悠旅生活事業股份有限公司', taxId: '24549855', brandName: 'cama café', category: 'FOOD' },

  // 速食連鎖
  { companyName: '麥當勞餐廳股份有限公司', taxId: '11052402', brandName: '麥當勞', category: 'FOOD' },
  { companyName: '台灣肯德基股份有限公司', taxId: '11458601', brandName: '肯德基', category: 'FOOD' },
  { companyName: '摩斯食品股份有限公司', taxId: '84149540', brandName: '摩斯漢堡', category: 'FOOD' },
  { companyName: '頂呱呱國際股份有限公司', taxId: '12345678', brandName: '頂呱呱', category: 'FOOD' },

  // 餐飲集團
  { companyName: '王品餐飲股份有限公司', taxId: '22556299', brandName: '王品集團', category: 'FOOD' },
  { companyName: '瓦城泰統股份有限公司', taxId: '70770740', brandName: '瓦城', category: 'FOOD' },
  { companyName: '饗賓餐旅事業股份有限公司', taxId: '28843335', brandName: '饗食天堂', category: 'FOOD' },

  // 交通
  { companyName: '台灣高鐵股份有限公司', taxId: '70826898', brandName: '高鐵', category: 'TRANSPORT' },
  { companyName: '台灣鐵路股份有限公司', taxId: '03551401', brandName: '台鐵', category: 'TRANSPORT' },
  { companyName: '台北捷運公司', taxId: '96979933', brandName: '台北捷運', category: 'TRANSPORT' },

  // 旅遊
  { companyName: '雄獅資訊科技股份有限公司', taxId: '70553900', brandName: '雄獅旅遊', category: 'OTHER' },
  { companyName: '可樂旅遊股份有限公司', taxId: '16092721', brandName: '可樂旅遊', category: 'OTHER' },

  // 量販店
  { companyName: '好市多股份有限公司', taxId: '70771128', brandName: 'Costco', category: 'SHOPPING' },
  { companyName: '家福股份有限公司', taxId: '23149001', brandName: '家樂福', category: 'SHOPPING' },
  { companyName: '遠百企業股份有限公司', taxId: '11097716', brandName: '大潤發', category: 'SHOPPING' },

  // 藥妝
  { companyName: '統一超商股份有限公司', taxId: '22555003', brandName: '康是美', category: 'SHOPPING', aliases: ['康是美'] },
  { companyName: '屈臣氏百佳股份有限公司', taxId: '70761455', brandName: '屈臣氏', category: 'SHOPPING' },

  // ... 更多對照資料
];
```

### 4.3 前端實作

#### 4.3.1 建立目錄結構

```
apps/mobile/lib/features/ocr/
├── data/
│   └── ocr_repository.dart
├── domain/
│   ├── ocr_service.dart
│   └── models/
│       └── ocr_result_model.dart
├── presentation/
│   ├── scan_receipt_page.dart
│   ├── scan_result_page.dart
│   └── widgets/
│       ├── camera_overlay.dart
│       └── brand_suggestion_chip.dart
└── providers/
    └── ocr_provider.dart
```

#### 4.3.2 安裝套件

```yaml
dependencies:
  # OCR
  google_mlkit_text_recognition: ^0.11.0

  # 相機
  camera: ^0.10.5+9

  # 權限
  permission_handler: ^11.3.0
```

#### 4.3.3 OCR 服務

**檔案**：`apps/mobile/lib/features/ocr/domain/ocr_service.dart`

```dart
import 'dart:io';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

class OcrService {
  final TextRecognizer _textRecognizer = TextRecognizer(
    script: TextRecognitionScript.chinese,
  );

  Future<OcrRawResult> recognizeText(File imageFile) async {
    final inputImage = InputImage.fromFile(imageFile);
    final recognizedText = await _textRecognizer.processImage(inputImage);

    return OcrRawResult(
      rawText: recognizedText.text,
      blocks: recognizedText.blocks.map((block) => TextBlockInfo(
        text: block.text,
        boundingBox: block.boundingBox,
        confidence: block.recognizedLanguages.isNotEmpty ? 0.9 : 0.7,
      )).toList(),
    );
  }

  // 解析金額
  int? parseAmount(String text) {
    // 常見格式：NT$100, $100, 100元, 總計 100
    final patterns = [
      RegExp(r'NT\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)'),
      RegExp(r'\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)'),
      RegExp(r'(\d{1,3}(?:,\d{3})*)\s*元'),
      RegExp(r'總[計額金][:：]?\s*(\d{1,3}(?:,\d{3})*)'),
      RegExp(r'合[計總][:：]?\s*(\d{1,3}(?:,\d{3})*)'),
    ];

    for (final pattern in patterns) {
      final match = pattern.firstMatch(text);
      if (match != null) {
        final amountStr = match.group(1)!.replaceAll(',', '');
        return int.tryParse(amountStr.split('.').first);
      }
    }
    return null;
  }

  // 解析日期
  DateTime? parseDate(String text) {
    // 常見格式：2026/01/29, 2026-01-29, 115/01/29 (民國年)
    final patterns = [
      RegExp(r'(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})'),  // 西元年
      RegExp(r'(\d{2,3})[/\-.](\d{1,2})[/\-.](\d{1,2})'), // 民國年
    ];

    for (int i = 0; i < patterns.length; i++) {
      final match = patterns[i].firstMatch(text);
      if (match != null) {
        int year = int.parse(match.group(1)!);
        final month = int.parse(match.group(2)!);
        final day = int.parse(match.group(3)!);

        // 民國年轉西元年
        if (year < 200) {
          year += 1911;
        }

        try {
          return DateTime(year, month, day);
        } catch (_) {
          continue;
        }
      }
    }
    return null;
  }

  void dispose() {
    _textRecognizer.close();
  }
}
```

### 4.4 完成清單

- [x] 建立 Prisma 遷移（CompanyBrandMapping、UserBrandMapping）
- [x] 建立企業對照 Seed 資料（110 筆台灣常見品牌）
- [x] 執行 Seed（透過 Cloud SQL Proxy）
- [x] 建立 ocr 模組（TextParserService、BrandLookupService、AiSuggestionService）
- [x] 實作 BrandLookupService（用戶歷史 → 全域對照 → AI 建議）
- [x] 實作 AI 推測服務（Claude API, claude-sonnet-4-20250514）
- [x] 前端安裝 ML Kit 套件（google_mlkit_text_recognition、camera、permission_handler）
- [x] 實作 OcrService（中文文字辨識）
- [x] 實作金額/日期解析（支援 NT$、元、民國年）
- [x] 實作掃描頁面 UI（相機拍攝 + 相簿選擇）
- [x] 實作掃描結果頁面（可編輯品牌、金額、類別、付款人）
- [x] 整合至新增帳單流程（行程詳情頁新增掃描按鈕）
- [x] GCP Secret Manager 設定 Anthropic API Key
- [x] 部署至 Cloud Run

---

## 五、Sprint 3：電子發票 QR Code

### 5.1 目標
解析台灣電子發票 QR Code，快速建立帳單。

### 5.2 後端實作

#### 5.2.1 資料庫擴充

```prisma
enum ImportSource {
  QR_SCAN       // 掃描 QR Code
  CARRIER_API   // 載具 API（Sprint 5）
}

model ImportedInvoice {
  id              String       @id @default(uuid())

  invoiceNumber   String       @unique  // AB-12345678
  invoiceDate     DateTime
  sellerTaxId     String
  sellerName      String
  totalAmount     Int

  // 關聯帳單
  billId          String?      @unique
  bill            Bill?        @relation(fields: [billId], references: [id], onDelete: SetNull)

  // 匯入資訊
  importedBy      String
  importSource    ImportSource
  rawData         Json?

  createdAt       DateTime     @default(now())

  @@index([sellerTaxId])
  @@index([importedBy])
}

// 修改 Bill 新增關聯
model Bill {
  // ... 現有欄位
  importedInvoice ImportedInvoice?
}
```

#### 5.2.2 電子發票模組

```
apps/api/src/modules/einvoice/
├── einvoice.module.ts
├── einvoice.controller.ts
├── einvoice.service.ts
├── dto/
│   ├── parse-qr.dto.ts
│   └── convert-to-bill.dto.ts
└── utils/
    └── qr-parser.util.ts
```

#### 5.2.3 QR Code 解析器

**檔案**：`apps/api/src/modules/einvoice/utils/qr-parser.util.ts`

```typescript
export interface EInvoiceData {
  invoiceNumber: string;  // AB-12345678
  invoiceDate: Date;
  salesAmount: number;
  totalAmount: number;
  buyerTaxId: string;
  sellerTaxId: string;
  randomCode: string;
  encryptedData?: string;
}

export function parseEInvoiceQR(qrData: string): EInvoiceData | null {
  // 最短長度檢查
  if (qrData.length < 77) {
    return null;
  }

  try {
    // 字軌（2 碼英文）
    const track = qrData.substring(0, 2);
    // 號碼（8 碼數字）
    const number = qrData.substring(2, 10);
    // 民國年（3 碼）
    const rocYear = parseInt(qrData.substring(10, 13));
    // 月（2 碼）
    const month = parseInt(qrData.substring(13, 15));
    // 日（2 碼）
    const day = parseInt(qrData.substring(15, 17));
    // 隨機碼（4 碼）
    const randomCode = qrData.substring(17, 21);
    // 銷售額（8 碼，16 進位）
    const salesAmountHex = qrData.substring(21, 29);
    // 總額（8 碼，16 進位）
    const totalAmountHex = qrData.substring(29, 37);
    // 買方統編（8 碼）
    const buyerTaxId = qrData.substring(37, 45);
    // 賣方統編（8 碼）
    const sellerTaxId = qrData.substring(45, 53);
    // 加密資料
    const encryptedData = qrData.length > 53 ? qrData.substring(53) : undefined;

    // 民國年轉西元年
    const year = rocYear + 1911;

    return {
      invoiceNumber: `${track}-${number}`,
      invoiceDate: new Date(year, month - 1, day),
      salesAmount: parseInt(salesAmountHex, 16),
      totalAmount: parseInt(totalAmountHex, 16),
      buyerTaxId,
      sellerTaxId,
      randomCode,
      encryptedData,
    };
  } catch {
    return null;
  }
}
```

### 5.3 前端實作

#### 5.3.1 建立目錄結構

```
apps/mobile/lib/features/einvoice/
├── data/
│   └── einvoice_repository.dart
├── domain/
│   ├── einvoice_service.dart
│   └── models/
│       └── einvoice_model.dart
├── presentation/
│   ├── scan_invoice_page.dart
│   ├── invoice_result_page.dart
│   └── widgets/
│       └── invoice_preview_card.dart
└── providers/
    └── einvoice_provider.dart
```

#### 5.3.2 發票解析器（Flutter）

```dart
class EInvoiceQRParser {
  static EInvoiceData? parse(String qrData) {
    if (qrData.length < 77) return null;

    try {
      final track = qrData.substring(0, 2);
      final number = qrData.substring(2, 10);
      final rocYear = int.parse(qrData.substring(10, 13));
      final month = int.parse(qrData.substring(13, 15));
      final day = int.parse(qrData.substring(15, 17));
      final randomCode = qrData.substring(17, 21);
      final totalAmountHex = qrData.substring(29, 37);
      final sellerTaxId = qrData.substring(45, 53);

      return EInvoiceData(
        invoiceNumber: '$track-$number',
        date: DateTime(rocYear + 1911, month, day),
        totalAmount: int.parse(totalAmountHex, radix: 16),
        sellerTaxId: sellerTaxId,
        randomCode: randomCode,
      );
    } catch (_) {
      return null;
    }
  }
}
```

### 5.4 整合至現有 QR 掃描

修改 `qr_scanner_page.dart`，增加電子發票格式識別：

```dart
Future<void> _handleBarcode(BarcodeCapture capture) async {
  final code = capture.barcodes.first.rawValue;
  if (code == null) return;

  // 1. 檢查是否為旅程邀請碼
  if (code.startsWith('tripledger://join?code=') ||
      (code.length == 36 && code.contains('-'))) {
    await _handleInviteCode(code);
    return;
  }

  // 2. 檢查是否為電子發票 QR Code
  final invoiceData = EInvoiceQRParser.parse(code);
  if (invoiceData != null) {
    await _handleInvoice(invoiceData);
    return;
  }

  _showError('無法識別的 QR Code');
}
```

### 5.5 待辦清單

**後端**（已完成）：
- [x] 建立 Prisma 遷移（Schema 已更新）
- [x] 建立 einvoice 模組
- [x] 實作 QR Code 解析器
- [x] 實作發票 → 帳單轉換 API
- [x] 整合品牌對照查詢（透過統編查詢品牌）

**前端**（暫緩）：
- [ ] 前端實作發票解析器
- [ ] 修改 QR 掃描頁面支援發票
- [ ] 實作發票結果確認頁

---

## 六、Sprint 4：付費牆整合

### 6.1 目標
將 OCR 和發票功能設為進階版專屬，完成付費閉環。

### 6.2 功能鎖定機制

#### 6.2.1 後端 Guard

**檔案**：`apps/api/src/common/guards/premium.guard.ts`

```typescript
@Injectable()
export class PremiumGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tripId = request.params.tripId || request.body.tripId;

    if (!tripId) {
      throw new BadRequestException('需要 tripId');
    }

    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
    });

    if (!trip) {
      throw new NotFoundException('旅程不存在');
    }

    // 檢查進階狀態
    const isPremium = trip.premiumExpiresAt &&
                      trip.premiumExpiresAt > new Date();

    if (!isPremium) {
      throw new ForbiddenException({
        code: 'PREMIUM_REQUIRED',
        message: '此功能需要升級進階版',
      });
    }

    return true;
  }
}
```

#### 6.2.2 使用 Guard

```typescript
@Controller('ocr')
@UseGuards(JwtAuthGuard)
export class OcrController {

  @Post('scan-receipt')
  @UseGuards(PremiumGuard) // 需要進階版
  async scanReceipt(...) { }
}
```

### 6.3 前端付費牆

#### 6.3.1 付費牆對話框

**檔案**：`apps/mobile/lib/features/purchase/presentation/paywall_dialog.dart`

```dart
class PaywallDialog extends ConsumerWidget {
  final String tripId;
  final String featureName;

  const PaywallDialog({
    required this.tripId,
    required this.featureName,
  });

  static Future<bool?> show(
    BuildContext context, {
    required String tripId,
    required String featureName,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => PaywallDialog(
        tripId: tripId,
        featureName: featureName,
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final products = ref.watch(productsProvider);

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          Padding(
            padding: EdgeInsets.all(24),
            child: Column(
              children: [
                Icon(Icons.lock_open, size: 48, color: AppTheme.primaryColor),
                SizedBox(height: 16),
                Text('解鎖「$featureName」', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                SizedBox(height: 8),
                Text('升級進階版即可使用此功能', style: TextStyle(color: Colors.grey)),
              ],
            ),
          ),

          // 功能清單
          _buildFeatureList(),

          // 價格方案
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                _buildPriceCard(products[0], '3 天'),
                _buildPriceCard(products[1], '7 天', recommended: true),
                _buildPriceCard(products[2], '30 天'),
              ],
            ),
          ),

          // 購買按鈕
          Padding(
            padding: EdgeInsets.all(16),
            child: ElevatedButton(
              onPressed: () => _purchase(ref),
              child: Text('立即升級'),
            ),
          ),

          // 備註
          Padding(
            padding: EdgeInsets.only(bottom: 32),
            child: Text(
              '僅限此旅程・到期後自動降級',
              style: TextStyle(color: Colors.grey, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}
```

#### 6.3.2 功能入口檢查

```dart
// 掃描收據按鈕
Widget _buildScanButton(BuildContext context, WidgetRef ref, String tripId) {
  final isPremium = ref.watch(canAccessPremiumFeatureProvider(tripId));

  return IconButton(
    icon: Stack(
      children: [
        Icon(Icons.document_scanner),
        if (!isPremium)
          Positioned(
            right: 0,
            bottom: 0,
            child: Icon(Icons.lock, size: 12, color: Colors.orange),
          ),
      ],
    ),
    onPressed: () async {
      if (isPremium) {
        context.push('/trips/$tripId/scan-receipt');
      } else {
        final purchased = await PaywallDialog.show(
          context,
          tripId: tripId,
          featureName: '智慧收據掃描',
        );
        if (purchased == true) {
          context.push('/trips/$tripId/scan-receipt');
        }
      }
    },
  );
}
```

### 6.4 免費版限制

#### 6.4.1 成員數量限制

```typescript
// trips.service.ts
async joinTrip(inviteCode: string, userId: string) {
  const trip = await this.prisma.trip.findFirst({
    where: { inviteCode },
    include: { members: true },
  });

  // 檢查是否為進階版
  const isPremium = trip.premiumExpiresAt &&
                    trip.premiumExpiresAt > new Date();

  // 免費版限制 5 人
  if (!isPremium && trip.members.length >= 5) {
    throw new ForbiddenException({
      code: 'MEMBER_LIMIT_REACHED',
      message: '免費版最多 5 位成員，請升級進階版',
    });
  }

  // ... 加入邏輯
}
```

#### 6.4.2 帳單數量限制

```typescript
// bills.service.ts
async createBill(tripId: string, dto: CreateBillDto) {
  const trip = await this.prisma.trip.findUnique({
    where: { id: tripId },
    include: { bills: true },
  });

  const isPremium = trip.premiumExpiresAt &&
                    trip.premiumExpiresAt > new Date();

  // 免費版限制 50 筆
  if (!isPremium && trip.bills.length >= 50) {
    throw new ForbiddenException({
      code: 'BILL_LIMIT_REACHED',
      message: '免費版最多 50 筆帳單，請升級進階版',
    });
  }

  // ... 建立邏輯
}
```

### 6.5 待辦清單

- [x] 實作 PremiumGuard
- [x] 在 OCR/發票 API 加上 Guard
- [x] 實作付費牆 Dialog
- [x] 實作購買頁面
- [x] 實作進階版徽章元件
- [x] 在旅程詳情頁加入升級入口
- [x] 實作成員數量限制
- [x] 實作帳單數量限制
- [x] 實作恢復購買功能
- [x] 設定頁新增去廣告入口
- [x] 實作廣告顯示/隱藏邏輯（main_shell.dart 整合 isAdFreeProvider）
- [x] 測試完整購買流程（iOS Sandbox 已測試）

---

## 七、Sprint 6：語音快速記帳

### 7.1 目標
實作語音輸入 + AI 解析，快速新增帳單。

### 7.2 後端實作

#### 7.2.1 語音模組結構

```
apps/api/src/modules/voice/
├── voice.module.ts
├── voice.controller.ts
├── voice.service.ts
├── dto/
│   ├── parse-bill.dto.ts
│   └── learn-correction.dto.ts
└── services/
    └── llm-parser.service.ts
```

#### 7.2.2 LLM 解析服務

**檔案**：`apps/api/src/modules/voice/services/llm-parser.service.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class LlmParserService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async parseBillFromText(
    transcript: string,
    memberNames: string[],
    today: Date,
  ): Promise<ParsedBill> {
    const prompt = `你是一個帳單解析助手。請從用戶的語音輸入中提取以下資訊：

旅程成員列表：${memberNames.join('、')}
今天日期：${today.toISOString().split('T')[0]}

用戶輸入：「${transcript}」

請以 JSON 格式回傳：
{
  "title": "帳單標題（店家或消費項目）",
  "amount": 金額（數字）,
  "date": "日期（ISO 格式，如 2026-01-29）",
  "category": "分類（FOOD/TRANSPORT/ACCOMMODATION/ATTRACTION/SHOPPING/OTHER）",
  "payerName": "付款人名稱（若提及「我」則回傳 __SELF__）",
  "splitType": "分帳方式（EQUAL/EXACT）",
  "participants": ["參與者名稱列表，若為「全員」或「大家」則回傳空陣列"],
  "confidence": 信心度（0-1）,
  "notes": "無法解析的其他資訊"
}

注意：
1. 「昨天」表示 ${this.getYesterday(today)}
2. 「前天」表示 ${this.getDayBefore(today)}
3. 成員名稱要與列表中的名稱匹配（可模糊匹配）
4. 若提到「我付的」、「我請客」，payerName 回傳 __SELF__
5. 若提到「平分」、「均分」、「AA」，splitType 回傳 EQUAL`;

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('無法解析回應');
    }

    // 解析 JSON
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('無法找到 JSON');
    }

    return JSON.parse(jsonMatch[0]);
  }

  private getYesterday(today: Date): string {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }

  private getDayBefore(today: Date): string {
    const d = new Date(today);
    d.setDate(d.getDate() - 2);
    return d.toISOString().split('T')[0];
  }
}
```

### 7.3 前端實作

#### 7.3.1 安裝套件

```yaml
dependencies:
  speech_to_text: ^6.6.0
  record: ^5.0.4
  audio_waveforms: ^1.0.5
  permission_handler: ^11.3.0
```

#### 7.3.2 語音辨識服務

**檔案**：`apps/mobile/lib/features/voice/domain/speech_service.dart`

```dart
import 'package:speech_to_text/speech_to_text.dart';

class SpeechService {
  final SpeechToText _speech = SpeechToText();
  bool _isInitialized = false;

  Future<bool> initialize() async {
    if (_isInitialized) return true;

    _isInitialized = await _speech.initialize(
      onStatus: _onStatus,
      onError: _onError,
    );
    return _isInitialized;
  }

  Future<void> startListening({
    required Function(String) onResult,
    required Function(String) onPartialResult,
    String localeId = 'zh_TW',
  }) async {
    if (!_isInitialized) {
      await initialize();
    }

    await _speech.listen(
      onResult: (result) {
        if (result.finalResult) {
          onResult(result.recognizedWords);
        } else {
          onPartialResult(result.recognizedWords);
        }
      },
      localeId: localeId,
      listenMode: ListenMode.dictation,
      partialResults: true,
    );
  }

  Future<void> stopListening() async {
    await _speech.stop();
  }

  void _onStatus(String status) {
    // 處理狀態變化
  }

  void _onError(dynamic error) {
    // 處理錯誤
  }
}
```

#### 7.3.3 語音輸入按鈕

**檔案**：`apps/mobile/lib/features/voice/presentation/voice_input_button.dart`

```dart
class VoiceInputButton extends ConsumerStatefulWidget {
  final String tripId;
  final Function(ParsedBill) onResult;

  const VoiceInputButton({
    required this.tripId,
    required this.onResult,
  });

  @override
  ConsumerState<VoiceInputButton> createState() => _VoiceInputButtonState();
}

class _VoiceInputButtonState extends ConsumerState<VoiceInputButton> {
  final _speechService = SpeechService();
  bool _isListening = false;
  String _partialText = '';

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onLongPressStart: (_) => _startListening(),
      onLongPressEnd: (_) => _stopListening(),
      child: AnimatedContainer(
        duration: Duration(milliseconds: 200),
        padding: EdgeInsets.all(_isListening ? 20 : 16),
        decoration: BoxDecoration(
          gradient: _isListening
              ? AppTheme.accentGradient
              : AppTheme.primaryGradient,
          borderRadius: BorderRadius.circular(16),
          boxShadow: _isListening ? [
            BoxShadow(
              color: AppTheme.primaryColor.withOpacity(0.4),
              blurRadius: 20,
              spreadRadius: 5,
            ),
          ] : [],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              _isListening ? Icons.mic : Icons.mic_none,
              color: Colors.white,
            ),
            SizedBox(width: 8),
            Text(
              _isListening ? '放開以完成' : '按住說話',
              style: TextStyle(color: Colors.white),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _startListening() async {
    final hasPermission = await _checkPermission();
    if (!hasPermission) return;

    setState(() {
      _isListening = true;
      _partialText = '';
    });

    await _speechService.startListening(
      onResult: _onSpeechResult,
      onPartialResult: (text) {
        setState(() => _partialText = text);
      },
    );
  }

  Future<void> _stopListening() async {
    await _speechService.stopListening();
    setState(() => _isListening = false);
  }

  Future<void> _onSpeechResult(String transcript) async {
    if (transcript.isEmpty) return;

    // 呼叫 API 解析
    final repo = ref.read(voiceRepositoryProvider);
    final result = await repo.parseBill(
      tripId: widget.tripId,
      transcript: transcript,
    );

    widget.onResult(result);
  }

  Future<bool> _checkPermission() async {
    final status = await Permission.microphone.request();
    return status.isGranted;
  }
}
```

### 7.4 待辦清單

- [ ] 建立 voice 模組
- [ ] 實作 LlmParserService
- [ ] 實作 POST /voice/parse-bill API
- [ ] 前端安裝語音相關套件
- [ ] 實作 SpeechService
- [ ] 實作語音輸入按鈕元件
- [ ] 實作錄音波形動畫
- [ ] 實作解析結果確認頁
- [ ] 整合至新增帳單流程
- [ ] 測試各種口語表達

---

## 八、Sprint 8：多國貨幣支援

### 8.1 目標
支援多國貨幣記帳，整合即時匯率 API，自動換算至旅程預設貨幣進行結算。

### 8.2 設計決策

| 決策點 | 選擇 | 理由 |
|--------|------|------|
| 貨幣層級 | 旅程預設 + 帳單可覆蓋 | 兼顧便利性與彈性 |
| 結算貨幣 | 轉換為旅程預設貨幣 | 簡化結算邏輯 |
| 匯率儲存 | 記錄帳單建立時匯率 | 確保歷史資料一致性 |
| 匯率來源 | ExchangeRate-API | 免費額度足夠（1500/月） |
| 匯率快取 | 資料庫 + 記憶體 | 1 小時有效期 |

### 8.3 支援貨幣

```
TWD, USD, JPY, EUR, KRW, CNY, HKD, GBP, THB, VND, SGD, MYR, PHP, IDR, AUD
```

### 8.4 資料庫 Schema 變更

**檔案**：`apps/api/prisma/schema.prisma`

```prisma
enum Currency {
  TWD  // 新台幣
  USD  // 美元
  JPY  // 日圓
  EUR  // 歐元
  KRW  // 韓元
  CNY  // 人民幣
  HKD  // 港幣
  GBP  // 英鎊
  THB  // 泰銖
  VND  // 越南盾
  SGD  // 新加坡幣
  MYR  // 馬來西亞令吉
  PHP  // 菲律賓披索
  IDR  // 印尼盾
  AUD  // 澳幣
}

// 修改 Trip 模型
model Trip {
  // 現有欄位...
  defaultCurrency Currency @default(TWD) @map("default_currency")
}

// 修改 Bill 模型
model Bill {
  // 現有欄位...
  currency     Currency @default(TWD)
  exchangeRate Decimal? @db.Decimal(18, 8) @map("exchange_rate")
  baseAmount   Decimal? @db.Decimal(12, 2) @map("base_amount")
}

// 新增匯率快取表
model ExchangeRate {
  id             String   @id @default(uuid())
  baseCurrency   Currency @map("base_currency")
  targetCurrency Currency @map("target_currency")
  rate           Decimal  @db.Decimal(18, 8)
  fetchedAt      DateTime @map("fetched_at")
  createdAt      DateTime @default(now()) @map("created_at")

  @@unique([baseCurrency, targetCurrency])
  @@map("exchange_rates")
}
```

**執行遷移**：
```bash
cd apps/api && npx prisma migrate dev --name add_multi_currency
```

### 8.5 後端實作

#### 8.5.1 匯率模組結構

```
apps/api/src/modules/exchange-rate/
├── exchange-rate.module.ts
├── exchange-rate.service.ts
├── exchange-rate.controller.ts
└── dto/exchange-rate.dto.ts
```

#### 8.5.2 ExchangeRateService 核心功能

```typescript
@Injectable()
export class ExchangeRateService {
  // 取得匯率（優先快取）
  async getRate(from: Currency, to: Currency): Promise<Decimal>

  // 轉換金額
  async convert(amount: number, from: Currency, to: Currency): Promise<number>

  // 更新快取（每小時排程）
  @Cron('0 * * * *')
  async refreshRates(): Promise<void>
}
```

#### 8.5.3 API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/exchange-rates` | 取得匯率列表 |
| GET | `/exchange-rates/:base/:target` | 取得特定匯率 |
| POST | `/exchange-rates/convert` | 轉換金額 |

#### 8.5.4 修改現有模組

**trips DTO**：
- `CreateTripDto` 新增 `defaultCurrency?: Currency`
- `UpdateTripDto` 新增 `defaultCurrency?: Currency`

**bills DTO**：
- `CreateBillDto` 新增 `currency?: Currency`
- `UpdateBillDto` 新增 `currency?: Currency`

**bills.service.ts**：
建立帳單時：
1. 取得帳單貨幣（傳入值或旅程預設）
2. 若與旅程貨幣不同，呼叫匯率服務轉換
3. 記錄 `exchangeRate` 和 `baseAmount`

**settlement.service.ts**：
結算計算改用 `baseAmount`（已統一為旅程貨幣）

### 8.6 前端實作

#### 8.6.1 新增工具類別

**檔案**：`apps/mobile/lib/core/utils/currency_utils.dart`

```dart
enum SupportedCurrency {
  TWD('TWD', 'NT\$', '新台幣', 0),
  USD('USD', '\$', '美元', 2),
  JPY('JPY', '¥', '日圓', 0),
  EUR('EUR', '€', '歐元', 2),
  KRW('KRW', '₩', '韓元', 0),
  CNY('CNY', '¥', '人民幣', 2),
  HKD('HKD', 'HK\$', '港幣', 2),
  GBP('GBP', '£', '英鎊', 2),
  THB('THB', '฿', '泰銖', 2),
  VND('VND', '₫', '越南盾', 0),
  SGD('SGD', 'S\$', '新加坡幣', 2),
  MYR('MYR', 'RM', '馬來西亞令吉', 2),
  PHP('PHP', '₱', '菲律賓披索', 2),
  IDR('IDR', 'Rp', '印尼盾', 0),
  AUD('AUD', 'A\$', '澳幣', 2);

  final String code;
  final String symbol;
  final String name;
  final int decimalPlaces;

  const SupportedCurrency(this.code, this.symbol, this.name, this.decimalPlaces);

  String format(double amount) {
    if (decimalPlaces == 0) {
      return '$symbol ${amount.round()}';
    }
    return '$symbol ${amount.toStringAsFixed(decimalPlaces)}';
  }
}
```

#### 8.6.2 新增元件

**檔案**：`apps/mobile/lib/shared/widgets/currency_picker.dart`
- 可搜尋的貨幣選擇器元件

#### 8.6.3 新增 Repository

**檔案**：`apps/mobile/lib/features/exchange-rate/data/exchange_rate_repository.dart`
- 匯率 API 呼叫

#### 8.6.4 更新模型

- `trip_model.dart` 新增 `defaultCurrency`
- `bill_model.dart` 新增 `currency`, `exchangeRate`, `baseAmount`

#### 8.6.5 UI 修改

| 頁面 | 修改 |
|------|------|
| `edit_trip_page.dart` | 新增預設貨幣選擇器 |
| `add_bill_page.dart` | 新增貨幣選擇（預設使用旅程貨幣），選擇非預設貨幣時顯示匯率換算預覽 |
| `settlement_page.dart` | 金額顯示使用旅程預設貨幣，帳單列表顯示原始貨幣與換算後金額 |
| 全域 | 替換硬編碼的 `NT$ ${amount}` 為 `currency.format(amount)` |

### 8.7 風險緩解

| 風險 | 緩解措施 |
|------|----------|
| 匯率 API 不可用 | 使用最近成功的匯率 + 允許手動輸入 |
| 匯率波動 | 記錄建立時匯率快照，不重新計算 |
| 舊版 App 相容 | 未傳 currency 預設 TWD |

### 8.8 待辦清單

**後端（已完成）**：
- [x] 建立 Prisma 遷移（Currency enum、ExchangeRate 表）
- [x] 修改 Trip、Bill 模型新增貨幣欄位
- [x] 建立 exchange-rate 模組
- [x] 實作 ExchangeRateService（快取 + API 呼叫）
- [x] 新增排程更新匯率（每小時自動更新）
- [x] 修改 trips DTO 與 service
- [x] 修改 bills DTO 與 service（自動換算 baseAmount）
- [x] 修改 settlement service（使用 baseAmount 計算）

**部署（已完成）**：
- [ ] GCP Secret Manager 設定 ExchangeRate API Key（可選，目前使用預設匯率）
- [x] 部署至 Cloud Run
- [x] 執行資料庫遷移（Cloud SQL）

**前端（已完成）**：
- [x] 前端新增 currency_utils.dart
- [x] 前端新增 currency_picker.dart
- [x] 前端新增 exchange_rate_repository.dart
- [x] 更新 trip_model.dart、bill_model.dart
- [x] 修改 edit_trip_page.dart（貨幣選擇器）
- [x] 修改 add_bill_page.dart（貨幣選擇 + 金額顯示）
- [x] 修改 edit_bill_page.dart（編輯帳單貨幣選擇）
- [x] 修改 settlement_page.dart（多幣種顯示）
- [x] 全域金額格式化（替換硬編碼 NT$）
- [x] 帳單詳情頁貨幣顯示修復（bill_detail_page.dart）
- [x] 統計頁面貨幣顯示修復（trip_stats_page.dart）
- [x] 總花費計算修正（使用 baseAmount 換算後金額加總）

**測試（已完成）**：
- [x] 測試多幣種帳單建立與結算（iOS TestFlight Build 27）

---

## 九、測試策略

### 9.1 單元測試

| 模組 | 測試重點 |
|------|----------|
| OCR 解析 | 金額/日期正規表達式 |
| 發票 QR | 各種格式解析 |
| 品牌對照 | 查詢邏輯正確性 |
| 語音解析 | LLM prompt 輸出格式 |

### 9.2 整合測試

| 流程 | 測試項目 |
|------|----------|
| 內購 | Sandbox 完整購買流程 |
| OCR | 圖片上傳 → 辨識 → 建立帳單 |
| 發票 | QR 掃描 → 解析 → 建立帳單 |
| 語音 | 錄音 → 辨識 → 解析 → 確認 |

### 9.3 E2E 測試

- [ ] 新用戶註冊 → 建立旅程 → 升級進階 → 使用進階功能
- [ ] 免費版限制測試（成員、帳單上限）
- [ ] 跨裝置恢復購買測試
- [ ] 進階版到期降級測試

### 9.4 測試帳號設定

**iOS Sandbox**：
1. App Store Connect → 用戶與存取權限 → 沙盒測試人員
2. 新增測試 Apple ID

**Android 測試軌道**：
1. Google Play Console → 內部測試
2. 新增測試人員 email

---

## 十、風險評估與緩解

| 風險 | 機率 | 影響 | 緩解措施 |
|------|------|------|----------|
| Apple IAP 審核被拒 | 中 | 高 | 詳讀審核指南、準備申訴 |
| OCR 準確度不足 | 中 | 中 | 提供手動修正、優化訓練資料 |
| LLM API 成本過高 | 低 | 中 | 設定用量上限、考慮本地模型 |
| 語音辨識中文問題 | 中 | 中 | 測試多種口音、提供文字備案 |
| 電子發票格式變更 | 低 | 中 | 監控財政部公告、版本化解析器 |

---

## 附錄 A：環境變數清單

```env
# 現有
DATABASE_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
FIREBASE_PROJECT_ID=
AWS_S3_BUCKET=

# Sprint 1 新增
APPLE_BUNDLE_ID=com.tripledger.tripledger
APPLE_SHARED_SECRET=
ANDROID_PACKAGE_NAME=com.tripledger.tripledger
GOOGLE_SERVICE_ACCOUNT=

# Sprint 2 新增
ANTHROPIC_API_KEY=

# Sprint 8 新增（待設定）
EXCHANGE_RATE_API_KEY=  # ExchangeRate-API.com 免費金鑰

# Demo 登入（審查用，必須設定）
ALLOW_DEMO_LOGIN=true   # 是否允許 Demo 登入
DEMO_USERNAME=          # Demo 帳號（必填）
DEMO_PASSWORD=          # Demo 密碼（必填）
```

---

## 附錄 B：檔案變更清單

### 後端新增檔案

```
apps/api/src/modules/
├── purchase/           # Sprint 1 ✅
├── ocr/                # Sprint 2 ✅
├── einvoice/           # Sprint 3 ✅
├── voice/              # Sprint 6 (待開發)
└── exchange-rate/      # Sprint 8 ✅

apps/api/src/common/guards/
└── premium.guard.ts    # Sprint 4 ✅
```

### 前端新增檔案

```
apps/mobile/lib/features/
├── purchase/           # Sprint 1 ✅
├── ocr/                # Sprint 2 ✅
├── einvoice/           # Sprint 3 (暫緩)
├── voice/              # Sprint 6 (待開發)
└── exchange-rate/      # Sprint 8 ✅

apps/mobile/lib/core/utils/
└── currency_utils.dart # Sprint 8 ✅

apps/mobile/lib/shared/widgets/
└── currency_picker.dart # Sprint 8 ✅
```

### Prisma 遷移

```
apps/api/prisma/migrations/
├── YYYYMMDD_add_purchase_system/              # Sprint 1 ✅
├── YYYYMMDD_add_company_mapping/              # Sprint 2 ✅
├── YYYYMMDD_add_imported_invoice/             # Sprint 3 ✅
├── 20260130100000_add_multi_currency/         # Sprint 8 ✅
├── 20260131000000_add_notification_currency/  # 審查修復 ✅
└── 20260131000001_add_ondelete_and_indexes/   # 審查修復 ✅
```

---

> **文件版本**：1.4
>
> **建立日期**：2026-01-29
>
> **最後更新**：2026-01-31
>
> **關聯文件**：[IAP_PLAN.md](./IAP_PLAN.md)
