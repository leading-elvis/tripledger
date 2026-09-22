# TripLedger 首版：Sites 與自架

這是手機優先、同時支援桌面的首版內測網頁。原本 `apps/api`、`apps/mobile` 保留不動；新版位於 `apps/web`。

## 已實作

- 使用 Sites 登入與私人帳本，每個旅程由一位記帳者管理具名旅伴。
- 建立單幣別旅程、平均／指定金額分攤、收據上傳、部分或完整還款、作廢紀錄。
- 支出更正保留修改前後內容及時間；旅程改名、封存／解除封存保留歷史。封存旅程唯讀，仍可備份。
- 支出名稱／付款旅伴搜尋、分類／日期／有效或作廢或已更正篩選，篩選不改變帳本總額。
- 新增與更正表單遇到版本衝突會保留輸入，核對最新帳務後才能重送；另一分頁封存旅程時不切換草稿的目標旅程。
- 收據支援選檔、拍照入口與預覽；超過 1 MiB 的 JPG／PNG／WebP 會嘗試縮小為 JPEG，最終上傳檔案須小於等於 1 MiB。
- 整數最小貨幣單位計算；TWD/USD/EUR/HKD 為兩位小數，JPY 為整數。均分尾差按保存的旅伴順序分配。
- 條件版本更新避免兩個分頁互相覆蓋；同一新增操作 ID 重送不會重複記帳。
- 每旅程 JSON 完整備份／匯入，包括作廢紀錄與收據 bytes、MIME、大小和 SHA-256。
- 相同 React 介面及業務邏輯可在獨立 Node.js 服務運行，改用 SQLite 和本機收據檔。

內測範圍：每帳本最多 50 個旅程、每旅程 2–20 位旅伴、300 筆支出、200 筆還款、300 筆更正／作廢／旅程異動歷史；旅程 document 上限 1 MiB。達上限時拒絕新異動，不刪除舊歷史；封存時預留解除封存的名額與容量。每張收據 1 MiB、旅程收據合計 8 MiB、匯入 JSON 最大 14 MiB。固定旅伴與幣別；更正時保留原收據，收據替換另行規劃。目前沒有多人協作、跨幣別換算、離線記帳、OCR、付款、訂閱或購買權益。帳本只記錄已發生的款項，不會執行轉帳。

目前匯出備份 schema 2，包含封存狀態、原始及更正後資料與異動時間；仍接受 schema 1 備份。舊資料沒有保存均分／指定模式，匯入或首次更正採原有分攤金額，不自動重新分配。歷史快照不重複儲存收據，匯入重新配置收據 ID 時不影響歷史。schema 2 備份須使用本版或更新版本還原；更正資料開始使用後，不可直接退回會忽略歷史的舊程式繼續寫入。

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

1. 在 Sites 的每個旅程切到「備份」，下載「此旅程備份」。若內嵌瀏覽器無法下載，可用「檢視完整備份」取得全部 JSON，另存為 UTF-8 `.json` 檔。原始碼備份與帳務備份是兩件事。
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

`tests/migration-rehearsal.mjs` 在本機 Sites 開發服務（5173）建立 D1/R2 測試帳目，匯出後啟動 Windows 獨立 Node/SQLite 服務（4180），透過 HTTP 匯入並重啟驗證；不連線到公開／雲端站，也不依賴 Sites headers 來登入目的地。執行結果保存於已忽略的 `.test-output/rehearsal-*/report.json`。這項本機測試已通過。

已另以私人雲端 Sites 的真實合成帳目及收據完成 Windows 還原。GitHub 根目錄的 `scripts/verify-web-backup.mjs` 接受已匯出的完整 JSON，使用全新 SQLite／檔案目錄驗證所有帳務、收據、重複匯入拒絕及重啟持久化；只連 localhost，不自行取得雲端登入權杖。使用 Node 24 執行 `node scripts/verify-web-backup.mjs <備份檔完整路徑>`。實際來源、匯出方式與限制見下方部署驗收紀錄。

已透過瀏覽器驗證建立旅程、均分記帳、部分還款，並檢視手機 390px 畫面；桌面 1280px 的 DOM 尺寸檢查確認三欄排列且沒有橫向溢位。桌面完整截圖在目前瀏覽器工具中出現與 DOM 尺寸不符的畫面，故不把它列為可靠的桌面視覺驗收。WebMCP 的讀取餘額及開啟記帳表單工具已驗證正常與拒絕無效輸入的路徑。

## 發布狀態

私人 Sites 專案 ID 保存在 `.openai/hosting.json`。重用既有 project_id，透過官方 Sites source push／打包／儲存版本流程發布，不要重建另一個 Site。

每次發布及雲端還原的實際結果記錄於 [部署與搬遷驗收紀錄](https://github.com/leading-elvis/tripledger/blob/refactor/web-sites-prototype/docs/DEPLOYMENT_VALIDATION.md)。Sites 的部署提交是 `apps/web` 專用儲存庫提交；GitHub 提交則包含整個 monorepo，兩者的 SHA 不相同，以驗收紀錄對應來源與版本。

新版原始碼已推送至 [GitHub 獨立分支 refactor/web-sites-prototype](https://github.com/leading-elvis/tripledger/tree/refactor/web-sites-prototype)。舊版 main 保持不變。已從 GitHub 重新 clone 提交 `035ff945d793ae05efdba4ed00cb176271595a4c`，重新安裝鎖定依賴後通過 7 項測試、TypeScript 檢查、Sites Worker 建置及獨立網頁建置。提交包含必要的 `build/sites-vite-plugin.ts` 與授權檔；資料、收據、測試輸出、秘密設定及建置快取不納入版本。

若本機 Sites 工具缺失，先透過官方介面恢復，再使用相同專案接續。[Plugins 文件](https://learn.chatgpt.com/docs/plugins#install-and-use-a-plugin) 說明本機 bundle 與既有 MCP 連線可分別存在；連接器可讀取專案，不代表本機發布工具完整。
