import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:app_tracking_transparency/app_tracking_transparency.dart';

/// 廣告服務 Provider
final adServiceProvider = Provider<AdService>((ref) => AdService());

/// 廣告初始化狀態 Provider
final adInitializedProvider = StateProvider<bool>((ref) => false);

/// ATT 授權狀態 Provider
final attStatusProvider = StateProvider<TrackingStatus?>((ref) => null);

/// Google Mobile Ads 服務
class AdService {
  bool _isInitialized = false;

  /// 是否已初始化
  bool get isInitialized => _isInitialized;

  /// 初始化 Mobile Ads SDK
  /// 會先請求 ATT 授權（iOS 14+），再初始化廣告 SDK
  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      // iOS 14+ 需要先請求 ATT 授權
      if (Platform.isIOS) {
        await _requestTrackingAuthorization();
      }

      // 初始化 AdMob SDK
      await MobileAds.instance.initialize();
      _isInitialized = true;
      debugPrint('AdMob SDK 初始化成功');
    } catch (e) {
      debugPrint('AdMob SDK 初始化失敗: $e');
    }
  }

  /// 請求 App Tracking Transparency 授權 (iOS 14+)
  Future<TrackingStatus> _requestTrackingAuthorization() async {
    // 先檢查目前的授權狀態
    final status = await AppTrackingTransparency.trackingAuthorizationStatus;
    debugPrint('ATT 目前狀態: $status');

    // 如果尚未請求過，顯示授權對話框
    if (status == TrackingStatus.notDetermined) {
      // 等待一小段時間確保 App 已完全載入
      await Future.delayed(const Duration(milliseconds: 500));

      final newStatus = await AppTrackingTransparency.requestTrackingAuthorization();
      debugPrint('ATT 授權結果: $newStatus');
      return newStatus;
    }

    return status;
  }

  /// 取得目前 ATT 授權狀態
  Future<TrackingStatus> getTrackingStatus() async {
    if (!Platform.isIOS) {
      return TrackingStatus.notSupported;
    }
    return await AppTrackingTransparency.trackingAuthorizationStatus;
  }

  /// 設置測試裝置 ID（開發時使用）
  /// 在真機上運行時，可以從 logcat/console 取得測試裝置 ID
  void setTestDeviceIds(List<String> testDeviceIds) {
    MobileAds.instance.updateRequestConfiguration(
      RequestConfiguration(testDeviceIds: testDeviceIds),
    );
  }
}
