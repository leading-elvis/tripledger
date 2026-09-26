# TripLedger 旅伴帳本

手機優先的旅程分帳網頁首版，支援桌面、單幣別分攤、還款、收據與完整備份。

操作、自架、架構、驗證與目前發布狀態請見 [SELF_HOSTING.md](./SELF_HOSTING.md)。

## 日常開發

需要 Node.js 24 與 npm。這個目錄保留 Sites 官方 starter 的開發與建置流程。

```sh
npm ci
npm run dev
```

本機 Sites 預覽使用 D1/R2 模擬持久化；首次需以 Wrangler 對本機 DB 執行 `drizzle/*.sql`。開發登入為本機模擬身份，只供開發。正式 Sites 使用平台登入；自架版本使用獨立密碼，請勿把開發模擬登入當作正式認證。

## 驗證

```sh
node --test tests/ledger.test.mjs
node node_modules/typescript/bin/tsc --noEmit
```

`tests/migration-rehearsal.mjs` 需要本機 Sites 開發服務在 5173，獨立介面已建置，且 4180 可使用。這是本機測試，不會讀寫雲端 Sites 帳目。

不要提交 `.data`、`.test-output`、`.wrangler`、`.sites-runtime`、環境密碼或使用者備份檔。
