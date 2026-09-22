# TripLedger 網頁部署與搬遷驗收

## GitHub 保存

- 分支：`refactor/web-sites-prototype`
- 草稿 PR：https://github.com/leading-elvis/tripledger/pull/1
- 功能基線提交：`035ff945d793ae05efdba4ed00cb176271595a4c`
- 已從遠端重新 clone，重新安裝鎖定依賴，通過 7 項测试、TypeScript 檢查、Sites Worker 建置及獨立網頁建置。
- 舊版 `main` 未修改。使用者帳目、收據、密碼及本機演練檔案不納入 Git。

## Sites 私人發布

- 專案：`appgprj_6ab2109b6a24819190d3b371de24f1ad`
- 目標受眾：僅擁有者。
- 官方本機工具已恢復，既有來源儲存庫已開啟；首次發布進行中。
- 部署成功後補入：GitHub 來源提交、Sites 來源提交、版本、部署 ID、正式 URL。

## 雲端到 Windows 還原

待首次發布成功後，以合成旅程、支出、部分還款與測試圖片驗收。現有通過的演練來源為本機 D1/R2，不能代替雲端驗收。

驗收應核對旅程、旅伴、支出、分攤與還款 ID／金額、所有旅伴餘額、收據 SHA-256、服務重啟後持久化及重複匯入拒絕。備份匯入會重新配置收據儲存 ID，檔案內容必須一致。
