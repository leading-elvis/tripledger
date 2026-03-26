import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../core/network/api_exception.dart';
import '../../core/config/theme.dart';
import '../../features/purchase/presentation/paywall_dialog.dart';

/// 統一錯誤處理工具
class ErrorHandler {
  /// 從例外中取得使用者友善的錯誤訊息
  static String getMessage(dynamic error) {
    if (error is ApiException) {
      return error.message;
    }

    if (error is DioException) {
      return ApiException.fromDioException(error).message;
    }

    if (error is FormatException) {
      return '資料格式錯誤';
    }

    if (error is TypeError) {
      return '資料處理錯誤';
    }

    // 嘗試動態取得 message 屬性
    // 若錯誤物件沒有 message 屬性或存取失敗，則忽略並使用 toString() 作為後備
    try {
      final message = (error as dynamic).message;
      if (message is String && message.isNotEmpty) {
        return message;
      }
    } catch (_) {
      // 預期行為：部分錯誤類型沒有 message 屬性，忽略並繼續
    }

    return error?.toString() ?? '發生未知錯誤';
  }

  /// 取得 ApiException（若適用）
  static ApiException? getApiException(dynamic error) {
    if (error is ApiException) {
      return error;
    }
    if (error is DioException) {
      return ApiException.fromDioException(error);
    }
    return null;
  }

  /// 顯示錯誤 SnackBar
  static void showErrorSnackBar(
    BuildContext context,
    dynamic error, {
    String? prefix,
    Duration duration = const Duration(seconds: 4),
  }) {
    final message = getMessage(error);
    final displayMessage = prefix != null ? '$prefix：$message' : message;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(
              Icons.error_outline_rounded,
              color: Colors.white,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                displayMessage,
                style: const TextStyle(fontSize: 14),
              ),
            ),
          ],
        ),
        backgroundColor: AppTheme.categoryColors['FOOD'],
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        margin: const EdgeInsets.all(16),
        duration: duration,
        action: SnackBarAction(
          label: '關閉',
          textColor: Colors.white,
          // SnackBarAction 點擊後會自動關閉 SnackBar，無需額外處理
          onPressed: () {},
        ),
      ),
    );
  }

  /// 顯示成功 SnackBar
  static void showSuccessSnackBar(
    BuildContext context,
    String message, {
    Duration duration = const Duration(seconds: 3),
  }) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(
              Icons.check_circle_rounded,
              color: Colors.white,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(fontSize: 14),
              ),
            ),
          ],
        ),
        backgroundColor: AppTheme.categoryColors['TRANSPORT'],
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        margin: const EdgeInsets.all(16),
        duration: duration,
      ),
    );
  }

  /// 顯示警告 SnackBar
  static void showWarningSnackBar(
    BuildContext context,
    String message, {
    Duration duration = const Duration(seconds: 4),
  }) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(
              Icons.warning_amber_rounded,
              color: Colors.white,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(fontSize: 14),
              ),
            ),
          ],
        ),
        backgroundColor: AppTheme.categoryColors['SHOPPING'],
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        margin: const EdgeInsets.all(16),
        duration: duration,
      ),
    );
  }

  /// 顯示網路錯誤對話框
  static Future<bool> showNetworkErrorDialog(
    BuildContext context, {
    VoidCallback? onRetry,
  }) async {
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        icon: Container(
          width: 60,
          height: 60,
          decoration: BoxDecoration(
            gradient: AppTheme.dangerGradient,
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Icon(
            Icons.wifi_off_rounded,
            color: Colors.white,
            size: 30,
          ),
        ),
        title: const Text(
          '網路連線問題',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        content: const Text(
          '無法連線至伺服器，請檢查您的網路連線後再試一次。',
          textAlign: TextAlign.center,
          style: TextStyle(height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(
              '稍後再試',
              style: TextStyle(color: Colors.grey[600]),
            ),
          ),
          if (onRetry != null)
            FilledButton(
              onPressed: () {
                Navigator.pop(context, true);
                onRetry();
              },
              style: FilledButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              child: const Text('重試'),
            ),
        ],
      ),
    );
    return result ?? false;
  }

  /// 判斷是否為網路錯誤
  static bool isNetworkError(dynamic error) {
    final apiException = getApiException(error);
    if (apiException != null) {
      return apiException.type == ApiExceptionType.network ||
             apiException.type == ApiExceptionType.timeout;
    }
    return false;
  }

  /// 判斷是否為授權錯誤
  static bool isAuthError(dynamic error) {
    final apiException = getApiException(error);
    if (apiException != null) {
      return apiException.type == ApiExceptionType.unauthorized;
    }
    return false;
  }

  /// 判斷是否為需要升級的錯誤
  static bool isUpgradeRequired(dynamic error) {
    final apiException = getApiException(error);
    return apiException?.isUpgradeRequired ?? false;
  }

  /// 顯示升級進階版對話框
  /// 如果提供 tripId，會顯示完整的付費牆；否則顯示簡易提示
  static Future<bool> showUpgradeDialog(
    BuildContext context,
    dynamic error, {
    String? tripId,
  }) async {
    final apiException = getApiException(error);
    if (apiException == null || !apiException.isUpgradeRequired) {
      return false;
    }

    String featureName;
    if (apiException.isPremiumRequired) {
      featureName = '收據掃描';
    } else if (apiException.isMemberLimitReached) {
      featureName = '無限成員';
    } else if (apiException.isBillLimitReached) {
      featureName = '無限帳單';
    } else {
      featureName = '進階功能';
    }

    // 如果有 tripId，顯示完整付費牆
    if (tripId != null) {
      final result = await PaywallDialog.show(
        context,
        tripId: tripId,
        featureName: featureName,
      );
      return result ?? false;
    }

    // 沒有 tripId 時顯示簡易提示
    String description;
    IconData icon;

    if (apiException.isPremiumRequired) {
      description = '此功能僅限進階版使用，升級後即可解鎖收據掃描等強大功能。';
      icon = Icons.document_scanner_rounded;
    } else if (apiException.isMemberLimitReached) {
      description = '免費版最多 5 位成員，升級進階版即可邀請更多夥伴一起分帳！';
      icon = Icons.group_add_rounded;
    } else if (apiException.isBillLimitReached) {
      description = '免費版每趟旅程最多 50 筆帳單，升級進階版即可無限記帳！';
      icon = Icons.receipt_long_rounded;
    } else {
      description = apiException.message;
      icon = Icons.star_rounded;
    }

    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        icon: Container(
          width: 60,
          height: 60,
          decoration: BoxDecoration(
            gradient: AppTheme.primaryGradient,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Icon(
            icon,
            color: Colors.white,
            size: 30,
          ),
        ),
        title: Text(
          featureName,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        content: Text(
          description,
          textAlign: TextAlign.center,
          style: const TextStyle(height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(
              '稍後',
              style: TextStyle(color: Colors.grey[600]),
            ),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: const Text('了解更多'),
          ),
        ],
      ),
    );
    return result ?? false;
  }
}
