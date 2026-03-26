import 'package:dio/dio.dart';

/// API 異常類型
enum ApiExceptionType {
  network,        // 網路連線問題
  timeout,        // 請求逾時
  server,         // 伺服器錯誤 (5xx)
  badRequest,     // 請求錯誤 (4xx)
  unauthorized,   // 未授權 (401)
  forbidden,      // 權限不足 (403)
  notFound,       // 資源不存在 (404)
  conflict,       // 資源衝突 (409)
  validation,     // 驗證錯誤 (422)
  unknown,        // 未知錯誤
}

/// API 異常
class ApiException implements Exception {
  final ApiExceptionType type;
  final String message;
  final int? statusCode;
  final String? errorCode;  // 錯誤碼，如 PREMIUM_REQUIRED, MEMBER_LIMIT_REACHED
  final dynamic originalError;
  final Map<String, dynamic>? errors;

  ApiException({
    required this.type,
    required this.message,
    this.statusCode,
    this.errorCode,
    this.originalError,
    this.errors,
  });

  /// 是否為進階版限制錯誤
  bool get isPremiumRequired => errorCode == 'PREMIUM_REQUIRED';

  /// 是否為成員數量限制
  bool get isMemberLimitReached => errorCode == 'MEMBER_LIMIT_REACHED';

  /// 是否為帳單數量限制
  bool get isBillLimitReached => errorCode == 'BILL_LIMIT_REACHED';

  /// 是否為任何升級相關限制
  bool get isUpgradeRequired =>
      isPremiumRequired || isMemberLimitReached || isBillLimitReached;

  /// 從 DioException 建立 ApiException
  factory ApiException.fromDioException(DioException error) {
    switch (error.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return ApiException(
          type: ApiExceptionType.timeout,
          message: '連線逾時，請檢查網路狀態',
          originalError: error,
        );

      case DioExceptionType.connectionError:
        return ApiException(
          type: ApiExceptionType.network,
          message: '無法連線至伺服器，請檢查網路連線',
          originalError: error,
        );

      case DioExceptionType.badResponse:
        return _handleBadResponse(error);

      case DioExceptionType.cancel:
        return ApiException(
          type: ApiExceptionType.unknown,
          message: '請求已取消',
          originalError: error,
        );

      default:
        return ApiException(
          type: ApiExceptionType.unknown,
          message: '發生未知錯誤',
          originalError: error,
        );
    }
  }

  /// 處理伺服器回應錯誤
  static ApiException _handleBadResponse(DioException error) {
    final statusCode = error.response?.statusCode;
    final data = error.response?.data;

    // 嘗試從回應中取得錯誤訊息和錯誤碼
    String message = '發生錯誤';
    String? errorCode;
    Map<String, dynamic>? errors;

    if (data is Map<String, dynamic>) {
      message = data['message'] as String? ??
                data['error'] as String? ??
                message;
      errorCode = data['code'] as String?;
      if (data['errors'] is Map) {
        errors = Map<String, dynamic>.from(data['errors']);
      }
    }

    switch (statusCode) {
      case 400:
        return ApiException(
          type: ApiExceptionType.badRequest,
          message: message,
          statusCode: statusCode,
          originalError: error,
          errors: errors,
        );

      case 401:
        return ApiException(
          type: ApiExceptionType.unauthorized,
          message: '登入已過期，請重新登入',
          statusCode: statusCode,
          originalError: error,
        );

      case 403:
        return ApiException(
          type: ApiExceptionType.forbidden,
          message: message.contains('發生錯誤') ? '您沒有權限執行此操作' : message,
          statusCode: statusCode,
          errorCode: errorCode,
          originalError: error,
        );

      case 404:
        return ApiException(
          type: ApiExceptionType.notFound,
          message: message.contains('發生錯誤') ? '找不到請求的資源' : message,
          statusCode: statusCode,
          originalError: error,
        );

      case 409:
        return ApiException(
          type: ApiExceptionType.conflict,
          message: message,
          statusCode: statusCode,
          originalError: error,
        );

      case 422:
        return ApiException(
          type: ApiExceptionType.validation,
          message: message,
          statusCode: statusCode,
          originalError: error,
          errors: errors,
        );

      case 500:
      case 502:
      case 503:
      case 504:
        return ApiException(
          type: ApiExceptionType.server,
          message: '伺服器發生錯誤，請稍後再試',
          statusCode: statusCode,
          originalError: error,
        );

      default:
        return ApiException(
          type: ApiExceptionType.unknown,
          message: message,
          statusCode: statusCode,
          originalError: error,
        );
    }
  }

  @override
  String toString() => message;
}
