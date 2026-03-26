import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import '../config/ad_config.dart';

/// 插頁式廣告服務 Provider
final interstitialAdServiceProvider = Provider<InterstitialAdService>((ref) {
  return InterstitialAdService();
});

/// 插頁式廣告服務
/// 用於在特定時機（如結算完成後）顯示全屏廣告
class InterstitialAdService {
  InterstitialAd? _interstitialAd;
  bool _isAdLoaded = false;

  /// 廣告是否已載入
  bool get isAdLoaded => _isAdLoaded;

  /// 載入插頁式廣告
  /// 建議在可能需要顯示廣告的頁面 initState 時呼叫
  Future<void> loadAd() async {
    // 避免重複載入
    if (_isAdLoaded) return;

    await InterstitialAd.load(
      adUnitId: AdConfig.interstitialAdUnitId,
      request: const AdRequest(),
      adLoadCallback: InterstitialAdLoadCallback(
        onAdLoaded: (ad) {
          debugPrint('插頁式廣告載入成功');
          _interstitialAd = ad;
          _isAdLoaded = true;

          // 設定廣告事件回調
          _interstitialAd!.fullScreenContentCallback = FullScreenContentCallback(
            onAdShowedFullScreenContent: (ad) {
              debugPrint('插頁式廣告已顯示');
            },
            onAdDismissedFullScreenContent: (ad) {
              debugPrint('插頁式廣告已關閉');
              ad.dispose();
              _interstitialAd = null;
              _isAdLoaded = false;
              // 廣告關閉後重新載入下一則
              loadAd();
            },
            onAdFailedToShowFullScreenContent: (ad, error) {
              debugPrint('插頁式廣告顯示失敗: $error');
              ad.dispose();
              _interstitialAd = null;
              _isAdLoaded = false;
              // 重新載入
              loadAd();
            },
          );
        },
        onAdFailedToLoad: (error) {
          debugPrint('插頁式廣告載入失敗: $error');
          _isAdLoaded = false;
        },
      ),
    );
  }

  /// 顯示插頁式廣告
  /// 返回 true 表示廣告已顯示，false 表示廣告未準備好
  Future<bool> showAd() async {
    if (!_isAdLoaded || _interstitialAd == null) {
      debugPrint('插頁式廣告尚未準備好');
      // 嘗試載入廣告供下次使用
      loadAd();
      return false;
    }

    await _interstitialAd!.show();
    return true;
  }

  /// 釋放資源
  void dispose() {
    _interstitialAd?.dispose();
    _interstitialAd = null;
    _isAdLoaded = false;
  }
}
