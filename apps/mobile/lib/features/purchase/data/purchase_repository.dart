import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../domain/models/purchase_models.dart';

final purchaseRepositoryProvider = Provider<PurchaseRepository>((ref) {
  return PurchaseRepository(ref.read(apiClientProvider));
});

class PurchaseRepository {
  final ApiClient _apiClient;

  PurchaseRepository(this._apiClient);

  /// 取得產品清單
  Future<List<ProductInfo>> getProducts() async {
    try {
      final response = await _apiClient.get('/purchase/products');
      final data = response.data;
      if (data is! List) {
        throw ApiException(
          type: ApiExceptionType.unknown,
          message: '伺服器回應格式錯誤',
        );
      }
      return data.map((json) => ProductInfo.fromJson(json)).toList();
    } on ApiException {
      rethrow;
    } catch (e, stack) {
      debugPrint('Purchase getProducts 錯誤: $e\n$stack');
      throw ApiException(
        type: ApiExceptionType.unknown,
        message: '取得產品清單時發生錯誤',
        originalError: e,
      );
    }
  }

  /// 驗證購買
  Future<PurchaseRecord> verifyPurchase({
    required String platform,
    required String productId,
    required String receiptData,
    required String transactionId,
    String? tripId,
  }) async {
    try {
      final response = await _apiClient.post(
        '/purchase/verify',
        data: {
          'platform': platform,
          'productId': productId,
          'receiptData': receiptData,
          'transactionId': transactionId,
          if (tripId != null) 'tripId': tripId,
        },
      );
      return PurchaseRecord.fromJson(response.data);
    } on ApiException {
      rethrow;
    } catch (e, stack) {
      debugPrint('Purchase verifyPurchase 錯誤: $e\n$stack');
      throw ApiException(
        type: ApiExceptionType.unknown,
        message: '驗證購買時發生錯誤',
        originalError: e,
      );
    }
  }

  /// 取得購買歷史
  Future<List<PurchaseRecord>> getPurchaseHistory() async {
    try {
      final response = await _apiClient.get('/purchase/history');
      final data = response.data;
      if (data is! List) {
        throw ApiException(
          type: ApiExceptionType.unknown,
          message: '伺服器回應格式錯誤',
        );
      }
      return data.map((json) => PurchaseRecord.fromJson(json)).toList();
    } on ApiException {
      rethrow;
    } catch (e, stack) {
      debugPrint('Purchase getPurchaseHistory 錯誤: $e\n$stack');
      throw ApiException(
        type: ApiExceptionType.unknown,
        message: '取得購買歷史時發生錯誤',
        originalError: e,
      );
    }
  }

  /// 恢復購買
  Future<RestoreResult> restorePurchases({
    required String platform,
    required List<String> receiptDataList,
  }) async {
    try {
      final response = await _apiClient.post(
        '/purchase/restore',
        data: {
          'platform': platform,
          'receiptDataList': receiptDataList,
        },
      );
      return RestoreResult.fromJson(response.data);
    } on ApiException {
      rethrow;
    } catch (e, stack) {
      debugPrint('Purchase restorePurchases 錯誤: $e\n$stack');
      throw ApiException(
        type: ApiExceptionType.unknown,
        message: '恢復購買時發生錯誤',
        originalError: e,
      );
    }
  }

  /// 取得旅程進階狀態
  Future<TripPremiumStatus> getTripPremiumStatus(String tripId) async {
    try {
      final response = await _apiClient.get('/purchase/trip/$tripId/status');
      return TripPremiumStatus.fromJson(response.data);
    } on ApiException {
      rethrow;
    } catch (e, stack) {
      debugPrint('Purchase getTripPremiumStatus 錯誤: $e\n$stack');
      throw ApiException(
        type: ApiExceptionType.unknown,
        message: '取得旅程進階狀態時發生錯誤',
        originalError: e,
      );
    }
  }

  /// 取得去廣告狀態
  Future<AdFreeStatus> getAdFreeStatus() async {
    try {
      final response = await _apiClient.get('/purchase/ad-free-status');
      return AdFreeStatus.fromJson(response.data);
    } on ApiException {
      rethrow;
    } catch (e, stack) {
      debugPrint('Purchase getAdFreeStatus 錯誤: $e\n$stack');
      throw ApiException(
        type: ApiExceptionType.unknown,
        message: '取得去廣告狀態時發生錯誤',
        originalError: e,
      );
    }
  }
}
