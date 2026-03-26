# TripLedger 內購功能計劃書

> 最後更新：2026-01-29

---

## 一、功能概述

TripLedger 將實作兩種內購模式：

| 類型 | 產品名稱 | 綁定對象 | 說明 |
|------|----------|----------|------|
| 消耗型 (Consumable) | 旅程進階功能啟用券 | 旅程 (Trip) | 購買後指定旅程可在期限內使用進階功能 |
| 非消耗型 (Non-Consumable) | 永久去廣告 | 用戶 (User) | 一次購買，永久移除所有廣告 |

---

## 二、產品定義

### 2.1 消耗型：旅程進階功能啟用券

**產品 ID 命名規則**：`trip_premium_<天數>d`

| 產品 ID | 天數 | 建議售價 (TWD) | 建議售價 (USD) |
|---------|------|----------------|----------------|
| `trip_premium_3d` | 3 天 | NT$15 | $0.99 |
| `trip_premium_7d` | 7 天 | NT$30 | $1.99 |
| `trip_premium_30d` | 30 天 | NT$90 | $4.99 |

**購買流程**：
1. 用戶在旅程詳情頁點擊「升級進階版」
2. 選擇天數方案
3. 完成 App Store / Google Play 付款
4. 後端驗證收據並記錄啟用時間
5. 該旅程立即解鎖進階功能

**特性**：
- 綁定單一旅程，不可轉移
- 可重複購買延長時間（時間累加）
- 到期後自動降級為免費版
- 旅程所有成員皆可享用進階功能（購買者付費，全員受益）

### 2.2 非消耗型：永久去廣告

**產品 ID**：`remove_ads_forever`

| 產品 ID | 說明 | 建議售價 (TWD) | 建議售價 (USD) |
|---------|------|----------------|----------------|
| `remove_ads_forever` | 永久移除廣告 | NT$90 | $2.99 |

**購買流程**：
1. 用戶在設定頁點擊「移除廣告」
2. 完成 App Store / Google Play 付款
3. 後端驗證收據並更新用戶狀態
4. 立即隱藏所有廣告

**特性**：
- 綁定用戶帳號，跨裝置同步
- 一次購買，永久有效
- 支援「恢復購買」功能

---

## 三、進階功能清單

購買「旅程進階功能啟用券」後可解鎖的功能：

| 功能 | 免費版 | 進階版 | 說明 |
|------|--------|--------|------|
| 基本記帳 | ✅ | ✅ | 新增/編輯/刪除帳單 |
| 基本結算 | ✅ | ✅ | 查看誰欠誰多少錢 |
| 成員管理 | ✅ | ✅ | 邀請/移除成員 |
| **🌟 智慧收據掃描** | ❌ | ✅ | **主打功能** - 拍照自動辨識金額、日期、店家 |
| **🌟 電子發票整合** | ❌ | ✅ | **主打功能** - 掃描發票 QR / 載具批量匯入 |
| **🌟 語音快速記帳** | ❌ | ✅ | **主打功能** - 說話即可自動建立帳單 |
| 詳細統計圖表 | ❌ | ✅ | 分類圓餅圖、消費趨勢、成員比較 |
| 匯出報表 | ❌ | ✅ | 匯出 PDF / Excel |
| 帳單照片附件 | ❌ | ✅ | 拍照保存收據 |
| 成員數量 | 最多 5 人 | 無限制 | 免費版限制成員數 |
| 帳單數量 | 最多 50 筆 | 無限制 | 免費版限制帳單數 |

> **備註**：以上限制為建議值，可依實際情況調整

---

## 三之二、主打進階功能：智慧收據掃描 (OCR)

### 功能說明

拍照收據/發票 → AI 自動辨識並填入帳單欄位：
- 金額
- 日期
- 店家名稱（智慧轉換）
- 自動分類建議

### 台灣發票特殊處理：企業名稱 → 店家品牌

**問題**：台灣發票顯示的是公司登記名稱，而非消費者熟悉的店家品牌

| 發票顯示 | 用戶期望 |
|----------|----------|
| 統一超商股份有限公司 | 7-Eleven |
| 全家便利商店股份有限公司 | 全家 |
| 統一星巴克股份有限公司 | 星巴克 |
| 王品餐飲股份有限公司 | 王品 / 陶板屋 / 西堤 |

### 解決方案：三層智慧轉換

```
┌─────────────────────────────────────────────────────────┐
│                    收據掃描流程                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   📷 拍照收據                                           │
│        ↓                                                │
│   🔍 OCR 辨識文字（Google ML Kit / Apple Vision）        │
│        ↓                                                │
│   ┌─────────────────────────────────────────────────┐   │
│   │ 第一層：企業對照表查詢                            │   │
│   │ • 預建常見企業 → 品牌名稱對照資料庫               │   │
│   │ • 涵蓋 80% 常見商家（便利商店、連鎖餐飲等）       │   │
│   │ • 離線可用、即時回應                             │   │
│   └─────────────────────────────────────────────────┘   │
│        ↓ (若查無對照)                                   │
│   ┌─────────────────────────────────────────────────┐   │
│   │ 第二層：AI 智慧推測                              │   │
│   │ • 分析企業名稱 + 消費金額 + 品項                  │   │
│   │ • 使用 LLM API 推測可能的店家品牌                 │   │
│   │ • 提供信心度分數                                 │   │
│   └─────────────────────────────────────────────────┘   │
│        ↓                                                │
│   ┌─────────────────────────────────────────────────┐   │
│   │ 第三層：用戶確認 + 學習記憶                       │   │
│   │ • 顯示辨識結果供用戶確認/修正                     │   │
│   │ • 記錄用戶修正，建立個人化對照表                  │   │
│   │ • 下次遇到相同企業自動套用                       │   │
│   └─────────────────────────────────────────────────┘   │
│        ↓                                                │
│   ✅ 自動填入帳單表單                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 企業對照表資料結構

```typescript
// 後端資料表
model CompanyBrandMapping {
  id              String   @id @default(uuid())
  companyName     String   @unique  // 公司登記名稱
  taxId           String?  @unique  // 統一編號（可選）
  brandName       String             // 品牌名稱
  category        String?            // 預設分類
  aliases         String[]           // 別名列表
  isVerified      Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// 用戶個人化對照（學習記憶）
model UserBrandMapping {
  id              String   @id @default(uuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  companyName     String   // 原始公司名稱
  customBrandName String   // 用戶自訂品牌名稱
  useCount        Int      @default(1)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([userId, companyName])
}
```

### 預建對照表範例

| 公司登記名稱 | 統一編號 | 品牌名稱 | 預設分類 |
|-------------|----------|----------|----------|
| 統一超商股份有限公司 | 22555003 | 7-Eleven | FOOD |
| 全家便利商店股份有限公司 | 23060248 | 全家 | FOOD |
| 萊爾富國際股份有限公司 | 27363224 | 萊爾富 | FOOD |
| 統一星巴克股份有限公司 | 70771734 | 星巴克 | FOOD |
| 路易莎職人咖啡股份有限公司 | 24772925 | 路易莎 | FOOD |
| 王品餐飲股份有限公司 | 22556299 | 王品集團 | FOOD |
| 瓦城泰統股份有限公司 | 70770740 | 瓦城 | FOOD |
| 麥當勞餐廳股份有限公司 | 11052402 | 麥當勞 | FOOD |
| 台灣肯德基股份有限公司 | 11458601 | 肯德基 | FOOD |
| 摩斯食品股份有限公司 | 84149540 | 摩斯漢堡 | FOOD |
| 雄獅資訊科技股份有限公司 | 70553900 | 雄獅旅遊 | OTHER |
| 台灣高鐵股份有限公司 | 70826898 | 高鐵 | TRANSPORT |

### 技術選型

| 項目 | 推薦方案 | 備選方案 |
|------|----------|----------|
| OCR 引擎 | Google ML Kit (免費、離線) | Apple Vision (iOS) |
| AI 推測 | Claude API | OpenAI API |
| 對照表儲存 | PostgreSQL + Redis 快取 | - |

### API 設計

```typescript
// POST /ocr/scan-receipt
// 上傳收據圖片，返回辨識結果
{
  "image": "base64...",
  "tripId": "..." // 可選，用於取得旅程成員作為付款人選項
}

// Response
{
  "success": true,
  "result": {
    "rawText": "統一超商股份有限公司\n2026/01/29\nNT$85",
    "parsed": {
      "companyName": "統一超商股份有限公司",
      "brandName": "7-Eleven",           // 轉換後的品牌名
      "brandSource": "MAPPING_TABLE",    // MAPPING_TABLE | AI_SUGGEST | USER_HISTORY
      "confidence": 0.95,
      "amount": 85,
      "date": "2026-01-29",
      "suggestedCategory": "FOOD",
      "items": ["咖啡", "麵包"]           // 品項（若可辨識）
    }
  }
}

// POST /ocr/learn
// 用戶修正後學習記憶
{
  "companyName": "某某股份有限公司",
  "customBrandName": "某某咖啡店"
}
```

### 實作待辦清單

#### Phase A：基礎 OCR
- [ ] 安裝 `google_mlkit_text_recognition` 套件
- [ ] 實作收據拍照功能
- [ ] 實作基礎文字辨識
- [ ] 解析金額、日期等基本欄位

#### Phase B：企業對照表
- [ ] 建立 CompanyBrandMapping 資料表
- [ ] 匯入常見企業對照資料（100+ 筆）
- [ ] 實作對照查詢 API
- [ ] 前端整合對照結果

#### Phase C：AI 智慧推測
- [ ] 整合 Claude API / OpenAI API
- [ ] 設計 Prompt 模板
- [ ] 實作推測結果解析
- [ ] 加入信心度評估

#### Phase D：用戶學習機制
- [ ] 建立 UserBrandMapping 資料表
- [ ] 實作學習記憶 API
- [ ] 前端實作修正 + 確認流程
- [ ] 優先使用用戶歷史記錄

#### Phase E：UI 整合
- [ ] 設計掃描結果預覽頁面
- [ ] 整合至新增帳單流程
- [ ] 加入「掃描收據」快捷按鈕
- [ ] 實作掃描歷史記錄

---

## 三之三、進階功能：電子發票整合

### 功能說明

整合台灣電子發票系統，提供兩種匯入方式：
1. **掃描電子發票 QR Code** - 快速新增單筆帳單
2. **串接財政部載具 API** - 批量自動匯入所有發票

### 方式一：掃描電子發票 QR Code

#### 台灣電子發票 QR Code 結構

每張電子發票包含兩個 QR Code：

| QR Code | 內容 | 格式 |
|---------|------|------|
| **左側 QR** | 發票基本資訊 | 明碼，可直接解析 |
| **右側 QR** | 品項明細 | Base64 + AES 加密 |

#### 左側 QR Code 資料格式

```
AB123456782026012900000350000000350000000022555003pGx9...
│         │        │         │         │         │        │
│         │        │         │         │         │        └─ 隨機碼 + 檢驗碼
│         │        │         │         │         └─ 賣方統編 (8碼)
│         │        │         │         └─ 買方統編 (8碼，一般消費者為 00000000)
│         │        │         └─ 總金額 (8碼)
│         │        └─ 銷售額 (8碼)
│         └─ 發票日期 (7碼: 民國年+月+日)
└─ 發票號碼 (10碼: 字軌2碼 + 號碼8碼)
```

#### 解析範例

```typescript
// 輸入：AB123456781150129000003500000035000000002255500300000001pGx9...
// 解析結果：
{
  invoiceNumber: "AB-12345678",
  invoiceDate: "2026-01-29",    // 民國115年 = 西元2026年
  salesAmount: 350,
  totalAmount: 350,
  buyerTaxId: "00000000",       // 一般消費者
  sellerTaxId: "22555003",      // 統一超商
  randomCode: "pGx9"
}
```

#### 技術實作

```dart
class EInvoiceQRParser {
  static EInvoiceData? parse(String qrData) {
    if (qrData.length < 77) return null;

    final invoiceNumber = '${qrData.substring(0, 2)}-${qrData.substring(2, 10)}';
    final rocYear = int.parse(qrData.substring(10, 13));
    final month = qrData.substring(13, 15);
    final day = qrData.substring(15, 17);
    final year = rocYear + 1911; // 民國轉西元

    return EInvoiceData(
      invoiceNumber: invoiceNumber,
      date: DateTime(year, int.parse(month), int.parse(day)),
      totalAmount: int.parse(qrData.substring(29, 37)),
      sellerTaxId: qrData.substring(45, 53),
      randomCode: qrData.substring(53, 57),
    );
  }
}
```

### 方式二：財政部電子發票 API 串接

> ⚠️ **重要限制：ISO 27001 認證要求**
>
> 自 112 年（2023）3 月 31 日起，申請財政部電子發票 API 必須符合以下條件：
>
> | 要求 | 說明 |
> |------|------|
> | **申請資格** | 必須是「營業人」、「組織團體」或「政府機關」 |
> | **資安認證** | 須通過 **CNS 27001** 或 **ISO 27001** 認證 |
> | **個人限制** | ⛔ 個人已無法申請，必須以公司名義 |
> | **授權期限** | 最多 3 年，需定期重新審核 |
>
> **ISO 27001 認證成本**：
> - 認證有效期：3 年
> - 每年需年檢
> - 費用：視公司規模，約 NT$10~50 萬
>
> **建議策略**：
> - **MVP 階段**：僅實作「QR Code 掃描」（方式一），不需 API 申請
> - **成長階段**：待公司成立並取得 ISO 27001 認證後，再實作載具 API
>
> 參考資源：
> - [電子發票應用程式介面使用規範](https://law-out.mof.gov.tw/LawContent.aspx?id=GL010122)
> - [電子發票整合服務平台](https://www.einvoice.nat.gov.tw)

#### 功能流程（需 ISO 27001 認證）

```
┌─────────────────────────────────────────────────────────────┐
│                  財政部載具 API 整合流程                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1️⃣ 用戶綁定手機條碼                                         │
│     ┌─────────────────────────────────────────────────┐     │
│     │ 輸入手機條碼：/ABC1234                           │     │
│     │ 輸入驗證碼：(財政部發送至手機)                    │     │
│     └─────────────────────────────────────────────────┘     │
│                          ↓                                  │
│  2️⃣ 儲存載具資訊（加密儲存）                                 │
│                          ↓                                  │
│  3️⃣ 查詢發票清單                                            │
│     ┌─────────────────────────────────────────────────┐     │
│     │ GET /einvoice/list                              │     │
│     │ • 指定日期範圍                                   │     │
│     │ • 返回發票列表（不含明細）                        │     │
│     └─────────────────────────────────────────────────┘     │
│                          ↓                                  │
│  4️⃣ 查詢發票明細                                            │
│     ┌─────────────────────────────────────────────────┐     │
│     │ GET /einvoice/:invoiceNumber/detail             │     │
│     │ • 返回完整品項明細                               │     │
│     └─────────────────────────────────────────────────┘     │
│                          ↓                                  │
│  5️⃣ 選擇發票 → 轉換為帳單                                   │
│     ┌─────────────────────────────────────────────────┐     │
│     │ • 顯示發票列表供用戶勾選                         │     │
│     │ • 自動填入金額、日期、店家                       │     │
│     │ • 用戶確認付款人、分帳方式                       │     │
│     └─────────────────────────────────────────────────┘     │
│                          ↓                                  │
│  ✅ 批量建立帳單                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 財政部 API 資訊

| 項目 | 說明 |
|------|------|
| API 網址 | `https://api.einvoice.nat.gov.tw` |
| 申請方式 | 財政部電子發票整合服務平台 |
| 認證方式 | App ID + API Key |
| 文件 | [電子發票 API 規格](https://www.einvoice.nat.gov.tw/APMEMBERVAN/APIService/API_1_0) |

#### 主要 API 端點

| 端點 | 說明 | 參數 |
|------|------|------|
| `carrierInvChk` | 查詢載具發票表頭 | 手機條碼、驗證碼、期間 |
| `carrierInvDetail` | 查詢發票明細 | 發票號碼、日期 |
| `qryInvHeader` | 查詢發票表頭（用 QR Code） | 發票號碼、日期、隨機碼 |
| `qryInvDetail` | 查詢發票明細（用 QR Code） | 發票號碼、日期、隨機碼 |

#### API 回應範例

```json
// carrierInvChk 回應
{
  "code": "200",
  "msg": "執行成功",
  "details": [
    {
      "invNum": "AB12345678",
      "invDate": "20260129",
      "sellerName": "統一超商股份有限公司",
      "sellerBan": "22555003",
      "amount": "350"
    }
  ]
}

// carrierInvDetail 回應
{
  "code": "200",
  "msg": "執行成功",
  "details": [
    {
      "rowNum": "1",
      "description": "拿鐵咖啡(大)",
      "quantity": "1",
      "unitPrice": "65",
      "amount": "65"
    },
    {
      "rowNum": "2",
      "description": "御飯糰鮭魚",
      "quantity": "1",
      "unitPrice": "35",
      "amount": "35"
    }
  ]
}
```

### 資料庫設計

```prisma
// 用戶載具綁定
model UserCarrier {
  id              String   @id @default(uuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])

  carrierType     CarrierType @default(MOBILE_BARCODE)
  carrierNumber   String      // 手機條碼 /ABC1234
  verifyCode      String      // 驗證碼（加密儲存）

  isVerified      Boolean  @default(false)
  lastSyncAt      DateTime?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum CarrierType {
  MOBILE_BARCODE    // 手機條碼
  CITIZEN_CERT      // 自然人憑證（未來支援）
}

// 已匯入的發票記錄（避免重複匯入）
model ImportedInvoice {
  id              String   @id @default(uuid())

  invoiceNumber   String   @unique  // AB-12345678
  invoiceDate     DateTime
  sellerTaxId     String
  sellerName      String
  totalAmount     Int

  // 關聯到帳單（若已轉換）
  billId          String?  @unique
  bill            Bill?    @relation(fields: [billId], references: [id])

  // 匯入資訊
  importedBy      String
  importedAt      DateTime @default(now())
  importSource    ImportSource  // QR_SCAN, CARRIER_API

  // 原始資料（JSON）
  rawData         Json?

  createdAt       DateTime @default(now())
}

enum ImportSource {
  QR_SCAN       // 掃描 QR Code
  CARRIER_API   // 載具 API 同步
}
```

### 後端 API 設計

```typescript
// ====== 電子發票模組 ======

// POST /einvoice/parse-qr
// 解析電子發票 QR Code
{
  "qrData": "AB123456781150129..."
}
// Response
{
  "success": true,
  "invoice": {
    "invoiceNumber": "AB-12345678",
    "date": "2026-01-29",
    "totalAmount": 350,
    "sellerTaxId": "22555003",
    "sellerName": "統一超商股份有限公司",  // 透過統編查詢
    "brandName": "7-Eleven"                // 透過對照表轉換
  }
}

// ====== 載具綁定 ======

// POST /einvoice/carrier/bind
// 綁定手機條碼
{
  "carrierNumber": "/ABC1234",
  "verifyCode": "123456"
}

// GET /einvoice/carrier/status
// 取得載具綁定狀態
// Response
{
  "isBound": true,
  "carrierType": "MOBILE_BARCODE",
  "carrierNumber": "/ABC****",  // 部分隱藏
  "lastSyncAt": "2026-01-29T10:00:00Z"
}

// DELETE /einvoice/carrier/unbind
// 解除載具綁定

// ====== 發票查詢 ======

// GET /einvoice/list?startDate=2026-01-01&endDate=2026-01-31
// 查詢載具內發票列表
// Response
{
  "invoices": [
    {
      "invoiceNumber": "AB-12345678",
      "date": "2026-01-29",
      "sellerName": "統一超商股份有限公司",
      "brandName": "7-Eleven",
      "amount": 350,
      "isImported": false  // 是否已匯入
    }
  ],
  "total": 25
}

// GET /einvoice/:invoiceNumber/detail
// 查詢發票明細
// Response
{
  "invoiceNumber": "AB-12345678",
  "date": "2026-01-29",
  "sellerName": "統一超商股份有限公司",
  "brandName": "7-Eleven",
  "totalAmount": 350,
  "items": [
    { "name": "拿鐵咖啡(大)", "quantity": 1, "price": 65, "amount": 65 },
    { "name": "御飯糰鮭魚", "quantity": 1, "price": 35, "amount": 35 }
  ]
}

// ====== 發票轉帳單 ======

// POST /einvoice/convert-to-bill
// 將發票轉換為帳單
{
  "tripId": "...",
  "invoiceNumbers": ["AB-12345678", "CD-87654321"],
  "payerId": "...",           // 付款人
  "splitType": "EQUAL",       // 分帳方式
  "participantIds": [...]     // 參與者
}
// Response
{
  "success": true,
  "bills": [
    { "id": "...", "title": "7-Eleven", "amount": 350 },
    { "id": "...", "title": "全家", "amount": 120 }
  ]
}
```

### 前端 UI 設計

#### 發票匯入頁面

```
┌─────────────────────────────────────────┐
│  ← 匯入電子發票                    ⚙️   │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  📱 掃描發票 QR Code             │    │
│  │  快速新增單筆帳單                │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  🔗 從載具匯入                   │    │
│  │  批量匯入手機條碼內的發票         │    │
│  │  已綁定：/ABC****               │    │
│  └─────────────────────────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│  最近匯入                               │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 7-Eleven          2026/01/29   │    │
│  │ AB-12345678           NT$350   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 全家              2026/01/28   │    │
│  │ CD-87654321           NT$120   │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

#### 載具發票列表

```
┌─────────────────────────────────────────┐
│  ← 選擇發票                      全選   │
├─────────────────────────────────────────┤
│  2026 年 1 月                          │
│                                         │
│  ☑️ 7-Eleven              01/29  $350   │
│     AB-12345678                         │
│                                         │
│  ☑️ 全家                  01/28  $120   │
│     CD-87654321                         │
│                                         │
│  ☐ 星巴克                01/27  $185   │
│     EF-11223344          (已匯入)       │
│                                         │
│  ☑️ 麥當勞                01/26  $259   │
│     GH-55667788                         │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  已選擇 3 筆，共 NT$729                 │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │        匯入至帳單 (3)           │    │
│  └─────────────────────────────────┘    │
│                                         │
└─────────────────────────────────────────┘
```

### 實作待辦清單

#### Phase F：電子發票 QR Code 掃描
- [ ] 實作電子發票 QR Code 解析器
- [ ] 整合統編 → 品牌名稱對照
- [ ] 設計掃描結果確認頁面
- [ ] 實作發票 → 帳單轉換

#### Phase G：財政部 API 串接
- [ ] 申請財政部 API 權限
- [ ] 實作載具綁定流程
- [ ] 實作發票列表查詢
- [ ] 實作發票明細查詢
- [ ] 驗證碼加密儲存

#### Phase H：發票匯入 UI
- [ ] 設計發票匯入入口頁面
- [ ] 設計載具綁定流程 UI
- [ ] 設計發票選擇列表
- [ ] 設計批量轉帳單確認頁
- [ ] 實作已匯入發票標記

#### Phase I：進階功能
- [ ] 發票自動同步（背景定時）
- [ ] 新發票推播通知
- [ ] 發票中獎檢查
- [ ] 支援自然人憑證載具

### 注意事項

1. **隱私安全**
   - 驗證碼需加密儲存
   - 載具資訊不可明文傳輸
   - 用戶可隨時解除綁定

2. **API 限制**
   - 財政部 API 有呼叫頻率限制
   - 需實作快取機制
   - 錯誤重試策略

3. **用戶體驗**
   - 首次綁定需清楚說明用途
   - 提供「暫不綁定」選項
   - 顯示同步狀態

---

## 三之四、進階功能：語音快速記帳

### 功能說明

用戶透過語音輸入即可快速新增帳單，AI 自動解析並填入對應欄位：

**使用情境**：
- 「昨天在星巴克花了 185 塊買咖啡，我付的」
- 「早餐 120 元，跟小明平分」
- 「計程車 350，全員均分」

**解析結果**：
| 欄位 | 解析值 |
|------|--------|
| 標題 | 星巴克咖啡 |
| 金額 | 185 |
| 日期 | 2026-01-28 |
| 分類 | FOOD |
| 付款人 | 用戶自己 |
| 分帳方式 | 均分 / 指定成員 |

### 技術架構

```
┌─────────────────────────────────────────────────────────────┐
│                    語音快速記帳流程                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   🎤 用戶按住錄音按鈕                                        │
│        ↓                                                    │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 第一步：語音轉文字 (Speech-to-Text)                  │   │
│   │ • 方案 A：Google Speech-to-Text API                 │   │
│   │ • 方案 B：Apple Speech Framework (iOS 離線)         │   │
│   │ • 方案 C：OpenAI Whisper API                        │   │
│   └─────────────────────────────────────────────────────┘   │
│        ↓                                                    │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 第二步：AI 語意解析                                  │   │
│   │ • 使用 LLM (Claude / GPT) 解析自然語言              │   │
│   │ • 提取：金額、店家、日期、分類、付款人、分帳方式     │   │
│   │ • 支援口語化表達與模糊時間（昨天、上週五）           │   │
│   └─────────────────────────────────────────────────────┘   │
│        ↓                                                    │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 第三步：顯示解析結果                                 │   │
│   │ • 即時顯示辨識文字                                   │   │
│   │ • 顯示解析後的帳單欄位                               │   │
│   │ • 用戶可修正 → 系統學習                             │   │
│   └─────────────────────────────────────────────────────┘   │
│        ↓                                                    │
│   ✅ 一鍵確認建立帳單                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 語音辨識方案比較

| 方案 | 優點 | 缺點 | 費用 |
|------|------|------|------|
| **Google Speech-to-Text** | 準確度高、支援中文口語 | 需網路、有費用 | $0.006/15秒 |
| **Apple Speech Framework** | iOS 離線可用、免費 | 僅限 iOS、準確度稍低 | 免費 |
| **OpenAI Whisper API** | 超高準確度、多語言 | 需網路、較貴 | $0.006/分鐘 |
| **Whisper 本地模型** | 離線可用、免費 | 模型大、較慢 | 免費 |

**建議方案**：
- iOS：優先使用 Apple Speech Framework（離線），失敗時 fallback 到 Whisper API
- Android：使用 Google Speech-to-Text 或 Whisper API

### AI 解析 Prompt 設計

```
你是一個帳單解析助手。請從用戶的語音輸入中提取以下資訊：

旅程成員列表：{memberNames}
今天日期：{today}

用戶輸入：「{userInput}」

請以 JSON 格式回傳：
{
  "title": "帳單標題（店家或消費項目）",
  "amount": 金額（數字）,
  "date": "日期（ISO 格式，如 2026-01-29）",
  "category": "分類（FOOD/TRANSPORT/ACCOMMODATION/ATTRACTION/SHOPPING/OTHER）",
  "payerName": "付款人名稱（若提及「我」則回傳 __SELF__）",
  "splitType": "分帳方式（EQUAL/EXACT）",
  "participants": ["參與者名稱列表，若為「全員」則回傳空陣列表示全部成員"],
  "confidence": 信心度（0-1）,
  "notes": "其他備註或無法解析的資訊"
}

範例：
輸入：「昨天在鼎泰豐花了 1200，我請客大家一起吃」
輸出：{
  "title": "鼎泰豐",
  "amount": 1200,
  "date": "2026-01-28",
  "category": "FOOD",
  "payerName": "__SELF__",
  "splitType": "EQUAL",
  "participants": [],
  "confidence": 0.95,
  "notes": null
}
```

### 後端 API 設計

```typescript
// POST /voice/transcribe
// 語音轉文字（可選：前端也可直接使用 SDK）
{
  "audio": "base64...",          // 音訊資料
  "format": "wav",               // 音訊格式
  "languageCode": "zh-TW"        // 語言
}
// Response
{
  "success": true,
  "transcript": "昨天在星巴克花了 185 塊",
  "confidence": 0.92
}

// POST /voice/parse-bill
// 解析語音內容為帳單
{
  "tripId": "...",               // 旅程 ID（用於取得成員列表）
  "transcript": "昨天在星巴克花了 185 塊，我付的",
  "timezone": "Asia/Taipei"      // 用戶時區（用於解析「昨天」等相對時間）
}
// Response
{
  "success": true,
  "parsed": {
    "title": "星巴克",
    "amount": 185,
    "date": "2026-01-28",
    "category": "FOOD",
    "payerId": "user-uuid-...",   // 已轉換為 ID
    "splitType": "EQUAL",
    "participantIds": [],         // 空陣列 = 全員
    "confidence": 0.95
  },
  "rawTranscript": "昨天在星巴克花了 185 塊，我付的",
  "suggestions": [                // 可選：低信心度時提供建議
    { "field": "category", "options": ["FOOD", "SHOPPING"] }
  ]
}

// POST /voice/learn
// 用戶修正後學習（未來可用於微調）
{
  "tripId": "...",
  "originalTranscript": "...",
  "parsedResult": { ... },        // AI 解析結果
  "correctedResult": { ... }      // 用戶修正後的結果
}
```

### 前端 UI 設計

#### 語音輸入按鈕（整合至新增帳單頁面）

```
┌─────────────────────────────────────────┐
│  ← 新增帳單                              │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 🎤 按住說話，快速記帳            │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ────────── 或手動輸入 ──────────        │
│                                         │
│  標題                                   │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│  ...                                    │
└─────────────────────────────────────────┘
```

#### 錄音中狀態

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│              🎤                         │
│         （脈動動畫）                     │
│                                         │
│     「昨天在星巴克花了 185 塊」          │
│         ↑ 即時辨識文字                  │
│                                         │
│                                         │
│           放開以完成錄音                 │
│                                         │
└─────────────────────────────────────────┘
```

#### 解析結果確認

```
┌─────────────────────────────────────────┐
│  ← 確認帳單                       ✓    │
├─────────────────────────────────────────┤
│                                         │
│  🎤 「昨天在星巴克花了 185 塊，我付的」  │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  標題                                   │
│  ┌─────────────────────────────────┐    │
│  │ 星巴克                          │ ✏️ │
│  └─────────────────────────────────┘    │
│                                         │
│  金額                                   │
│  ┌─────────────────────────────────┐    │
│  │ NT$ 185                         │ ✏️ │
│  └─────────────────────────────────┘    │
│                                         │
│  日期                  分類             │
│  ┌───────────────┐    ┌───────────┐    │
│  │ 2026/01/28    │    │ 🍔 餐飲   │    │
│  └───────────────┘    └───────────┘    │
│                                         │
│  付款人                                 │
│  ┌─────────────────────────────────┐    │
│  │ 我                              │    │
│  └─────────────────────────────────┘    │
│                                         │
│  分帳方式                               │
│  ┌─────────────────────────────────┐    │
│  │ 全員均分                        │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │           ✓ 確認建立             │    │
│  └─────────────────────────────────┘    │
│                                         │
│           🎤 重新錄音                   │
│                                         │
└─────────────────────────────────────────┘
```

### 前端檔案結構

```
lib/features/voice/
├── data/
│   └── voice_repository.dart        // 語音 API 呼叫
├── domain/
│   ├── speech_service.dart          // 語音辨識服務
│   └── voice_parser_service.dart    // 語意解析服務
├── presentation/
│   ├── voice_input_button.dart      // 語音輸入按鈕元件
│   ├── voice_recording_sheet.dart   // 錄音中底部表單
│   ├── voice_result_page.dart       // 解析結果確認頁
│   └── widgets/
│       ├── waveform_animation.dart  // 波形動畫
│       └── pulse_animation.dart     // 脈動動畫
└── providers/
    ├── speech_provider.dart         // 語音辨識狀態
    └── voice_parse_provider.dart    // 解析結果狀態
```

### Flutter 套件選用

| 功能 | 套件 | 說明 |
|------|------|------|
| 語音辨識 | `speech_to_text` | 跨平台語音辨識 |
| 錄音 | `record` | 錄製音訊檔案 |
| 音訊波形 | `audio_waveforms` | 顯示錄音波形動畫 |
| 權限處理 | `permission_handler` | 麥克風權限請求 |

### 實作待辦清單

#### Phase J：語音辨識基礎
- [ ] 安裝 `speech_to_text` 套件
- [ ] 實作麥克風權限請求
- [ ] 實作語音辨識服務
- [ ] 實作即時辨識文字顯示
- [ ] 實作錄音波形動畫

#### Phase K：AI 語意解析
- [ ] 設計並測試 Prompt 模板
- [ ] 後端實作 /voice/parse-bill API
- [ ] 整合 Claude API / OpenAI API
- [ ] 實作相對時間解析（昨天、上週）
- [ ] 實作成員名稱模糊匹配

#### Phase L：前端 UI
- [ ] 設計語音輸入按鈕元件
- [ ] 設計錄音中全螢幕覆蓋 UI
- [ ] 設計解析結果確認頁
- [ ] 整合至新增帳單流程
- [ ] 實作欄位編輯功能

#### Phase M：優化與學習
- [ ] 實作用戶修正學習 API
- [ ] 快取常用表達模式
- [ ] 加入語音輸入歷史記錄
- [ ] 支援多語言（中英混用）

### 注意事項

1. **權限處理**
   - 首次使用需請求麥克風權限
   - 清楚說明用途，提升授權率
   - 權限被拒時提供設定引導

2. **網路狀態**
   - 無網路時提示用戶
   - 離線時 iOS 可使用本地辨識
   - 辨識失敗時優雅降級

3. **隱私安全**
   - 音訊資料不儲存至伺服器
   - 僅傳輸辨識後的文字
   - 明確告知資料處理方式

4. **用戶體驗**
   - 錄音時提供視覺與觸覺回饋
   - 支援取消操作
   - 低信心度時高亮顯示可疑欄位

---

## 四、技術架構

### 4.1 資料庫設計

#### 新增 Table：`Purchase`（購買記錄）

```prisma
model Purchase {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])

  productId     String   // App Store / Google Play 產品 ID
  productType   ProductType

  // 消耗型專用欄位
  tripId        String?
  trip          Trip?    @relation(fields: [tripId], references: [id])
  daysGranted   Int?     // 購買的天數

  // 收據驗證
  platform      Platform // IOS, ANDROID
  receiptData   String   @db.Text
  transactionId String   @unique

  // 時間戳記
  purchasedAt   DateTime @default(now())
  expiresAt     DateTime? // 消耗型的到期時間

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

enum ProductType {
  CONSUMABLE      // 消耗型
  NON_CONSUMABLE  // 非消耗型
}

enum Platform {
  IOS
  ANDROID
}
```

#### 修改 Table：`User`（新增欄位）

```prisma
model User {
  // ... 現有欄位

  isAdFree      Boolean  @default(false)  // 是否已購買去廣告
  adFreeSince   DateTime?                 // 購買去廣告的時間

  purchases     Purchase[]
}
```

#### 修改 Table：`Trip`（新增欄位）

```prisma
model Trip {
  // ... 現有欄位

  isPremium         Boolean   @default(false)  // 是否為進階版（計算欄位）
  premiumExpiresAt  DateTime?                  // 進階版到期時間

  purchases         Purchase[]
}
```

### 4.2 後端 API

#### 內購模組：`modules/purchase/`

| 端點 | 方法 | 說明 |
|------|------|------|
| `/purchase/verify` | POST | 驗證收據並記錄購買 |
| `/purchase/history` | GET | 取得用戶購買歷史 |
| `/purchase/restore` | POST | 恢復購買（非消耗型） |
| `/purchase/trip/:tripId/status` | GET | 檢查旅程進階狀態 |

#### 驗證收據 API

```typescript
// POST /purchase/verify
{
  "platform": "IOS" | "ANDROID",
  "productId": "trip_premium_7d",
  "receiptData": "...",      // Base64 編碼的收據
  "transactionId": "...",
  "tripId": "..."            // 消耗型必填
}

// Response
{
  "success": true,
  "purchase": {
    "id": "...",
    "productId": "trip_premium_7d",
    "expiresAt": "2026-02-05T00:00:00Z"
  }
}
```

### 4.3 前端架構

#### 新增檔案結構

```
lib/features/purchase/
├── data/
│   └── purchase_repository.dart    // 內購 API 呼叫
├── domain/
│   └── purchase_service.dart       // 內購邏輯封裝
├── presentation/
│   ├── purchase_page.dart          // 購買頁面
│   ├── premium_badge.dart          // 進階版徽章
│   └── paywall_dialog.dart         // 付費牆對話框
└── providers/
    ├── purchase_provider.dart      // 購買狀態
    └── premium_status_provider.dart // 進階狀態
```

#### 狀態管理

```dart
// 用戶去廣告狀態
final isAdFreeProvider = FutureProvider<bool>((ref) async {
  final repo = ref.read(purchaseRepositoryProvider);
  return repo.isAdFree();
});

// 旅程進階狀態
final tripPremiumStatusProvider = FutureProvider.family<TripPremiumStatus, String>((ref, tripId) async {
  final repo = ref.read(purchaseRepositoryProvider);
  return repo.getTripPremiumStatus(tripId);
});
```

---

## 五、UI/UX 設計

### 5.1 購買入口

| 位置 | 入口 | 說明 |
|------|------|------|
| 旅程詳情頁 | 「升級進階版」按鈕 | 顯示在統計區域旁 |
| 統計圖表頁 | 進階圖表鎖定覆蓋 | 顯示「解鎖完整統計」 |
| 匯出功能 | 點擊時彈出付費牆 | 提示需升級才能使用 |
| 設定頁 | 「移除廣告」選項 | 獨立的去廣告購買入口 |

### 5.2 進階版標示

- 旅程列表：進階版旅程顯示 ⭐ 徽章
- 旅程詳情：Header 顯示「進階版」標籤及剩餘天數
- 到期提醒：剩餘 3 天時顯示提醒通知

### 5.3 付費牆設計

```
┌─────────────────────────────────────┐
│           🔓 解鎖進階功能            │
├─────────────────────────────────────┤
│                                     │
│  ✨ 詳細統計圖表                     │
│  📊 匯出 PDF / Excel 報表           │
│  📷 帳單照片附件                     │
│  👥 無限成員數量                     │
│                                     │
├─────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐│
│  │  3 天   │ │  7 天   │ │ 30 天  ││
│  │  NT$15  │ │  NT$30  │ │  NT$90 ││
│  └─────────┘ └─────────┘ └─────────┘│
│                                     │
│        [ 立即升級 ]                  │
│                                     │
│      僅限此旅程・到期後自動降級       │
└─────────────────────────────────────┘
```

---

## 六、實作待辦清單

### Phase 1：基礎建設
- [ ] 在 App Store Connect 建立內購產品
- [ ] 在 Google Play Console 建立內購產品
- [ ] 後端新增 Purchase 資料表
- [ ] 後端新增 User.isAdFree 欄位
- [ ] 後端新增 Trip.premiumExpiresAt 欄位
- [ ] 執行資料庫遷移

### Phase 2：後端 API
- [ ] 實作 Apple 收據驗證 (App Store Server API v2)
- [ ] 實作 Google 收據驗證 (Google Play Developer API)
- [ ] 實作 POST /purchase/verify 端點
- [ ] 實作 GET /purchase/history 端點
- [ ] 實作 POST /purchase/restore 端點
- [ ] 實作 GET /purchase/trip/:tripId/status 端點
- [ ] 新增進階狀態檢查中介層

### Phase 3：前端內購服務
- [ ] 安裝 `in_app_purchase` 套件
- [ ] 實作 PurchaseService（封裝 IAP 邏輯）
- [ ] 實作 PurchaseRepository（API 呼叫）
- [ ] 實作購買狀態 Provider
- [ ] 實作進階狀態 Provider

### Phase 4：前端 UI
- [ ] 設計並實作購買頁面
- [ ] 設計並實作付費牆對話框
- [ ] 在旅程詳情頁新增升級入口
- [ ] 在統計頁新增功能鎖定 UI
- [ ] 在設定頁新增去廣告購買入口
- [ ] 實作進階版徽章元件
- [ ] 實作恢復購買功能

### Phase 5：功能限制
- [ ] 實作免費版成員數量限制 (5 人)
- [ ] 實作免費版帳單數量限制 (50 筆)
- [ ] 實作進階統計圖表鎖定
- [ ] 實作匯出功能鎖定
- [ ] 實作帳單照片功能鎖定
- [ ] 實作廣告顯示/隱藏邏輯

### Phase 6：測試與上線
- [ ] 設定 Sandbox 測試帳號 (iOS)
- [ ] 設定測試軌道 (Android)
- [ ] 完整測試購買流程
- [ ] 測試恢復購買功能
- [ ] 測試到期降級邏輯
- [ ] 提交 App 審核

---

## 七、注意事項

### 7.1 Apple 審核要點

1. **恢復購買**：非消耗型必須提供「恢復購買」按鈕
2. **訂閱說明**：若為訂閱制需清楚說明價格、週期、取消方式
3. **功能限制**：不可完全鎖死核心功能，免費版需可正常使用
4. **隱私政策**：需更新隱私政策說明內購相關資料處理

### 7.2 Google Play 要點

1. **訂閱中心**：需支援 Google Play 訂閱管理深層連結
2. **退款處理**：需處理 Google Play 的退款回呼
3. **測試帳號**：使用許可測試人員進行測試

### 7.3 收據驗證

- **強烈建議**：在後端驗證收據，不要只在前端驗證
- Apple 使用 App Store Server API v2（JWT 驗證）
- Google 使用 Google Play Developer API（服務帳號）

### 7.4 時區處理

- 所有到期時間使用 UTC 儲存
- 前端顯示時轉換為用戶本地時區
- 到期判斷使用伺服器時間，避免用戶竄改

### 7.5 使用條款與隱私政策更新

上線進階功能前，需更新以下法律文件：

**使用條款 (Terms of Service)**：
- 內購產品說明與退款政策
- 進階功能授權範圍與限制
- 免費版與進階版的功能差異
- 自動降級條款說明

**隱私政策 (Privacy Policy)**：
- 收據/發票圖片處理方式
- OCR 辨識資料的儲存與刪除
- 語音資料處理說明（不儲存原始音訊）
- AI 服務商（Claude/OpenAI）的資料傳輸說明
- 電子發票載具綁定資料的加密與安全措施
- 第三方服務整合清單（Google ML Kit、Apple Vision 等）

**更新時機**：
- [ ] Sprint 4 上線前：更新內購與基本 AI 功能相關條款
- [ ] Sprint 5 上線前：更新載具 API 相關隱私條款
- [ ] 每次重大功能更新前檢視是否需要更新

---

## 八、參考資源

- [Flutter in_app_purchase 官方文件](https://pub.dev/packages/in_app_purchase)
- [App Store Server API v2](https://developer.apple.com/documentation/appstoreserverapi)
- [Google Play Billing Library](https://developer.android.com/google/play/billing)
- [RevenueCat](https://www.revenuecat.com/) - 內購管理平台（可選用）

---

## 九、實作路線圖

### 總覽

基於功能依賴關係、技術複雜度、用戶價值，規劃以下最佳實作順序：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TripLedger 進階功能實作路線圖                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Sprint 1          Sprint 2          Sprint 3          Sprint 4            │
│  ┌─────────┐       ┌─────────┐       ┌─────────┐       ┌─────────┐         │
│  │ 付費框架 │ ───▶  │ OCR 基礎 │ ───▶  │ 發票 QR │ ───▶  │ 付費牆   │         │
│  │  MVP    │       │ +對照表  │       │  掃描   │       │  整合   │         │
│  └─────────┘       └─────────┘       └─────────┘       └─────────┘         │
│       │                 │                 │                 │              │
│       ▼                 ▼                 ▼                 ▼              │
│  Phase 1-3         Phase A-B          Phase F          Phase 4-5          │
│                                                                             │
│  ════════════════════════════════════════════════════════════════════════  │
│                           ▲ MVP 可上線 ▲                                    │
│  ════════════════════════════════════════════════════════════════════════  │
│                                                                             │
│  Sprint 6          Sprint 7          Sprint 5                              │
│  ┌─────────┐       ┌─────────┐       ┌─────────┐                           │
│  │語音記帳  │ ───▶  │ 優化與  │       │ 載具API │ ⚠️ 需 ISO 27001          │
│  │  基礎   │       │  測試   │       │ (長期)  │                           │
│  └─────────┘       └─────────┘       └─────────┘                           │
│       │                 │                 │                                │
│       ▼                 ▼                 ▼                                │
│  Phase J-L       Phase C-D-E, M, 6    Phase G-H (待認證)                   │
│                                                                             │
│  ════════════════════════════════════════════════════════════════════════  │
│  ⚠️ Sprint 5 需要 ISO 27001 認證 + 公司登記，屬於長期目標                    │
│  ════════════════════════════════════════════════════════════════════════  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 詳細規劃

---

#### 🏃 Sprint 1：付費框架 MVP

**目標**：建立內購基礎架構，讓 App 具備收費能力

**對應 Phase**：Phase 1-3（部分）

| 優先序 | 任務 | 類型 | 說明 |
|--------|------|------|------|
| 1-1 | App Store Connect 建立內購產品 | 設定 | 建立 4 個產品 ID |
| 1-2 | Google Play Console 建立內購產品 | 設定 | 對應 4 個產品 |
| 1-3 | 後端新增 Purchase 資料表 | 後端 | Prisma schema 更新 |
| 1-4 | 後端新增 User.isAdFree 欄位 | 後端 | 非消耗型狀態 |
| 1-5 | 後端新增 Trip.premiumExpiresAt 欄位 | 後端 | 消耗型到期時間 |
| 1-6 | 執行資料庫遷移 | 後端 | `npx prisma migrate` |
| 1-7 | 實作 POST /purchase/verify | 後端 | 收據驗證 API |
| 1-8 | 實作 GET /purchase/trip/:tripId/status | 後端 | 進階狀態查詢 |
| 1-9 | 安裝 `in_app_purchase` 套件 | 前端 | Flutter IAP |
| 1-10 | 實作 PurchaseService | 前端 | 封裝 IAP 邏輯 |
| 1-11 | 實作 PurchaseRepository | 前端 | API 呼叫層 |

**產出物**：
- 可正常購買的內購流程（尚未鎖定功能）
- 後端收據驗證機制

**預估工作量**：中等

---

#### 🏃 Sprint 2：智慧收據掃描 - 基礎版

**目標**：實作 OCR 辨識 + 企業對照表（為後續功能共用）

**對應 Phase**：Phase A-B

| 優先序 | 任務 | 類型 | 說明 |
|--------|------|------|------|
| 2-1 | 安裝 `google_mlkit_text_recognition` | 前端 | OCR 引擎 |
| 2-2 | 實作收據拍照功能 | 前端 | 相機整合 |
| 2-3 | 實作基礎文字辨識 | 前端 | ML Kit 呼叫 |
| 2-4 | 解析金額、日期欄位 | 前端 | 正規表達式 |
| 2-5 | 建立 CompanyBrandMapping 資料表 | 後端 | Prisma schema |
| 2-6 | 匯入常見企業對照資料（100+ 筆） | 後端 | Seed 資料 |
| 2-7 | 實作 GET /ocr/company-mapping | 後端 | 對照查詢 API |
| 2-8 | 實作 POST /ocr/scan-receipt | 後端 | 整合辨識 API |
| 2-9 | 設計掃描結果預覽頁 | 前端 | UI 實作 |
| 2-10 | 整合至新增帳單流程 | 前端 | 加入掃描入口 |

**產出物**：
- 可辨識收據金額、日期、店家的 OCR 功能
- 企業 → 品牌名稱對照系統（共用）

**預估工作量**：中等

**依賴**：無（可平行開發）

---

#### 🏃 Sprint 3：電子發票 QR Code 掃描

**目標**：解析台灣電子發票 QR Code，快速建立帳單

**對應 Phase**：Phase F

| 優先序 | 任務 | 類型 | 說明 |
|--------|------|------|------|
| 3-1 | 實作 EInvoiceQRParser | 前端 | QR Code 格式解析 |
| 3-2 | 民國年 ↔ 西元年轉換 | 前端 | 日期處理 |
| 3-3 | 整合統編 → 品牌對照 | 前端 | 共用 Sprint 2 的對照表 |
| 3-4 | 實作 POST /einvoice/parse-qr | 後端 | 發票解析 API |
| 3-5 | 建立 ImportedInvoice 資料表 | 後端 | 避免重複匯入 |
| 3-6 | 設計發票掃描結果確認頁 | 前端 | UI 實作 |
| 3-7 | 實作發票 → 帳單轉換 | 後端 | POST /einvoice/convert-to-bill |
| 3-8 | 新增發票掃描入口 | 前端 | 整合至新增帳單頁 |

**產出物**：
- 掃描電子發票 QR Code 即可自動填入帳單
- 發票匯入記錄（防重複）

**預估工作量**：中等偏低

**依賴**：Sprint 2（共用企業對照表）

---

#### 🏃 Sprint 4：付費牆整合

**目標**：將 OCR 和發票功能設為進階版專屬，完成付費閉環

**對應 Phase**：Phase 4-5

| 優先序 | 任務 | 類型 | 說明 |
|--------|------|------|------|
| 4-1 | 設計並實作付費牆對話框 | 前端 | PaywallDialog |
| 4-2 | 設計並實作購買頁面 | 前端 | 天數方案選擇 |
| 4-3 | 實作進階版徽章元件 | 前端 | PremiumBadge |
| 4-4 | 旅程詳情頁新增升級入口 | 前端 | UI 整合 |
| 4-5 | OCR 功能檢查進階狀態 | 前端 | 非進階版顯示付費牆 |
| 4-6 | 發票功能檢查進階狀態 | 前端 | 非進階版顯示付費牆 |
| 4-7 | 實作免費版成員限制 (5 人) | 全端 | 邀請時檢查 |
| 4-8 | 實作免費版帳單限制 (50 筆) | 全端 | 新增時檢查 |
| 4-9 | 實作恢復購買功能 | 前端 | 非消耗型必備 |
| 4-10 | 設定頁新增去廣告入口 | 前端 | UI 整合 |
| 4-11 | 實作廣告顯示/隱藏邏輯 | 前端 | 讀取 isAdFree |

**產出物**：
- 完整的付費牆體驗
- 免費版 vs 進階版功能區分
- 去廣告購買功能

**預估工作量**：中等偏高

**依賴**：Sprint 1-3

---

#### ✅ MVP 里程碑

**此時 App 可正式上線，包含以下付費功能**：
- ✅ 旅程進階功能（3/7/30 天方案）
- ✅ 智慧收據掃描 (OCR)
- ✅ 電子發票 QR Code 掃描
- ✅ 永久去廣告
- ✅ 免費版限制（5 成員 / 50 帳單）

---

#### 🔮 Sprint 5：財政部載具 API 串接【長期目標】

> ⚠️ **重要：此 Sprint 需要 ISO 27001 認證，屬於長期目標**
>
> 由於財政部自 112 年 3 月 31 日起要求申請者必須通過 **ISO 27001 資安認證**，
> 且僅限「營業人」、「組織團體」或「政府機關」申請（個人無法申請），
> 此功能需等待以下條件達成後方可實作：
>
> **前置條件**：
> 1. ✅ 成立公司或商業登記
> 2. ✅ 取得 ISO 27001 認證（費用約 NT$10~50 萬，效期 3 年）
> 3. ✅ 提交財政部 API 申請並審核通過
>
> **建議**：MVP 階段可跳過此 Sprint，先上線 Sprint 1-4 + Sprint 6

**目標**：串接財政部 API，支援批量匯入發票

**對應 Phase**：Phase G-H

| 優先序 | 任務 | 類型 | 說明 |
|--------|------|------|------|
| 5-0 | 取得 ISO 27001 認證 | 前置 | ⚠️ 必要條件 |
| 5-1 | 申請財政部 API 權限 | 設定 | 需公司身份 + ISO 認證 |
| 5-2 | 建立 UserCarrier 資料表 | 後端 | 載具綁定資訊 |
| 5-3 | 實作 POST /einvoice/carrier/bind | 後端 | 載具綁定 API |
| 5-4 | 實作 GET /einvoice/list | 後端 | 發票列表查詢 |
| 5-5 | 實作 GET /einvoice/:id/detail | 後端 | 發票明細查詢 |
| 5-6 | 驗證碼加密儲存 | 後端 | 安全性處理 |
| 5-7 | 設計載具綁定流程 UI | 前端 | 步驟引導 |
| 5-8 | 設計發票選擇列表 UI | 前端 | 多選 + 批量操作 |
| 5-9 | 設計批量轉帳單確認頁 | 前端 | 統一設定付款人/分帳 |
| 5-10 | 實作已匯入發票標記 | 前端 | 防止重複匯入 |
| 5-11 | 發票自動同步（背景） | 前端 | 定時拉取載具發票 |
| 5-12 | 新發票推播通知 | 後端 | FCM 整合 |
| 5-13 | 發票中獎檢查 | 後端 | 開獎後自動比對 |

**產出物**：
- 綁定手機條碼功能
- 批量匯入載具發票

**預估工作量**：中等偏高（不含 ISO 認證準備時間）

**依賴**：
- Sprint 3（技術依賴）
- ISO 27001 認證（法規依賴）
- 公司成立（身份依賴）

**替代方案**：
若短期內無法取得 ISO 27001，可考慮：
1. 與已有認證的第三方服務商合作
2. 僅提供 QR Code 掃描功能（不需 API）
3. 讓用戶手動輸入發票資訊

---

#### 🏃 Sprint 6：語音快速記帳

**目標**：實作語音輸入 + AI 解析，快速新增帳單

**對應 Phase**：Phase J-L

| 優先序 | 任務 | 類型 | 說明 |
|--------|------|------|------|
| 6-1 | 安裝 `speech_to_text` 套件 | 前端 | 語音辨識 |
| 6-2 | 實作麥克風權限請求 | 前端 | permission_handler |
| 6-3 | 實作語音辨識服務 | 前端 | SpeechService |
| 6-4 | 實作即時辨識文字顯示 | 前端 | 串流 UI |
| 6-5 | 設計並測試 Prompt 模板 | 後端 | LLM 指令優化 |
| 6-6 | 實作 POST /voice/parse-bill | 後端 | AI 解析 API |
| 6-7 | 整合 Claude API / OpenAI API | 後端 | LLM 串接 |
| 6-8 | 實作相對時間解析 | 後端 | 昨天、上週五 |
| 6-9 | 實作成員名稱模糊匹配 | 後端 | 小明 → 王小明 |
| 6-10 | 設計語音輸入按鈕元件 | 前端 | 長按錄音 |
| 6-11 | 設計錄音中覆蓋 UI | 前端 | 波形動畫 |
| 6-12 | 設計解析結果確認頁 | 前端 | 可編輯欄位 |
| 6-13 | 整合至新增帳單流程 | 前端 | 頂部入口 |

**產出物**：
- 語音輸入快速記帳功能
- AI 自動解析並填入欄位

**預估工作量**：高

**依賴**：無（可與 Sprint 5 平行開發）

---

#### 🏃 Sprint 7：優化與測試上線

**目標**：完善 AI 功能、用戶學習機制、全面測試

**對應 Phase**：Phase C-D-E, I, M, 6

| 優先序 | 任務 | 類型 | 說明 |
|--------|------|------|------|
| 7-1 | 整合 AI 智慧推測（OCR） | 後端 | LLM 推測未知品牌 |
| 7-2 | 實作用戶學習機制（OCR） | 全端 | UserBrandMapping |
| 7-3 | 實作用戶修正學習（語音） | 全端 | 提升準確度 |
| 7-4 | 支援多語言（中英混用） | 後端 | 語音辨識優化 |
| 7-5 | 設定 Sandbox 測試 (iOS) | 測試 | 內購測試 |
| 7-6 | 設定測試軌道 (Android) | 測試 | 內購測試 |
| 7-7 | 完整測試所有付費流程 | 測試 | 端到端驗證 |
| 7-8 | 測試到期降級邏輯 | 測試 | 時間模擬 |
| 7-9 | 更新隱私政策與使用條款 | 文件 | 法規遵循（含 AI 資料處理說明） |
| 7-10 | 提交 App 審核 | 上線 | App Store + Google Play |

**產出物**：
- 完整的進階功能套件
- 經過充分測試的穩定版本

**預估工作量**：中等偏高

---

### 里程碑總覽

| 里程碑 | Sprint | 主要功能 | 建議時機 |
|--------|--------|----------|----------|
| **Alpha** | Sprint 1-2 | 付費框架 + OCR 基礎 | 內部測試 |
| **Beta** | Sprint 3-4 | 發票 QR + 付費牆 | 小規模公測 |
| **MVP 上線** | Sprint 4 完成 | 完整付費功能 | App Store 上架 |
| **v1.1** | Sprint 6 | 語音快速記帳 | 功能更新 |
| **v1.2** | Sprint 7 | AI 優化 + 學習機制 | 體驗優化 |
| **v2.0** | Sprint 5 | 載具 API 批量匯入 | ⚠️ 長期目標（需 ISO 27001） |

### 平行開發建議

```
時間軸  ─────────────────────────────────────────────────────▶

Sprint 1  ████████████████
Sprint 2                  ████████████████
Sprint 3                                  ████████████
Sprint 4                                              ████████████████
                                                                      ↑ MVP
Sprint 6                                              ████████████████████
Sprint 7                                                                  ████████████
                                                                                      ↑ v1.2
Sprint 5  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████
          [成立公司]        [取得 ISO 27001]        [申請 API]        [開發]    ↑ v2.0

████ = 主要開發工作
░░░░ = 長期準備工作（ISO 認證、公司設立）
```

**建議實作順序（已調整）**：
1. **MVP 優先**：Sprint 1-4 完成後即可上線
2. **跳過 Sprint 5**：載具 API 需 ISO 27001，列為長期目標
3. **Sprint 6 先行**：語音記帳不需額外認證，可優先實作
4. **Sprint 5 延後**：待公司成立 + ISO 認證後再實作

### 風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|----------|
| **ISO 27001 認證門檻** | Sprint 5 無法實作 | ⚠️ 先跳過，僅提供 QR 掃描功能；長期規劃取得認證 |
| **財政部 API 申請限制** | 個人無法申請 | 待成立公司後再申請；或與第三方服務商合作 |
| Apple IAP 審核被拒 | 上線延遲 | 仔細閱讀審核指南；準備申訴文件 |
| OCR 辨識準確度不足 | 用戶體驗差 | 多測試台灣發票樣本；提供手動修正 |
| AI 解析成本過高 | 營運成本增加 | 設定用量限制；考慮本地模型 |
| 語音辨識中文準確度 | 功能可用性 | 測試多種口音；提供文字輸入備案 |

### ISO 27001 認證規劃（長期）

若決定取得 ISO 27001 認證以開通載具 API，建議流程：

```
┌─────────────────────────────────────────────────────────────────┐
│                    ISO 27001 認證取得流程                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  階段 1：前置準備                                                │
│  ├─ 成立公司（有限公司或股份有限公司）                           │
│  ├─ 建立基本資安政策文件                                        │
│  └─ 預估費用：NT$5~10 萬                                        │
│                                                                 │
│  階段 2：ISMS 建置                                              │
│  ├─ 聘請顧問或自行建置資安管理系統                              │
│  ├─ 撰寫必要文件（政策、程序、記錄）                            │
│  ├─ 內部稽核與管理審查                                          │
│  └─ 預估費用：NT$10~30 萬（含顧問）                             │
│                                                                 │
│  階段 3：認證稽核                                                │
│  ├─ 選擇認證機構（BSI、SGS、TÜV 等）                            │
│  ├─ 第一階段稽核（文件審查）                                    │
│  ├─ 第二階段稽核（實地查核）                                    │
│  └─ 預估費用：NT$10~20 萬                                       │
│                                                                 │
│  階段 4：取得證書                                                │
│  ├─ 證書有效期：3 年                                            │
│  ├─ 每年需進行監督稽核                                          │
│  └─ 年度維護費用：NT$5~10 萬                                    │
│                                                                 │
│  總預估成本：NT$30~70 萬（首次）+ 每年 NT$5~10 萬               │
│  總預估時間：3~6 個月                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 十、版本歷史

| 版本 | 日期 | 說明 |
|------|------|------|
| 1.0 | 2026-01-29 | 初版計劃書 |
| 1.1 | 2026-01-29 | 新增「智慧收據掃描」主打功能規劃（三層智慧轉換機制） |
| 1.2 | 2026-01-29 | 新增「電子發票整合」功能規劃（QR 掃描 + 財政部載具 API） |
| 1.3 | 2026-01-29 | 新增「語音快速記帳」功能規劃（語音辨識 + AI 語意解析） |
| 1.4 | 2026-01-29 | 新增「實作路線圖」章節（7 個 Sprint 規劃 + 里程碑 + 平行開發建議） |
| 1.5 | 2026-01-29 | 加入 ISO 27001 認證限制說明，調整 Sprint 5 為長期目標，新增認證規劃流程 |
| 1.6 | 2026-01-29 | 計劃完善修正：(1) 進階功能表新增語音快速記帳 (2) 調整 Sprint 7 任務，將依賴載具 API 的任務移至 Sprint 5 (3) 新增使用條款與隱私政策更新指引 |
