# TripLedger 重構前現況

盤點日期：2026-09-22。用途：保存既有專案的程式碼現況，供新版產品方向與重構範圍討論。以下「已實作」指程式碼存在，不代表已通過執行、部署或線上驗證。

## GitHub 與本機基準

- 儲存庫：https://github.com/leading-elvis/tripledger
- 本機：`D:\Project\tripledger-main`
- 原始資料夾沒有 `.git`；已恢復遠端版本紀錄，設定 `origin`，本機 `main` 追蹤 `origin/main`。
- 盤點基準：`d6ba51b6b976fe34180c56955a06105314caa455`，2026-03-26，`fix: improve 7-ELEVEN receipt line item parsing`。
- 接回 Git 後工作目錄與遠端一致；接回前後以 SHA-256 核對原有 377 個檔案，沒有修改或遺失。
- 本次新增此備忘；沒有修改產品程式碼、建立提交、推送、部署或執行資料庫遷移。

## 目前產品與架構

目前是以台灣旅客為主要情境的「旅遊群組分帳」App，核心流程為登入、建立／加入旅程、記錄支出、分攤、檢視成員餘額與確認還款。

| 範圍 | 現況 | 主要入口 |
| --- | --- | --- |
| 行動端 | Flutter、Riverpod、Dio、go_router；有 Android／iOS／Web 專案檔，未驗證各平台可執行性 | `apps/mobile/lib/main.dart`、`core/config/router.dart` |
| API | NestJS、TypeScript、Prisma；依功能分模組的單體 | `apps/api/src/app.module.ts` |
| 資料庫 | PostgreSQL；schema 與遷移歷史 | `apps/api/prisma/schema.prisma`、`migrations/` |
| 部署 | Cloud Build 建置、資料庫遷移、Cloud Run 部署；Cloud SQL、Secret Manager 設定 | `cloudbuild.yaml`、`apps/api/Dockerfile` |
| 本機環境 | Docker Compose 定義 PostgreSQL、Redis、選用 pgAdmin | `infrastructure/docker/docker-compose.yml` |

已存在的功能程式碼：

- Apple／Google／LINE 登入、JWT／refresh token、個人資料、刪除帳號。
- 旅程、邀請碼與 QR、成員角色、虛擬成員及認領／轉換。
- 帳單 CRUD、分類、收據圖片、五種分攤：均分、指定金額、百分比、份數、品項。
- 外幣帳單、匯率與旅程基準幣金額、分類統計、結算建議與確認。
- 本機 ML Kit／後端 Vision OCR、品牌對照、收據品項解析、台灣電子發票 QR 解析。
- FCM 通知、AdMob、去廣告內購、旅程 Premium、OCR 額度。

文件與實作有差異：Prisma 定義 15 種幣別，`CLAUDE.md` 寫 20 種；匯出操作仍顯示「開發中」。沒有看到帳務離線資料庫與同步佇列，不能把目前快取視為完整離線記帳。

## 核心資料與規則

資料主軸：`User ↔ TripMember ↔ Trip → Bill → BillShare`。品項分攤另外使用 `BillItem → BillItemShare`；還款由獨立的 `Settlement` 表記錄。

- 一筆帳單只有一位付款人，正式與虛擬參與者以不同的 nullable 外鍵表示。
- 金額儲存為 `Decimal(12,2)`、匯率為 `Decimal(18,8)`，但業務計算多轉為 JavaScript `number`。
- 外幣帳單儲存原幣金額、匯率與旅程基準幣 `baseAmount`。
- 結算建議採大債務人與大債權人配對的貪婪演算法；程式名稱的「最佳化」不代表保證全域最少交易次數。
- 刪除帳號時以外鍵 `SetNull` 保留財務紀錄；歷史參與者如何持續進入餘額計算仍需補足規則。

前端已有 Repository 與共用 API client，但主要旅程／帳單畫面大量使用 `setState` 與手動重新載入。新增及編輯帳單頁各超過 2,000 行，混合表單、分攤、API payload、Premium、廣告與畫面邏輯。

## 重構前優先核對事項

以下來自靜態閱讀，尚未以真實資料或整合測試重現。

| 優先事項 | 程式碼證據與影響 |
| --- | --- |
| 開發與正式環境隔離 | `apps/mobile/lib/core/config/api_config.dart:8` 的 `forceProduction = true` 使 debug 預設也走正式 API；建立可執行基準前先明確設定開發環境。 |
| Apple 帳號綁定 | `apps/api/src/modules/auth/auth.controller.ts:53` 接受客戶端 email；`auth.service.ts:192` 以該 email 尋找並綁定既有帳號，未使用已驗證 token 的 email 作為依據，有錯誤綁定／帳號接管風險。 |
| 還款後的剩餘餘額 | `apps/api/src/modules/settlement/settlement.service.ts:55` 的餘額計算只讀帳單與分攤，沒有扣回已確認還款；現存成員以外的歷史份額也可能被忽略。 |
| 幣別與尾差一致性 | `settlement.service.ts:150` 及 `:198` 將所有幣別取整數；建立結算 DTO 也要求整數。百分比／份數／品項分攤的尾差處理需統一；分類統計仍加總原幣金額。 |
| 帳單更新與歷史匯率 | `apps/api/src/modules/bills/bills.service.ts:501` 起的更新流程可能保留舊分攤，分攤重建與帳單主體更新也不在同一交易；修改外幣帳單會重新抓匯率。旅程基準幣可更改，但舊 `baseAmount` 未同步重建。 |
| 認證刷新與錯誤處理 | `apps/mobile/lib/core/network/api_client.dart:38` 對 401 刷新 token，而刷新也走相同攔截器，缺少終止／並行保護；通知 Repository 遇錯會改顯示假資料。 |
| OCR 到帳單的契約 | 收據結果頁採整數解析及 TWD 顯示；辨識幣別與日期未完整套用到新增帳單，需統一欄位與人工確認流程。 |

## 可保留與應重新劃分的邊界

可評估保留：Git 歷史、Prisma 遷移、NestJS 模組組織、Repository 邊界、既有分攤案例與測試資料、OCR parser／品牌映射、共用驗證器與介面元件。保留業務概念不代表直接沿用目前所有計算實作。

依目前程式碼，適合優先抽出的責任：

1. 金額、幣別精度、分攤、尾差與結算的獨立領域規則。
2. 正式使用者、虛擬成員、離開／刪除帳號後歷史身份的一致模型。
3. 帳單新增與編輯共用的表單狀態及資料契約。
4. 登入與 token 生命週期、環境設定、錯誤處理。
5. 通知、OCR、廣告／Premium 等周邊服務與帳務交易的界線。

新版若不再限於旅遊，可再討論將 `Trip` 抽象為「帳本／群組」，但目前尚未確定新版需求，因此未進行命名、schema 或 API 變更。

## 驗證狀態

- 已完成：文件與主要程式碼靜態閱讀、GitHub 專案核對、遠端完整歷史下載、分支追蹤設定、工作目錄差異與原始檔案雜湊檢查。
- 靜態盤點：19 個後端 `*.spec.ts`、4 個 Flutter `*_test.dart`；前端測試集中於驗證器、JSON model、OCR state/model。
- 未執行測試或建置：本機尚無 `node_modules` 與 Flutter `.dart_tool/package_config.json`。現有測試的通過狀態未知。
- 未看到端到端測試；後端 `test:e2e` 指向的 `test/jest-e2e.json` 不存在。
- 未登入 App、呼叫正式 API、檢查正式資料庫或確認目前線上服務狀態。

## 使用者已確認的新版方向

- 從手機 App 轉為網頁應用；以手機使用優先，同時支援電腦。
- 第一階段為內部測試，沒有付費內容；架構預留後續公開服務與付費版本。
- 只有測試資料，可以重新設計資料結構，不需要規劃正式帳務或既有購買權益遷移。
- 概念仍以既有記帳／分帳為基礎，個別功能取捨與新版操作流程可再細化。

具體的第一階段範圍、技術建議與驗收條件見 [WEB_REFACTOR_PLAN.md](WEB_REFACTOR_PLAN.md)。資料可重新設計不等於已刪除舊資料；本次沒有操作任何資料庫。
