// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'purchase_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$ProductInfoImpl _$$ProductInfoImplFromJson(Map<String, dynamic> json) =>
    _$ProductInfoImpl(
      productId: json['productId'] as String,
      productType: json['productType'] as String,
      displayName: json['displayName'] as String,
      daysGranted: (json['daysGranted'] as num?)?.toInt(),
    );

Map<String, dynamic> _$$ProductInfoImplToJson(_$ProductInfoImpl instance) =>
    <String, dynamic>{
      'productId': instance.productId,
      'productType': instance.productType,
      'displayName': instance.displayName,
      'daysGranted': instance.daysGranted,
    };

_$PurchaseRecordImpl _$$PurchaseRecordImplFromJson(Map<String, dynamic> json) =>
    _$PurchaseRecordImpl(
      id: json['id'] as String,
      productId: json['productId'] as String,
      productType: json['productType'] as String,
      tripId: json['tripId'] as String?,
      daysGranted: (json['daysGranted'] as num?)?.toInt(),
      purchasedAt: DateTime.parse(json['purchasedAt'] as String),
      expiresAt: json['expiresAt'] == null
          ? null
          : DateTime.parse(json['expiresAt'] as String),
    );

Map<String, dynamic> _$$PurchaseRecordImplToJson(
        _$PurchaseRecordImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'productId': instance.productId,
      'productType': instance.productType,
      'tripId': instance.tripId,
      'daysGranted': instance.daysGranted,
      'purchasedAt': instance.purchasedAt.toIso8601String(),
      'expiresAt': instance.expiresAt?.toIso8601String(),
    };

_$TripPremiumStatusImpl _$$TripPremiumStatusImplFromJson(
        Map<String, dynamic> json) =>
    _$TripPremiumStatusImpl(
      isPremium: json['isPremium'] as bool,
      expiresAt: json['expiresAt'] == null
          ? null
          : DateTime.parse(json['expiresAt'] as String),
      remainingDays: (json['remainingDays'] as num?)?.toInt(),
    );

Map<String, dynamic> _$$TripPremiumStatusImplToJson(
        _$TripPremiumStatusImpl instance) =>
    <String, dynamic>{
      'isPremium': instance.isPremium,
      'expiresAt': instance.expiresAt?.toIso8601String(),
      'remainingDays': instance.remainingDays,
    };

_$AdFreeStatusImpl _$$AdFreeStatusImplFromJson(Map<String, dynamic> json) =>
    _$AdFreeStatusImpl(
      isAdFree: json['isAdFree'] as bool,
      purchasedAt: json['purchasedAt'] == null
          ? null
          : DateTime.parse(json['purchasedAt'] as String),
    );

Map<String, dynamic> _$$AdFreeStatusImplToJson(_$AdFreeStatusImpl instance) =>
    <String, dynamic>{
      'isAdFree': instance.isAdFree,
      'purchasedAt': instance.purchasedAt?.toIso8601String(),
    };

_$RestoreResultImpl _$$RestoreResultImplFromJson(Map<String, dynamic> json) =>
    _$RestoreResultImpl(
      hasRestoredPurchases: json['hasRestoredPurchases'] as bool,
      adFreeRestored: json['adFreeRestored'] as bool,
      restoredCount: (json['restoredCount'] as num).toInt(),
      restoredProducts: (json['restoredProducts'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const <String>[],
    );

Map<String, dynamic> _$$RestoreResultImplToJson(_$RestoreResultImpl instance) =>
    <String, dynamic>{
      'hasRestoredPurchases': instance.hasRestoredPurchases,
      'adFreeRestored': instance.adFreeRestored,
      'restoredCount': instance.restoredCount,
      'restoredProducts': instance.restoredProducts,
    };

_$VerifyPurchaseRequestImpl _$$VerifyPurchaseRequestImplFromJson(
        Map<String, dynamic> json) =>
    _$VerifyPurchaseRequestImpl(
      platform: json['platform'] as String,
      productId: json['productId'] as String,
      receiptData: json['receiptData'] as String,
      transactionId: json['transactionId'] as String,
      tripId: json['tripId'] as String?,
    );

Map<String, dynamic> _$$VerifyPurchaseRequestImplToJson(
        _$VerifyPurchaseRequestImpl instance) =>
    <String, dynamic>{
      'platform': instance.platform,
      'productId': instance.productId,
      'receiptData': instance.receiptData,
      'transactionId': instance.transactionId,
      'tripId': instance.tripId,
    };
