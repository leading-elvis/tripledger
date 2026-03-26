/// 社群登入設定
///
/// 請在此設定你的 LINE 和 Google OAuth 憑證。
/// 這些值需要從各平台的開發者控制台取得。
class SocialLoginConfig {
  // LINE Login 設定
  // 從 LINE Developers Console 取得: https://developers.line.biz/console/
  static const String lineChannelId = '2008996178';

  // Google Sign-In 設定
  // 從 Google Cloud Console 取得: https://console.cloud.google.com/
  // iOS 需要設定 iOS Client ID
  // Android 會自動使用 google-services.json 中的設定
  static const String googleIosClientId = String.fromEnvironment(
    'GOOGLE_IOS_CLIENT_ID',
    defaultValue: '',
  );

  // 檢查是否已設定
  static bool get isLineConfigured => lineChannelId.isNotEmpty;

  static bool get isGoogleConfigured => googleIosClientId.isNotEmpty;
}
