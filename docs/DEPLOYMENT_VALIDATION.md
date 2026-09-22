# TripLedger 網頁部署與搬遷驗收

## GitHub 保存

- 分支：`refactor/web-sites-prototype`
- 草稿 PR：https://github.com/leading-elvis/tripledger/pull/1
- 功能基線提交：`035ff945d793ae05efdba4ed00cb176271595a4c`
- 已從遠端重新 clone 功能基線，重新安裝鎖定依賴，通過 7 項測試、TypeScript 檢查、Sites Worker 建置及獨立網頁建置。
- 備份檢視入口提交：`31fccf3bc7072d44d2da228be8ad37b0c9e657b8`；新增後再次通過 TypeScript、Sites Worker 及獨立網頁建置。後續 `d2df81b18fa599021dc799bba18309530680d3a4` 僅更新操作說明。
- 舊版 `main` 未修改。使用者帳目、收據、密碼及本機演練檔案不納入 Git。

## Sites 私人發布

- 專案：`appgprj_6ab2109b6a24819190d3b371de24f1ad`
- 正式網址：https://tripledger-elvis-lab.workspace-309457.chatgpt.site
- 受眾：僅擁有者；已查核 allowlist 只有 owner、沒有群組。後續更新均透過 owner-only 發布操作完成，未變更分享權限。
- 狀態：`succeeded`，最新版本 3，完成時間 `2026-09-22T06:43:49.140671+00:00`。
- 最新 GitHub 來源：`d2df81b18fa599021dc799bba18309530680d3a4`。
- 最新 Sites 來源：`e48d9a80e1333b01ff0a592085c87ba680197fe0`。
- 最新版本 ID：`appgprj_6ab2109b6a24819190d3b371de24f1ad~appgver_2471a8b322f48191b442b9bfe2c3613d`。
- 最新部署 ID：`appgdep_6ab223947c448191b5f9bfca531fa0df`。

GitHub 保存整個 monorepo；Sites 保存 `apps/web` 專用來源，兩者 SHA 不同。此驗收文件的後续提交不改動已部署的應用程式。

版本 1 已建立雲端測試資料；版本 2 新增備份檢視入口並完成以下還原測試。版本 3 只同步操作說明，沿用通過檢查且輸入未改變的應用程式建置。

## 雲端到 Windows 還原

**已通過。** 在私人正式 Sites 透過正常登入及網頁操作建立「雲端搬遷驗收 2026-09-22」，包含 2 位旅伴、TWD 1,265.00 支出、平均分攤、TWD 200.00 部分還款及 1 張 68-byte 合成 PNG。重新載入網頁後資料仍存在，雙方應收／應付餘額均為 TWD 432.50。這些全是合成測試資料，沒有實際轉帳。

本次內嵌瀏覽器未完成 Blob 檔案下載，因此新增並使用「檢視完整備份」入口：讀取網站呈現的全部原始 JSON，再以 UTF-8 保存至本機。資料由相同的受保護備份 API 產生，包含實際雲端收據 bytes；沒有改寫金額或重建收據，也沒有使用平台驗證繞過 token。**本次不將內嵌瀏覽器的直接下載／剪貼簿操作列為已驗證。**

- 雲端旅程 ID：`58f232d5-3a99-42c0-b942-d800f1950eb3`。
- 備份格式：`tripledger-backup`，schema 1、來源 revision 3。
- 匯出時間：`2026-09-22T06:39:28.460Z`。
- 完整 JSON 檔 SHA-256：`388ebfec1c72459143b4e92795b28263b83894c7608192309860f189ed74f6fe`。
- 收據 SHA-256：`c4166024f2e7da975c2c1a06b44962f891b0161538a633f8132dc4667e36153a`。
- 目的地：Windows、Node.js 24.19.0、全新 SQLite 與本機收據目錄，完全獨立於 Sites runtime。
- 驗證工具：[verify-web-backup.mjs](../scripts/verify-web-backup.mjs)。
- 本機報告：`apps/web/.test-output/cloud-restore-ska8Xo/report.json`，`passed: true`；資料與報告不提交至 Git。

通過項目：匿名存取拒絕、全部帳務與旅伴 ID／分攤／還款保留、雙方餘額一致、所有收據 bytes 與 SHA-256 一致、重複匯入回應 409 且不覆寫、正常停止並重啟後 SQLite／收據持久化、重啟後舊 session 失效、目的地再次匯出完整备份仍可驗證。收據儲存 ID 於匯入時重新配置，以免覆寫現有檔案。

使用 Node 24、依操作說明建置獨立網頁後，可從 GitHub 根目錄重做：

```powershell
node scripts/verify-web-backup.mjs "D:\path\to\backup.json"
```

工具只連 localhost，每次建立新的測試資料夾，結束後停止測試服務；不改動原始備份或雲端帳目。

## 實測界線

- 本次驗證為小型合成帳本；尚未做滿額容量、長時間壓力或大量收據測試。
- 未在實體 NAS／Docker 環境部署。Windows 測試服務僅監聽 loopback，測試完成後已關閉。
- 目前為单一管理者統一記帳，旅伴名稱不是登入帳號。多人協作、帳號綁定遷移、付費權益及公開對外營運待後續版本。
