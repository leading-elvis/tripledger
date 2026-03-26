# TripLedger iOS 開發筆記

> 此文件記錄專案概覽與 iOS 開發設定步驟，供在 Mac 上繼續開發時參考。

---

## 專案概覽

**TripLedger** 是一個跨平台旅遊分帳系統，專為旅行團體設計。

| 項目 | 說明 |
|------|------|
| **功能** | 多人旅程管理、帳單記錄、智慧結算、社群登入 |
| **貨幣** | 僅支援新台幣 (TWD) |
| **語言** | 繁體中文 |
| **後端** | NestJS + TypeScript + Prisma + PostgreSQL |
| **前端** | Flutter + Riverpod |
| **API 網址** | https://tripledger-api-297896850903.asia-east1.run.app |

---

## 專案結構

```
TripLedger/
├── apps/
│   ├── api/              # 後端 NestJS
│   └── mobile/           # 前端 Flutter（iOS/Android/Web）
├── infrastructure/
│   └── docker/           # Docker 設定
└── scripts/              # 開發腳本
```

---

## Mac 環境設定步驟

### 1. 安裝必要工具

```bash
# 安裝 Xcode（從 App Store 下載）
# 下載完成後執行：
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch

# 安裝 CocoaPods
sudo gem install cocoapods

# 安裝 Flutter
brew install --cask flutter

# 檢查環境
flutter doctor
```

### 2. 設定專案

```bash
cd TripLedger/apps/mobile

# 安裝依賴
flutter pub get

# 產生程式碼
dart run build_runner build --delete-conflicting-outputs

# 安裝 iOS 原生依賴
cd ios
pod install
cd ..
```

### 3. 執行 App

```bash
# 開啟模擬器
open -a Simulator

# 執行
flutter run
```

### 4. 實機測試設定

1. 開啟 Xcode：
   ```bash
   open ios/Runner.xcworkspace
   ```

2. 設定簽章：
   - 選擇 Runner 專案
   - Signing & Capabilities → 勾選 Automatically manage signing
   - 選擇你的 Team（Apple ID）

3. USB 連接 iPhone，執行：
   ```bash
   flutter run -d <iPhone名稱>
   ```

---

## 社群登入設定狀態

| 項目 | 狀態 | 設定檔案 |
|------|------|----------|
| Google Sign-In | ✅ 已設定 | `ios/Runner/Info.plist` |
| LINE Login | ⚠️ 需替換 Channel ID | `ios/Runner/Info.plist` |

### LINE Login 設定

1. 至 [LINE Developers Console](https://developers.line.biz/console/) 取得 Channel ID
2. 編輯 `ios/Runner/Info.plist`，替換：
   - `LineSDKChannelID`: 填入你的 Channel ID
   - `line3rdp.YOUR_LINE_CHANNEL_ID`: 改為 `line3rdp.<你的Channel ID>`

---

## 常用指令

| 任務 | 指令 |
|------|------|
| 執行 App（模擬器） | `flutter run` |
| 執行 App（實機） | `flutter run -d <裝置名>` |
| 列出裝置 | `flutter devices` |
| 建置 iOS | `flutter build ios --release` |
| 建置 IPA | `flutter build ipa` |
| 開啟 Xcode | `open ios/Runner.xcworkspace` |
| 更新依賴 | `flutter pub get && cd ios && pod install && cd ..` |

---

## 後端連線設定

編輯 `apps/mobile/lib/core/config/api_config.dart`：

```dart
// 連線到雲端 API（已部署）
static const bool forceProduction = true;

// 連線到本地開發伺服器
static const bool forceProduction = false;
```

---

## 相關文件

- [CLAUDE.md](./CLAUDE.md) - 完整開發指南
- [GETTING_STARTED.md](./GETTING_STARTED.md) - 環境建置指南
- [apps/mobile/ios/Runner/Info.plist](./apps/mobile/ios/Runner/Info.plist) - iOS 設定檔

---

## 下一步

1. ✅ 將專案複製到 Mac
2. ⬜ 安裝 Xcode 與 Flutter
3. ⬜ 執行 `flutter doctor` 確認環境
4. ⬜ 執行專案設定指令
5. ⬜ 在模擬器測試
6. ⬜ 設定簽章後在實機測試
7. ⬜ （選用）設定 LINE Login Channel ID

---

*文件建立日期：2026-01-26*


旅遊分帳不再是難題！TripLedger 讓團體旅遊的費用分攤變得簡單透明。

【主要功能】
• 快速建立旅程，邀請好友一起加入
• 輕鬆記錄每筆消費，支援多種分帳方式
• 智慧計算最佳還款路徑，減少轉帳次數
• 即時查看每個人的應付/應收金額
• 支援 LINE、Google 快速登入

【分帳方式】
• 均分 - 所有人平均分攤
• 指定金額 - 自訂每人付多少
• 百分比 - 依比例分配
• 份數 - 依人數份額計算

【適用場景】
✈️ 國內外旅遊
🍽️ 聚餐活動
🏠 合租費用
🎉 各種團體活動

下載 TripLedger，讓分帳從此不再尷尬！


分帳,AA,旅遊,團體,費用,記帳,均分,結算,好友,聚餐,出遊,消費,帳單,分攤,理財
