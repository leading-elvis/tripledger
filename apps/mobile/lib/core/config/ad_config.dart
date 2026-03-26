import 'dart:io';

/// AdMob 廣告設定
///
/// 使用前請先在 AdMob 後台建立：
/// 1. 應用程式 (取得 App ID)
/// 2. 廣告單元 (取得 Ad Unit ID)
///
/// 設定步驟：
/// 1. 將下方的測試 ID 替換為你的正式 ID
/// 2. 更新 iOS Info.plist 中的 GADApplicationIdentifier
/// 3. 更新 Android AndroidManifest.xml 中的 com.google.android.gms.ads.APPLICATION_ID
class AdConfig {
  // ============================================================
  // 廣告模式切換
  // ============================================================

  /// 是否使用測試廣告
  /// - true: 使用 Google 官方測試廣告 ID（開發測試用）
  /// - false: 使用正式廣告 ID（上架發布用）
  static const bool useTestAds = false;

  // ============================================================
  // 正式 AdMob App IDs
  // ============================================================

  /// iOS App ID (正式)
  static const String _iosAppId = 'ca-app-pub-8002912489557897~3357342688';

  /// Android App ID (正式)
  static const String _androidAppId = 'ca-app-pub-8002912489557897~3868478576';

  // ============================================================
  // 正式 Banner Ad Unit IDs
  // ============================================================

  /// iOS Banner Ad Unit ID (正式)
  static const String _iosBannerAdUnitId = 'ca-app-pub-8002912489557897/5514207519';

  /// Android Banner Ad Unit ID (正式)
  static const String _androidBannerAdUnitId = 'ca-app-pub-8002912489557897/8216392471';

  // ============================================================
  // Google 官方測試 Ad Unit IDs
  // https://developers.google.com/admob/android/test-ads
  // ============================================================

  static const String _testIosBannerAdUnitId = 'ca-app-pub-3940256099942544/2934735716';
  static const String _testAndroidBannerAdUnitId = 'ca-app-pub-3940256099942544/6300978111';
  static const String _testIosInterstitialAdUnitId = 'ca-app-pub-3940256099942544/4411468910';
  static const String _testAndroidInterstitialAdUnitId = 'ca-app-pub-3940256099942544/1033173712';
  static const String _testIosRewardedAdUnitId = 'ca-app-pub-3940256099942544/1712485313';
  static const String _testAndroidRewardedAdUnitId = 'ca-app-pub-3940256099942544/5224354917';

  // ============================================================
  // 正式 Interstitial Ad Unit IDs (未來擴充用)
  // ============================================================

  /// iOS Interstitial Ad Unit ID (正式)
  static const String _iosInterstitialAdUnitId = 'ca-app-pub-8002912489557897/6316454614';

  /// Android Interstitial Ad Unit ID (正式)
  static const String _androidInterstitialAdUnitId = 'ca-app-pub-8002912489557897/2406690268';

  // ============================================================
  // 正式 Rewarded Ad Unit IDs (未來擴充用)
  // ============================================================

  /// iOS Rewarded Ad Unit ID (正式) - 請替換
  static const String _iosRewardedAdUnitId = 'ca-app-pub-3940256099942544/1712485313';

  /// Android Rewarded Ad Unit ID (正式) - 請替換
  static const String _androidRewardedAdUnitId = 'ca-app-pub-3940256099942544/5224354917';

  // ============================================================
  // 取得平台對應的 Ad Unit ID
  // ============================================================

  /// 取得當前平台的 App ID
  static String get appId {
    if (Platform.isIOS) {
      return _iosAppId;
    } else if (Platform.isAndroid) {
      return _androidAppId;
    }
    throw UnsupportedError('不支援的平台');
  }

  /// 取得 Banner 廣告 Unit ID
  static String get bannerAdUnitId {
    if (useTestAds) {
      // 使用測試廣告
      return Platform.isIOS ? _testIosBannerAdUnitId : _testAndroidBannerAdUnitId;
    }
    // 使用正式廣告
    if (Platform.isIOS) {
      return _iosBannerAdUnitId;
    } else if (Platform.isAndroid) {
      return _androidBannerAdUnitId;
    }
    throw UnsupportedError('不支援的平台');
  }

  /// 取得 Interstitial 廣告 Unit ID
  static String get interstitialAdUnitId {
    if (useTestAds) {
      return Platform.isIOS ? _testIosInterstitialAdUnitId : _testAndroidInterstitialAdUnitId;
    }
    if (Platform.isIOS) {
      return _iosInterstitialAdUnitId;
    } else if (Platform.isAndroid) {
      return _androidInterstitialAdUnitId;
    }
    throw UnsupportedError('不支援的平台');
  }

  /// 取得 Rewarded 廣告 Unit ID
  static String get rewardedAdUnitId {
    if (useTestAds) {
      return Platform.isIOS ? _testIosRewardedAdUnitId : _testAndroidRewardedAdUnitId;
    }
    if (Platform.isIOS) {
      return _iosRewardedAdUnitId;
    } else if (Platform.isAndroid) {
      return _androidRewardedAdUnitId;
    }
    throw UnsupportedError('不支援的平台');
  }
}
