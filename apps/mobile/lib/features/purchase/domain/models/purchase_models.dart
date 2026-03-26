import 'package:freezed_annotation/freezed_annotation.dart';

part 'purchase_models.freezed.dart';
part 'purchase_models.g.dart';

/// 產品定義
@freezed
class ProductInfo with _$ProductInfo {
  const factory ProductInfo({
    required String productId,
    required String productType,
    required String displayName,
    int? daysGranted,
  }) = _ProductInfo;

  factory ProductInfo.fromJson(Map<String, dynamic> json) =>
      _$ProductInfoFromJson(json);
}

/// 購買記錄
@freezed
class PurchaseRecord with _$PurchaseRecord {
  const factory PurchaseRecord({
    required String id,
    required String productId,
    required String productType,
    String? tripId,
    int? daysGranted,
    required DateTime purchasedAt,
    DateTime? expiresAt,
  }) = _PurchaseRecord;

  factory PurchaseRecord.fromJson(Map<String, dynamic> json) =>
      _$PurchaseRecordFromJson(json);
}

/// 旅程進階狀態
@freezed
class TripPremiumStatus with _$TripPremiumStatus {
  const factory TripPremiumStatus({
    required bool isPremium,
    DateTime? expiresAt,
    int? remainingDays,
  }) = _TripPremiumStatus;

  factory TripPremiumStatus.fromJson(Map<String, dynamic> json) =>
      _$TripPremiumStatusFromJson(json);
}

/// 去廣告狀態
@freezed
class AdFreeStatus with _$AdFreeStatus {
  const factory AdFreeStatus({
    required bool isAdFree,
    DateTime? purchasedAt,
  }) = _AdFreeStatus;

  factory AdFreeStatus.fromJson(Map<String, dynamic> json) =>
      _$AdFreeStatusFromJson(json);
}

/// 恢復購買結果
@freezed
class RestoreResult with _$RestoreResult {
  const factory RestoreResult({
    required bool hasRestoredPurchases,
    required bool adFreeRestored,
    required int restoredCount,
    @Default(<String>[]) List<String> restoredProducts,
  }) = _RestoreResult;

  factory RestoreResult.fromJson(Map<String, dynamic> json) =>
      _$RestoreResultFromJson(json);
}

/// 驗證購買請求
@freezed
class VerifyPurchaseRequest with _$VerifyPurchaseRequest {
  const factory VerifyPurchaseRequest({
    required String platform,
    required String productId,
    required String receiptData,
    required String transactionId,
    String? tripId,
  }) = _VerifyPurchaseRequest;

  factory VerifyPurchaseRequest.fromJson(Map<String, dynamic> json) =>
      _$VerifyPurchaseRequestFromJson(json);
}
