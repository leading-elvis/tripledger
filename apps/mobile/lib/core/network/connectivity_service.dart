import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 網路連線狀態
enum ConnectivityStatus {
  connected,
  disconnected,
  checking,
}

/// 網路連線服務 Provider
final connectivityServiceProvider = Provider<ConnectivityService>((ref) {
  return ConnectivityService();
});

/// 網路連線狀態 Provider
final connectivityStatusProvider = StateNotifierProvider<ConnectivityStatusNotifier, ConnectivityStatus>((ref) {
  final service = ref.watch(connectivityServiceProvider);
  return ConnectivityStatusNotifier(service);
});

/// 網路連線服務
class ConnectivityService {
  /// 連線檢查逾時時間
  static const Duration _checkTimeout = Duration(seconds: 5);

  /// 檢查網路連線狀態
  Future<bool> checkConnectivity() async {
    try {
      // 嘗試連線 Google DNS
      final result = await InternetAddress.lookup('google.com')
          .timeout(_checkTimeout);
      return result.isNotEmpty && result[0].rawAddress.isNotEmpty;
    } on SocketException catch (_) {
      return false;
    } on TimeoutException catch (_) {
      return false;
    } catch (_) {
      return false;
    }
  }

  /// 檢查 API 伺服器連線狀態
  Future<bool> checkApiConnectivity(String baseUrl) async {
    try {
      final uri = Uri.parse(baseUrl);
      final result = await InternetAddress.lookup(uri.host)
          .timeout(_checkTimeout);
      return result.isNotEmpty && result[0].rawAddress.isNotEmpty;
    } on SocketException catch (_) {
      return false;
    } on TimeoutException catch (_) {
      return false;
    } catch (_) {
      return false;
    }
  }
}

/// 網路連線狀態通知器
/// 使用智慧輪詢策略以節省電量：
/// - 連線正常時：每 2 分鐘檢查一次
/// - 斷線時：每 10 秒檢查一次（快速恢復）
/// - API 操作成功/失敗時自動更新狀態
class ConnectivityStatusNotifier extends StateNotifier<ConnectivityStatus> {
  final ConnectivityService _service;
  Timer? _checkTimer;

  // 輪詢間隔常數
  static const Duration _connectedInterval = Duration(minutes: 2);
  static const Duration _disconnectedInterval = Duration(seconds: 10);

  ConnectivityStatusNotifier(this._service) : super(ConnectivityStatus.checking) {
    _startMonitoring();
  }

  /// 開始監控網路狀態
  void _startMonitoring() {
    // 立即檢查一次
    checkConnectivity();
  }

  /// 根據當前狀態調整輪詢間隔
  void _scheduleNextCheck() {
    _checkTimer?.cancel();

    final interval = state == ConnectivityStatus.disconnected
        ? _disconnectedInterval
        : _connectedInterval;

    _checkTimer = Timer(interval, () {
      checkConnectivity();
    });
  }

  /// 手動檢查連線狀態
  Future<bool> checkConnectivity() async {
    state = ConnectivityStatus.checking;

    final isConnected = await _service.checkConnectivity();
    state = isConnected ? ConnectivityStatus.connected : ConnectivityStatus.disconnected;

    // 安排下一次檢查
    _scheduleNextCheck();

    return isConnected;
  }

  /// 重置為已連線狀態（用於 API 請求成功時）
  /// 這避免了在 API 正常工作時進行不必要的輪詢
  void setConnected() {
    if (state != ConnectivityStatus.connected) {
      state = ConnectivityStatus.connected;
      _scheduleNextCheck();
    }
  }

  /// 設為斷線狀態（用於網路錯誤時）
  /// 這會觸發更頻繁的檢查以便快速恢復
  void setDisconnected() {
    if (state != ConnectivityStatus.disconnected) {
      state = ConnectivityStatus.disconnected;
      _scheduleNextCheck();
    }
  }

  @override
  void dispose() {
    _checkTimer?.cancel();
    super.dispose();
  }
}

/// 網路連線狀態 Widget
/// 在斷線時顯示提示橫幅
class ConnectivityBanner extends ConsumerWidget {
  final Widget child;

  const ConnectivityBanner({
    super.key,
    required this.child,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(connectivityStatusProvider);

    return Column(
      children: [
        // 斷線提示橫幅
        AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          height: status == ConnectivityStatus.disconnected ? 40 : 0,
          child: status == ConnectivityStatus.disconnected
              ? Material(
                  color: const Color(0xFFEF4444),
                  child: SafeArea(
                    bottom: false,
                    child: SizedBox(
                      height: 40,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.wifi_off_rounded,
                            color: Colors.white,
                            size: 18,
                          ),
                          const SizedBox(width: 8),
                          const Text(
                            '網路連線中斷',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(width: 12),
                          GestureDetector(
                            onTap: () {
                              ref.read(connectivityStatusProvider.notifier).checkConnectivity();
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Text(
                                '重試',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                )
              : const SizedBox.shrink(),
        ),
        // 主要內容
        Expanded(child: child),
      ],
    );
  }
}

/// 可重試的 Widget
/// 用於在網路錯誤時顯示重試按鈕
class RetryWidget extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  final bool isLoading;

  const RetryWidget({
    super.key,
    this.message = '載入失敗，請檢查網路連線',
    required this.onRetry,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.wifi_off_rounded,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[600],
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),
            isLoading
                ? const CircularProgressIndicator()
                : OutlinedButton.icon(
                    onPressed: onRetry,
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('重試'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
          ],
        ),
      ),
    );
  }
}
