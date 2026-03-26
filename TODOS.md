# TODOS

## Flutter OCR 前端測試覆蓋
- **What**: 為 Flutter OCR 模組補全測試（ocr_provider.dart 路由邏輯、scan_result_page prefill 邏輯）
- **Why**: 目前前端 OCR 模組 0% 測試覆蓋，任何改動無回歸保護
- **Blocked by**: 無
- **Added**: 2026-03-26 by /plan-eng-review

## 多幣別收據解析
- **What**: 處理觀光區收據同時顯示多幣別（如 JPY + USD）的情況
- **Why**: 東南亞/日本觀光區收據常有多幣別顯示，目前只取單一幣別
- **Approach**: MVP 階段遇到多幣別時降低信心分數，讓用戶手動確認。後續可加智慧選擇邏輯
- **Blocked by**: 多語言 OCR 基礎功能完成
- **Added**: 2026-03-26 by /plan-eng-review (Outside Voice 建議)

## ~~建立 DESIGN.md 設計系統~~ ✅ DONE
- **Completed**: 2026-03-26 by /design-consultation
