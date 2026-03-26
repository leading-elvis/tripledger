import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 廣告頻率控制服務
///
/// 集中管理插頁式廣告的顯示頻率，防止廣告疲勞：
/// - 兩次插頁廣告最少間隔 120 秒
/// - 每次 session 最多顯示 5 次
/// - 支援「每 N 次動作才顯示」的計數器
final adFrequencyServiceProvider = Provider<AdFrequencyService>((ref) {
  return AdFrequencyService();
});

class AdFrequencyService {
  DateTime? _lastInterstitialTime;
  int _sessionInterstitialCount = 0;
  final Map<String, int> _actionCounters = {};

  /// 兩次插頁廣告之間的最小間隔
  static const Duration minInterstitialInterval = Duration(seconds: 120);

  /// 每次 session 最多顯示的插頁廣告數
  static const int maxInterstitialsPerSession = 5;

  /// 檢查是否可以顯示插頁式廣告
  ///
  /// [actionKey] 動作識別 key，如 'bill_create', 'settlement_create'
  /// [showEveryN] 每 N 次動作才顯示一次，預設 1（每次都顯示）
  bool canShowInterstitial({
    required String actionKey,
    int showEveryN = 1,
  }) {
    // 1. Session 上限檢查
    if (_sessionInterstitialCount >= maxInterstitialsPerSession) return false;

    // 2. 時間間隔檢查
    if (_lastInterstitialTime != null) {
      final elapsed = DateTime.now().difference(_lastInterstitialTime!);
      if (elapsed < minInterstitialInterval) return false;
    }

    // 3. N 次動作頻率檢查
    _actionCounters[actionKey] = (_actionCounters[actionKey] ?? 0) + 1;
    if (_actionCounters[actionKey]! % showEveryN != 0) return false;

    return true;
  }

  /// 記錄已顯示插頁式廣告
  void recordInterstitialShown() {
    _lastInterstitialTime = DateTime.now();
    _sessionInterstitialCount++;
  }
}
