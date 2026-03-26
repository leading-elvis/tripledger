# Design System — TripLedger

## Product Context
- **What this is:** 旅行群組分帳 app — 拍收據自動建帳、多幣別支援、最佳化結算
- **Who it's for:** 台灣旅行者，與朋友一起出國旅行時分帳
- **Space/industry:** 旅行金融工具（Splitwise、Tricount、TravelSpend 同類）
- **Project type:** Flutter 跨平台手機 app（iOS + Android）

## Aesthetic Direction
- **Direction:** Luxury/Refined + Playful — 金融級可信賴感，用在朋友旅行的輕鬆場景
- **Decoration level:** Intentional — 漸層只在高光時刻（主 CTA、成功動畫、重要金額），不是所有按鈕都用漸層
- **Mood:** 專業但不冰冷，精緻但不距離感。像一個你信任的朋友幫你管帳
- **Reference sites:** Splitwise（薄荷綠，Material 風格）、Tricount（藍色，簡潔）、Revolut/Monzo（fintech 精緻感）

## Typography
- **Display/Hero:** Plus Jakarta Sans 800 — 用於金額顯示、頁面標題。字重厚實，數字辨識度高，支援 tabular-nums。letter-spacing: -1.5px ~ -2px
- **Body:** Noto Sans TC 400/500 — 繁體中文首選，涵蓋所有中文字元，與 Plus Jakarta Sans 視覺協調
- **UI/Labels:** Plus Jakarta Sans 600 — 按鈕文字、標籤、chip 文字
- **Data/Tables:** Plus Jakarta Sans 600 (tabular-nums) — 金額列表、結算明細，等寬數字對齊
- **Code:** JetBrains Mono
- **Loading:** Google Fonts CDN，Flutter 透過 google_fonts package
- **Scale:**
  - Display: 48px (頁面大標題)
  - Amount: 44px (金額顯示)
  - H1: 28px (section 標題)
  - H2: 20px (卡片標題)
  - H3: 18px (AppBar 標題)
  - Body: 16px (正文)
  - Body-sm: 15px (按鈕、次要正文)
  - Caption: 14px (說明文字)
  - Small: 13px (標籤、metadata)
  - Tiny: 12px (badge、時間戳)

## Color
- **Approach:** Balanced — 品牌色用於強調，語義色用於功能，中性色用於結構
- **Primary:** #6366F1 (Indigo) — 品牌主色，CTA、連結、選中狀態
- **Secondary:** #8B5CF6 (Violet) — 漸層配對色，與 Primary 搭配用於高光時刻
- **Accent:** #06B6D4 (Cyan) — 強調色，用於交通類別、次要亮點
- **Neutrals:** Cool grays — #F8FAFC (lightest) → #F1F5F9 → #E2E8F0 → #CBD5E1 → #94A3B8 → #64748B → #475569 → #334155 → #1E293B → #0F172A (darkest)
- **Semantic:**
  - Success: #10B981 — 收款、已確認、結算完成
  - Warning: #F59E0B — 低信心、待確認、提醒
  - Error: #EF4444 — 欠款、錯誤、刪除操作
  - Info: #3B82F6 — 提示、降級通知
- **Category colors:**
  - FOOD: #EF4444
  - TRANSPORT: #06B6D4
  - ACCOMMODATION: #8B5CF6
  - ATTRACTION: #F59E0B
  - SHOPPING: #EC4899
  - OTHER: #6B7280
- **Dark mode:**
  - Background: #0F172A
  - Surface: #1E293B
  - Surface-alt: #334155
  - 色彩飽和度降低 10-15%
  - 移除陰影，用邊框 (#334155) 區分層級

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable — 不過於緊湊也不過於寬鬆
- **Scale:** 2xs(2) xs(4) sm(8) md(16) lg(24) xl(32) 2xl(48) 3xl(64)
- **Common patterns:**
  - Card padding: 16px all
  - Button padding: 14px vertical, 24px horizontal
  - Input padding: 14px vertical, 16px horizontal
  - Section gap: 24px
  - Screen horizontal padding: 20px

## Layout
- **Approach:** Grid-disciplined — 手機 app，嚴格對齊
- **Grid:** Single column (mobile-first), 20px side margins
- **Max content width:** N/A (手機 app)
- **Border radius:**
  - sm: 8px — 小按鈕、輸入框
  - md: 12px — 按鈕、文字欄位
  - lg: 16px — 卡片、容器
  - xl: 20px — 對話框、底部面板
  - 2xl: 24px — 大型元件
  - full: 999px — chip、badge、頭像

## Motion
- **Approach:** Intentional — 每個動畫都有目的，不做裝飾性動畫
- **Easing:** enter(easeOut) exit(easeIn) move(easeInOut) bounce(easeOutBack)
- **Duration:** micro(150ms) short(300ms) medium(500ms) long(800ms)
- **Patterns:**
  - 進場: fadeIn + slideY(0.1) — 300ms easeOut
  - 卡片列表: staggered delay 50ms per item
  - 按鈕按下: scale(0.96) — 150ms
  - 金額計數: TweenAnimation — 800ms easeOut
  - 成功: scale bounce from 0.8 — 300ms easeOutBack
  - 載入: skeleton shimmer — 1200ms loop
  - 頁面轉場: slideUp(0.1) + fadeIn — 300ms easeOutCubic

## Confidence Indicators (OCR 專用)
- **High (≥ 0.8):** #10B981 dot + 「已確認」
- **Medium (0.5-0.8):** #F59E0B dot + 「請幫我確認」+ 欄位淡黃色背景
- **Low (< 0.5):** #EF4444 dot + 「需要手動輸入」+ 空欄位等待填寫
- **設計原則:** 顏色 + 文字雙重提示（色盲友好），協作語氣非技術語言
- **學習回饋:** 用戶修改後顯示「已記住，下次更準確」淡入淡出 1.5 秒

## Gradient Usage Rules
- **主 CTA 按鈕:** Primary → Secondary 漸層 (135deg)
- **成功動畫/高光時刻:** 允許漸層
- **次要按鈕:** 實色或邊框，不用漸層
- **背景:** 不用漸層（深色模式用純色）
- **原則:** 漸層是獎賞，不是預設。讓它珍貴。

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-26 | 初始設計系統建立 | 基於現有 AppTheme 文檔化 + 競品研究 (Splitwise/Tricount) |
| 2026-03-26 | 加入 Plus Jakarta Sans + Noto Sans TC | 系統字體缺乏品牌識別度，自訂字體讓金額顯示更專業 |
| 2026-03-26 | 漸層只用於高光時刻 | 所有按鈕都漸層會稀釋視覺重量，限制使用讓 CTA 更突出 |
| 2026-03-26 | 信心指標用協作語氣 | 「請幫我確認」比「Low confidence」更建立信任 |
| 2026-03-26 | 語義色強化 | 新增 warning (#F59E0B) 和 info (#3B82F6) 用於 OCR 信心指標和降級提示 |
