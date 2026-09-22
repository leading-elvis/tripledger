# TripLedger 首版：Sites 與自架

這是手機優先、同時支援桌面的首版內測網頁。原本 `apps/api`、`apps/mobile` 保留不動；新版位於 `apps/web`。

## 已實作

- 使用 Sites 登入與私人帳本，每個旅程由一位記帳者管理具名旅伴。
- 建立單幣別旅程、平均／指定金額分攤、收據上傳、部分或完整還款、作廢紀錄。
- 整數最小貨幣單位計算；TWD/USD/EUR/HKD 為兩位小數，JPY 為整數。均分尾差按保存的旅伴順序分配。
- 條件版本更新避免兩個分頁互相覆蓋；同一新增操作 ID 重送不會重複記帳。
- 每旅程 JSON 完整備份／匯入，包括作廢紀錄與收據 bytes、MIME、大小和 SHA-256。
- 相同 React 介面及業務邏輯可在獨立 Node.js 服務運行，改用 SQLite 和本機收據檔。

首版範圍：每帳本最多 50 個旅程、每旅程 2–20 位旅伴、300 筆支出、200 筆還款；每張收據 1 MiB、旅程收據合計 8 MiB、匯入 JSON 最大 14 MiB。固定旅伴與幣別；更正支出用「作廢後重記」。目前沒有多人協作、跨幣別換算、離線記帳、OCR、付款、訂閱或購買權益。帳本只記錄已發生的款項，不會執行轉帳。

## 程式結構

| 部分 | 位置 | 平台依賴 |
| --- | --- | --- |
| 共用畫面 | `app/ledger-app.tsx` | React；呼叫同源 `/api` |
| 金額及分攤 | `lib/domain.mjs` | 無 Sites 依賴 |
| 功能 API／授權 | `lib/api.mjs` | 注入已驗證 subject、repo、objects |
| SQL 存取 | `lib/repository.mjs` | 共用 SQLite SQL |
| 備份 | `lib/backup.mjs` | 版本化契約；不包含登入憑證 |
| Sites 入口 | `app/api/[...path]/route.ts` | 平台登入 headers、D1、R2 |
| 自架入口 | `standalone/server.mjs` | Node HTTP、獨立密碼與 session |
| 自架資料 | `standalone/storage.mjs` | SQLite＋同機收據目錄 |

Sites 身份以 Site ID＋驗證過的 subject 映射至內部 account UUID；不以使用者提供的 email 認領資料。自架首版採單一管理者密碼，匯入後由該管理者管理帳本；旅伴、支出、還款 ID 保持，收據儲存 ID 重新配置以防覆寫，內容與 SHA-256 保持。這是單一管理者的搬遷方案，尚非多使用者帳號遷移系統。

## Windows 本機執行

需要 Node.js **24 LTS** 與 npm。從本目錄執行（無需 Sites／Cloudflare 登入）：

```powershell
npm ci
node node_modules/vite/bin/vite.js build --config standalone/vite.config.ts
$secret = Read-Host '設定至少 12 字元的本機帳本密碼' -AsSecureString
$env:TRIPLEDGER_PASSWORD = [System.Net.NetworkCredential]::new('', $secret).Password
node standalone/server.mjs
```

開啟 `http://127.0.0.1:4180`，輸入剛設定的密碼。服務停止後，清除啟動用環境變數：

```powershell
Remove-Item Env:TRIPLEDGER_PASSWORD
```

預設只接受本機連線。資料存於 `.data/tripledger.sqlite` 與 `.data/receipts/`；可透過 `DATA_DIR` 指向同一台主機的持久磁碟目錄。每次啟動自動套用未執行的 `drizzle/*.sql` migration。密碼不寫入資料庫；重啟時重新提供同一密碼，已有登入 session 會失效。

不要把 SQLite 檔放在另一台主機的 SMB/NFS 共用磁碟；由單一服務集中存取本機資料。完整自架備份可停服務後複製整個資料目錄，或逐旅程匯出 JSON。

## NAS／Linux 容器的預備入口

本目錄提供 `standalone/Dockerfile`。使用 Node 24 Linux 容器；這次未在實體 NAS 或 Docker 環境驗證。對外提供服務時，要另外完成 HTTPS、網域／入口、持久磁碟與備份。

```sh
docker build -f standalone/Dockerfile -t tripledger-web .
```

啟動需設定 `TRIPLEDGER_PASSWORD`、`HOST=0.0.0.0`、`PORT=4180`、`PUBLIC_ORIGIN=https://你的帳本網域`、`DATA_DIR=/data`，並將 `/data` 掛載到 NAS 的本機磁碟卷。密碼由容器平台的秘密／環境設定提供，不寫入映像或 Git。網域應透過反向代理轉到服務；`PUBLIC_ORIGIN` 必須與外部使用者網址完全一致，代理保留該 Host。HTTPS 模式的 cookie 自動加入 Secure。這一版只有單一管理者帳本，不直接作公開大眾服務。

## 從 Sites 搬出

1. 在 Sites 的每個旅程切到「備份」，下載「此旅程備份」。原始碼備份與帳务備份是兩件事。
2. 啟動獨立服務並登入，在「備份」匯入每個 JSON。既有旅程會拒絕覆蓋。
3. 核對支出、還款、各旅伴餘額與收據；匯入時已核對檔案 checksum 與關聯完整性。
4. 真正切換前停止舊站寫入，重新匯出最終資料，還原到空白目的地，通過核對後再切換使用網址。

匯出固定單一旅程 document 版本，收據不可變且作廢時不刪除，因此同時新增帳目不會混合版本。此首版有嚴格大小限制，採受控 JSON＋base64；未做大量資料的串流、增量、跨旅程同時快照或平台整站匯出。增加上限前必須重新評估 Worker 記憶體、D1 單列大小與備份時間。

## 驗證（2026-09-22）

```sh
node --test tests/ledger.test.mjs
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vite/bin/vite.js build --config standalone/vite.config.ts
```

已通過：金額精度、均分尾差、指定分攤驗證、還款方向／作廢、未登入及跨帳本隔離、版本衝突、重送防重、錯誤備份拒絕、SQLite 重啟、收據 SHA-256 和還原。

`tests/migration-rehearsal.mjs` 在本機 Sites 開發服務（5173）建立 D1/R2 測試帳目，匯出後啟動 Windows 獨立 Node/SQLite 服務（4180），透過 HTTP 匯入並重啟驗證；不連線到公開／雲端站，也不依賴 Sites headers 來登入目的地。執行結果保存於已忽略的 `.test-output/rehearsal-*/report.json`。這項測試已通過，**雲端已部署版本的匯出／還原尚未實測**。

已透過瀏覽器驗證建立旅程、均分記帳、部分還款，並檢視手機 390px 畫面；桌面 1280px 的 DOM 尺寸檢查確認三欄排列且沒有橫向溢位。桌面完整截圖在目前瀏覽器工具中出現與 DOM 尺寸不符的畫面，故不把它列為可靠的桌面視覺驗收。WebMCP 的讀取餘額及開啟記帳表單工具已驗證正常與拒絕無效輸入的路徑。

## 發布狀態

已建立私人 Sites 專案，ID 保存在 `.openai/hosting.json`。本機 Sites 建置曾成功；部署前必須用相同來源重新完成官方 source push／打包／儲存版本流程。**本次未發布成功**：執行中原先存在的 Sites 外掛目錄消失，找不到官方 `site-workflow.mjs`，因此未產生可確認成功的雲端部署。

恢復 Sites 外掛後，重用 manifest 內的 project_id，不要再建立新 Site。完成發布與雲端資料驗證後再更新此狀態。原 GitHub remote 仍為 `leading-elvis/tripledger`；本次新版原始碼目前在本地，未推送 GitHub。
