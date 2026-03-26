// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'purchase_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

ProductInfo _$ProductInfoFromJson(Map<String, dynamic> json) {
  return _ProductInfo.fromJson(json);
}

/// @nodoc
mixin _$ProductInfo {
  String get productId => throw _privateConstructorUsedError;
  String get productType => throw _privateConstructorUsedError;
  String get displayName => throw _privateConstructorUsedError;
  int? get daysGranted => throw _privateConstructorUsedError;

  /// Serializes this ProductInfo to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of ProductInfo
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ProductInfoCopyWith<ProductInfo> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ProductInfoCopyWith<$Res> {
  factory $ProductInfoCopyWith(
          ProductInfo value, $Res Function(ProductInfo) then) =
      _$ProductInfoCopyWithImpl<$Res, ProductInfo>;
  @useResult
  $Res call(
      {String productId,
      String productType,
      String displayName,
      int? daysGranted});
}

/// @nodoc
class _$ProductInfoCopyWithImpl<$Res, $Val extends ProductInfo>
    implements $ProductInfoCopyWith<$Res> {
  _$ProductInfoCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ProductInfo
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? productId = null,
    Object? productType = null,
    Object? displayName = null,
    Object? daysGranted = freezed,
  }) {
    return _then(_value.copyWith(
      productId: null == productId
          ? _value.productId
          : productId // ignore: cast_nullable_to_non_nullable
              as String,
      productType: null == productType
          ? _value.productType
          : productType // ignore: cast_nullable_to_non_nullable
              as String,
      displayName: null == displayName
          ? _value.displayName
          : displayName // ignore: cast_nullable_to_non_nullable
              as String,
      daysGranted: freezed == daysGranted
          ? _value.daysGranted
          : daysGranted // ignore: cast_nullable_to_non_nullable
              as int?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ProductInfoImplCopyWith<$Res>
    implements $ProductInfoCopyWith<$Res> {
  factory _$$ProductInfoImplCopyWith(
          _$ProductInfoImpl value, $Res Function(_$ProductInfoImpl) then) =
      __$$ProductInfoImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String productId,
      String productType,
      String displayName,
      int? daysGranted});
}

/// @nodoc
class __$$ProductInfoImplCopyWithImpl<$Res>
    extends _$ProductInfoCopyWithImpl<$Res, _$ProductInfoImpl>
    implements _$$ProductInfoImplCopyWith<$Res> {
  __$$ProductInfoImplCopyWithImpl(
      _$ProductInfoImpl _value, $Res Function(_$ProductInfoImpl) _then)
      : super(_value, _then);

  /// Create a copy of ProductInfo
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? productId = null,
    Object? productType = null,
    Object? displayName = null,
    Object? daysGranted = freezed,
  }) {
    return _then(_$ProductInfoImpl(
      productId: null == productId
          ? _value.productId
          : productId // ignore: cast_nullable_to_non_nullable
              as String,
      productType: null == productType
          ? _value.productType
          : productType // ignore: cast_nullable_to_non_nullable
              as String,
      displayName: null == displayName
          ? _value.displayName
          : displayName // ignore: cast_nullable_to_non_nullable
              as String,
      daysGranted: freezed == daysGranted
          ? _value.daysGranted
          : daysGranted // ignore: cast_nullable_to_non_nullable
              as int?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ProductInfoImpl implements _ProductInfo {
  const _$ProductInfoImpl(
      {required this.productId,
      required this.productType,
      required this.displayName,
      this.daysGranted});

  factory _$ProductInfoImpl.fromJson(Map<String, dynamic> json) =>
      _$$ProductInfoImplFromJson(json);

  @override
  final String productId;
  @override
  final String productType;
  @override
  final String displayName;
  @override
  final int? daysGranted;

  @override
  String toString() {
    return 'ProductInfo(productId: $productId, productType: $productType, displayName: $displayName, daysGranted: $daysGranted)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ProductInfoImpl &&
            (identical(other.productId, productId) ||
                other.productId == productId) &&
            (identical(other.productType, productType) ||
                other.productType == productType) &&
            (identical(other.displayName, displayName) ||
                other.displayName == displayName) &&
            (identical(other.daysGranted, daysGranted) ||
                other.daysGranted == daysGranted));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType, productId, productType, displayName, daysGranted);

  /// Create a copy of ProductInfo
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ProductInfoImplCopyWith<_$ProductInfoImpl> get copyWith =>
      __$$ProductInfoImplCopyWithImpl<_$ProductInfoImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ProductInfoImplToJson(
      this,
    );
  }
}

abstract class _ProductInfo implements ProductInfo {
  const factory _ProductInfo(
      {required final String productId,
      required final String productType,
      required final String displayName,
      final int? daysGranted}) = _$ProductInfoImpl;

  factory _ProductInfo.fromJson(Map<String, dynamic> json) =
      _$ProductInfoImpl.fromJson;

  @override
  String get productId;
  @override
  String get productType;
  @override
  String get displayName;
  @override
  int? get daysGranted;

  /// Create a copy of ProductInfo
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ProductInfoImplCopyWith<_$ProductInfoImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

PurchaseRecord _$PurchaseRecordFromJson(Map<String, dynamic> json) {
  return _PurchaseRecord.fromJson(json);
}

/// @nodoc
mixin _$PurchaseRecord {
  String get id => throw _privateConstructorUsedError;
  String get productId => throw _privateConstructorUsedError;
  String get productType => throw _privateConstructorUsedError;
  String? get tripId => throw _privateConstructorUsedError;
  int? get daysGranted => throw _privateConstructorUsedError;
  DateTime get purchasedAt => throw _privateConstructorUsedError;
  DateTime? get expiresAt => throw _privateConstructorUsedError;

  /// Serializes this PurchaseRecord to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of PurchaseRecord
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $PurchaseRecordCopyWith<PurchaseRecord> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $PurchaseRecordCopyWith<$Res> {
  factory $PurchaseRecordCopyWith(
          PurchaseRecord value, $Res Function(PurchaseRecord) then) =
      _$PurchaseRecordCopyWithImpl<$Res, PurchaseRecord>;
  @useResult
  $Res call(
      {String id,
      String productId,
      String productType,
      String? tripId,
      int? daysGranted,
      DateTime purchasedAt,
      DateTime? expiresAt});
}

/// @nodoc
class _$PurchaseRecordCopyWithImpl<$Res, $Val extends PurchaseRecord>
    implements $PurchaseRecordCopyWith<$Res> {
  _$PurchaseRecordCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of PurchaseRecord
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? productId = null,
    Object? productType = null,
    Object? tripId = freezed,
    Object? daysGranted = freezed,
    Object? purchasedAt = null,
    Object? expiresAt = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      productId: null == productId
          ? _value.productId
          : productId // ignore: cast_nullable_to_non_nullable
              as String,
      productType: null == productType
          ? _value.productType
          : productType // ignore: cast_nullable_to_non_nullable
              as String,
      tripId: freezed == tripId
          ? _value.tripId
          : tripId // ignore: cast_nullable_to_non_nullable
              as String?,
      daysGranted: freezed == daysGranted
          ? _value.daysGranted
          : daysGranted // ignore: cast_nullable_to_non_nullable
              as int?,
      purchasedAt: null == purchasedAt
          ? _value.purchasedAt
          : purchasedAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      expiresAt: freezed == expiresAt
          ? _value.expiresAt
          : expiresAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$PurchaseRecordImplCopyWith<$Res>
    implements $PurchaseRecordCopyWith<$Res> {
  factory _$$PurchaseRecordImplCopyWith(_$PurchaseRecordImpl value,
          $Res Function(_$PurchaseRecordImpl) then) =
      __$$PurchaseRecordImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String productId,
      String productType,
      String? tripId,
      int? daysGranted,
      DateTime purchasedAt,
      DateTime? expiresAt});
}

/// @nodoc
class __$$PurchaseRecordImplCopyWithImpl<$Res>
    extends _$PurchaseRecordCopyWithImpl<$Res, _$PurchaseRecordImpl>
    implements _$$PurchaseRecordImplCopyWith<$Res> {
  __$$PurchaseRecordImplCopyWithImpl(
      _$PurchaseRecordImpl _value, $Res Function(_$PurchaseRecordImpl) _then)
      : super(_value, _then);

  /// Create a copy of PurchaseRecord
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? productId = null,
    Object? productType = null,
    Object? tripId = freezed,
    Object? daysGranted = freezed,
    Object? purchasedAt = null,
    Object? expiresAt = freezed,
  }) {
    return _then(_$PurchaseRecordImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      productId: null == productId
          ? _value.productId
          : productId // ignore: cast_nullable_to_non_nullable
              as String,
      productType: null == productType
          ? _value.productType
          : productType // ignore: cast_nullable_to_non_nullable
              as String,
      tripId: freezed == tripId
          ? _value.tripId
          : tripId // ignore: cast_nullable_to_non_nullable
              as String?,
      daysGranted: freezed == daysGranted
          ? _value.daysGranted
          : daysGranted // ignore: cast_nullable_to_non_nullable
              as int?,
      purchasedAt: null == purchasedAt
          ? _value.purchasedAt
          : purchasedAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      expiresAt: freezed == expiresAt
          ? _value.expiresAt
          : expiresAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$PurchaseRecordImpl implements _PurchaseRecord {
  const _$PurchaseRecordImpl(
      {required this.id,
      required this.productId,
      required this.productType,
      this.tripId,
      this.daysGranted,
      required this.purchasedAt,
      this.expiresAt});

  factory _$PurchaseRecordImpl.fromJson(Map<String, dynamic> json) =>
      _$$PurchaseRecordImplFromJson(json);

  @override
  final String id;
  @override
  final String productId;
  @override
  final String productType;
  @override
  final String? tripId;
  @override
  final int? daysGranted;
  @override
  final DateTime purchasedAt;
  @override
  final DateTime? expiresAt;

  @override
  String toString() {
    return 'PurchaseRecord(id: $id, productId: $productId, productType: $productType, tripId: $tripId, daysGranted: $daysGranted, purchasedAt: $purchasedAt, expiresAt: $expiresAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$PurchaseRecordImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.productId, productId) ||
                other.productId == productId) &&
            (identical(other.productType, productType) ||
                other.productType == productType) &&
            (identical(other.tripId, tripId) || other.tripId == tripId) &&
            (identical(other.daysGranted, daysGranted) ||
                other.daysGranted == daysGranted) &&
            (identical(other.purchasedAt, purchasedAt) ||
                other.purchasedAt == purchasedAt) &&
            (identical(other.expiresAt, expiresAt) ||
                other.expiresAt == expiresAt));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, id, productId, productType,
      tripId, daysGranted, purchasedAt, expiresAt);

  /// Create a copy of PurchaseRecord
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$PurchaseRecordImplCopyWith<_$PurchaseRecordImpl> get copyWith =>
      __$$PurchaseRecordImplCopyWithImpl<_$PurchaseRecordImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$PurchaseRecordImplToJson(
      this,
    );
  }
}

abstract class _PurchaseRecord implements PurchaseRecord {
  const factory _PurchaseRecord(
      {required final String id,
      required final String productId,
      required final String productType,
      final String? tripId,
      final int? daysGranted,
      required final DateTime purchasedAt,
      final DateTime? expiresAt}) = _$PurchaseRecordImpl;

  factory _PurchaseRecord.fromJson(Map<String, dynamic> json) =
      _$PurchaseRecordImpl.fromJson;

  @override
  String get id;
  @override
  String get productId;
  @override
  String get productType;
  @override
  String? get tripId;
  @override
  int? get daysGranted;
  @override
  DateTime get purchasedAt;
  @override
  DateTime? get expiresAt;

  /// Create a copy of PurchaseRecord
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$PurchaseRecordImplCopyWith<_$PurchaseRecordImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

TripPremiumStatus _$TripPremiumStatusFromJson(Map<String, dynamic> json) {
  return _TripPremiumStatus.fromJson(json);
}

/// @nodoc
mixin _$TripPremiumStatus {
  bool get isPremium => throw _privateConstructorUsedError;
  DateTime? get expiresAt => throw _privateConstructorUsedError;
  int? get remainingDays => throw _privateConstructorUsedError;

  /// Serializes this TripPremiumStatus to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of TripPremiumStatus
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TripPremiumStatusCopyWith<TripPremiumStatus> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TripPremiumStatusCopyWith<$Res> {
  factory $TripPremiumStatusCopyWith(
          TripPremiumStatus value, $Res Function(TripPremiumStatus) then) =
      _$TripPremiumStatusCopyWithImpl<$Res, TripPremiumStatus>;
  @useResult
  $Res call({bool isPremium, DateTime? expiresAt, int? remainingDays});
}

/// @nodoc
class _$TripPremiumStatusCopyWithImpl<$Res, $Val extends TripPremiumStatus>
    implements $TripPremiumStatusCopyWith<$Res> {
  _$TripPremiumStatusCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TripPremiumStatus
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? isPremium = null,
    Object? expiresAt = freezed,
    Object? remainingDays = freezed,
  }) {
    return _then(_value.copyWith(
      isPremium: null == isPremium
          ? _value.isPremium
          : isPremium // ignore: cast_nullable_to_non_nullable
              as bool,
      expiresAt: freezed == expiresAt
          ? _value.expiresAt
          : expiresAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      remainingDays: freezed == remainingDays
          ? _value.remainingDays
          : remainingDays // ignore: cast_nullable_to_non_nullable
              as int?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TripPremiumStatusImplCopyWith<$Res>
    implements $TripPremiumStatusCopyWith<$Res> {
  factory _$$TripPremiumStatusImplCopyWith(_$TripPremiumStatusImpl value,
          $Res Function(_$TripPremiumStatusImpl) then) =
      __$$TripPremiumStatusImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({bool isPremium, DateTime? expiresAt, int? remainingDays});
}

/// @nodoc
class __$$TripPremiumStatusImplCopyWithImpl<$Res>
    extends _$TripPremiumStatusCopyWithImpl<$Res, _$TripPremiumStatusImpl>
    implements _$$TripPremiumStatusImplCopyWith<$Res> {
  __$$TripPremiumStatusImplCopyWithImpl(_$TripPremiumStatusImpl _value,
      $Res Function(_$TripPremiumStatusImpl) _then)
      : super(_value, _then);

  /// Create a copy of TripPremiumStatus
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? isPremium = null,
    Object? expiresAt = freezed,
    Object? remainingDays = freezed,
  }) {
    return _then(_$TripPremiumStatusImpl(
      isPremium: null == isPremium
          ? _value.isPremium
          : isPremium // ignore: cast_nullable_to_non_nullable
              as bool,
      expiresAt: freezed == expiresAt
          ? _value.expiresAt
          : expiresAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      remainingDays: freezed == remainingDays
          ? _value.remainingDays
          : remainingDays // ignore: cast_nullable_to_non_nullable
              as int?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TripPremiumStatusImpl implements _TripPremiumStatus {
  const _$TripPremiumStatusImpl(
      {required this.isPremium, this.expiresAt, this.remainingDays});

  factory _$TripPremiumStatusImpl.fromJson(Map<String, dynamic> json) =>
      _$$TripPremiumStatusImplFromJson(json);

  @override
  final bool isPremium;
  @override
  final DateTime? expiresAt;
  @override
  final int? remainingDays;

  @override
  String toString() {
    return 'TripPremiumStatus(isPremium: $isPremium, expiresAt: $expiresAt, remainingDays: $remainingDays)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TripPremiumStatusImpl &&
            (identical(other.isPremium, isPremium) ||
                other.isPremium == isPremium) &&
            (identical(other.expiresAt, expiresAt) ||
                other.expiresAt == expiresAt) &&
            (identical(other.remainingDays, remainingDays) ||
                other.remainingDays == remainingDays));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode =>
      Object.hash(runtimeType, isPremium, expiresAt, remainingDays);

  /// Create a copy of TripPremiumStatus
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TripPremiumStatusImplCopyWith<_$TripPremiumStatusImpl> get copyWith =>
      __$$TripPremiumStatusImplCopyWithImpl<_$TripPremiumStatusImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TripPremiumStatusImplToJson(
      this,
    );
  }
}

abstract class _TripPremiumStatus implements TripPremiumStatus {
  const factory _TripPremiumStatus(
      {required final bool isPremium,
      final DateTime? expiresAt,
      final int? remainingDays}) = _$TripPremiumStatusImpl;

  factory _TripPremiumStatus.fromJson(Map<String, dynamic> json) =
      _$TripPremiumStatusImpl.fromJson;

  @override
  bool get isPremium;
  @override
  DateTime? get expiresAt;
  @override
  int? get remainingDays;

  /// Create a copy of TripPremiumStatus
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TripPremiumStatusImplCopyWith<_$TripPremiumStatusImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

AdFreeStatus _$AdFreeStatusFromJson(Map<String, dynamic> json) {
  return _AdFreeStatus.fromJson(json);
}

/// @nodoc
mixin _$AdFreeStatus {
  bool get isAdFree => throw _privateConstructorUsedError;
  DateTime? get purchasedAt => throw _privateConstructorUsedError;

  /// Serializes this AdFreeStatus to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of AdFreeStatus
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $AdFreeStatusCopyWith<AdFreeStatus> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AdFreeStatusCopyWith<$Res> {
  factory $AdFreeStatusCopyWith(
          AdFreeStatus value, $Res Function(AdFreeStatus) then) =
      _$AdFreeStatusCopyWithImpl<$Res, AdFreeStatus>;
  @useResult
  $Res call({bool isAdFree, DateTime? purchasedAt});
}

/// @nodoc
class _$AdFreeStatusCopyWithImpl<$Res, $Val extends AdFreeStatus>
    implements $AdFreeStatusCopyWith<$Res> {
  _$AdFreeStatusCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of AdFreeStatus
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? isAdFree = null,
    Object? purchasedAt = freezed,
  }) {
    return _then(_value.copyWith(
      isAdFree: null == isAdFree
          ? _value.isAdFree
          : isAdFree // ignore: cast_nullable_to_non_nullable
              as bool,
      purchasedAt: freezed == purchasedAt
          ? _value.purchasedAt
          : purchasedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AdFreeStatusImplCopyWith<$Res>
    implements $AdFreeStatusCopyWith<$Res> {
  factory _$$AdFreeStatusImplCopyWith(
          _$AdFreeStatusImpl value, $Res Function(_$AdFreeStatusImpl) then) =
      __$$AdFreeStatusImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({bool isAdFree, DateTime? purchasedAt});
}

/// @nodoc
class __$$AdFreeStatusImplCopyWithImpl<$Res>
    extends _$AdFreeStatusCopyWithImpl<$Res, _$AdFreeStatusImpl>
    implements _$$AdFreeStatusImplCopyWith<$Res> {
  __$$AdFreeStatusImplCopyWithImpl(
      _$AdFreeStatusImpl _value, $Res Function(_$AdFreeStatusImpl) _then)
      : super(_value, _then);

  /// Create a copy of AdFreeStatus
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? isAdFree = null,
    Object? purchasedAt = freezed,
  }) {
    return _then(_$AdFreeStatusImpl(
      isAdFree: null == isAdFree
          ? _value.isAdFree
          : isAdFree // ignore: cast_nullable_to_non_nullable
              as bool,
      purchasedAt: freezed == purchasedAt
          ? _value.purchasedAt
          : purchasedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AdFreeStatusImpl implements _AdFreeStatus {
  const _$AdFreeStatusImpl({required this.isAdFree, this.purchasedAt});

  factory _$AdFreeStatusImpl.fromJson(Map<String, dynamic> json) =>
      _$$AdFreeStatusImplFromJson(json);

  @override
  final bool isAdFree;
  @override
  final DateTime? purchasedAt;

  @override
  String toString() {
    return 'AdFreeStatus(isAdFree: $isAdFree, purchasedAt: $purchasedAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AdFreeStatusImpl &&
            (identical(other.isAdFree, isAdFree) ||
                other.isAdFree == isAdFree) &&
            (identical(other.purchasedAt, purchasedAt) ||
                other.purchasedAt == purchasedAt));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, isAdFree, purchasedAt);

  /// Create a copy of AdFreeStatus
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$AdFreeStatusImplCopyWith<_$AdFreeStatusImpl> get copyWith =>
      __$$AdFreeStatusImplCopyWithImpl<_$AdFreeStatusImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$AdFreeStatusImplToJson(
      this,
    );
  }
}

abstract class _AdFreeStatus implements AdFreeStatus {
  const factory _AdFreeStatus(
      {required final bool isAdFree,
      final DateTime? purchasedAt}) = _$AdFreeStatusImpl;

  factory _AdFreeStatus.fromJson(Map<String, dynamic> json) =
      _$AdFreeStatusImpl.fromJson;

  @override
  bool get isAdFree;
  @override
  DateTime? get purchasedAt;

  /// Create a copy of AdFreeStatus
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$AdFreeStatusImplCopyWith<_$AdFreeStatusImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

RestoreResult _$RestoreResultFromJson(Map<String, dynamic> json) {
  return _RestoreResult.fromJson(json);
}

/// @nodoc
mixin _$RestoreResult {
  bool get hasRestoredPurchases => throw _privateConstructorUsedError;
  bool get adFreeRestored => throw _privateConstructorUsedError;
  int get restoredCount => throw _privateConstructorUsedError;
  List<String> get restoredProducts => throw _privateConstructorUsedError;

  /// Serializes this RestoreResult to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of RestoreResult
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $RestoreResultCopyWith<RestoreResult> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $RestoreResultCopyWith<$Res> {
  factory $RestoreResultCopyWith(
          RestoreResult value, $Res Function(RestoreResult) then) =
      _$RestoreResultCopyWithImpl<$Res, RestoreResult>;
  @useResult
  $Res call(
      {bool hasRestoredPurchases,
      bool adFreeRestored,
      int restoredCount,
      List<String> restoredProducts});
}

/// @nodoc
class _$RestoreResultCopyWithImpl<$Res, $Val extends RestoreResult>
    implements $RestoreResultCopyWith<$Res> {
  _$RestoreResultCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of RestoreResult
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? hasRestoredPurchases = null,
    Object? adFreeRestored = null,
    Object? restoredCount = null,
    Object? restoredProducts = null,
  }) {
    return _then(_value.copyWith(
      hasRestoredPurchases: null == hasRestoredPurchases
          ? _value.hasRestoredPurchases
          : hasRestoredPurchases // ignore: cast_nullable_to_non_nullable
              as bool,
      adFreeRestored: null == adFreeRestored
          ? _value.adFreeRestored
          : adFreeRestored // ignore: cast_nullable_to_non_nullable
              as bool,
      restoredCount: null == restoredCount
          ? _value.restoredCount
          : restoredCount // ignore: cast_nullable_to_non_nullable
              as int,
      restoredProducts: null == restoredProducts
          ? _value.restoredProducts
          : restoredProducts // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$RestoreResultImplCopyWith<$Res>
    implements $RestoreResultCopyWith<$Res> {
  factory _$$RestoreResultImplCopyWith(
          _$RestoreResultImpl value, $Res Function(_$RestoreResultImpl) then) =
      __$$RestoreResultImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {bool hasRestoredPurchases,
      bool adFreeRestored,
      int restoredCount,
      List<String> restoredProducts});
}

/// @nodoc
class __$$RestoreResultImplCopyWithImpl<$Res>
    extends _$RestoreResultCopyWithImpl<$Res, _$RestoreResultImpl>
    implements _$$RestoreResultImplCopyWith<$Res> {
  __$$RestoreResultImplCopyWithImpl(
      _$RestoreResultImpl _value, $Res Function(_$RestoreResultImpl) _then)
      : super(_value, _then);

  /// Create a copy of RestoreResult
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? hasRestoredPurchases = null,
    Object? adFreeRestored = null,
    Object? restoredCount = null,
    Object? restoredProducts = null,
  }) {
    return _then(_$RestoreResultImpl(
      hasRestoredPurchases: null == hasRestoredPurchases
          ? _value.hasRestoredPurchases
          : hasRestoredPurchases // ignore: cast_nullable_to_non_nullable
              as bool,
      adFreeRestored: null == adFreeRestored
          ? _value.adFreeRestored
          : adFreeRestored // ignore: cast_nullable_to_non_nullable
              as bool,
      restoredCount: null == restoredCount
          ? _value.restoredCount
          : restoredCount // ignore: cast_nullable_to_non_nullable
              as int,
      restoredProducts: null == restoredProducts
          ? _value._restoredProducts
          : restoredProducts // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$RestoreResultImpl implements _RestoreResult {
  const _$RestoreResultImpl(
      {required this.hasRestoredPurchases,
      required this.adFreeRestored,
      required this.restoredCount,
      final List<String> restoredProducts = const <String>[]})
      : _restoredProducts = restoredProducts;

  factory _$RestoreResultImpl.fromJson(Map<String, dynamic> json) =>
      _$$RestoreResultImplFromJson(json);

  @override
  final bool hasRestoredPurchases;
  @override
  final bool adFreeRestored;
  @override
  final int restoredCount;
  final List<String> _restoredProducts;
  @override
  @JsonKey()
  List<String> get restoredProducts {
    if (_restoredProducts is EqualUnmodifiableListView)
      return _restoredProducts;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_restoredProducts);
  }

  @override
  String toString() {
    return 'RestoreResult(hasRestoredPurchases: $hasRestoredPurchases, adFreeRestored: $adFreeRestored, restoredCount: $restoredCount, restoredProducts: $restoredProducts)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$RestoreResultImpl &&
            (identical(other.hasRestoredPurchases, hasRestoredPurchases) ||
                other.hasRestoredPurchases == hasRestoredPurchases) &&
            (identical(other.adFreeRestored, adFreeRestored) ||
                other.adFreeRestored == adFreeRestored) &&
            (identical(other.restoredCount, restoredCount) ||
                other.restoredCount == restoredCount) &&
            const DeepCollectionEquality()
                .equals(other._restoredProducts, _restoredProducts));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      hasRestoredPurchases,
      adFreeRestored,
      restoredCount,
      const DeepCollectionEquality().hash(_restoredProducts));

  /// Create a copy of RestoreResult
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$RestoreResultImplCopyWith<_$RestoreResultImpl> get copyWith =>
      __$$RestoreResultImplCopyWithImpl<_$RestoreResultImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$RestoreResultImplToJson(
      this,
    );
  }
}

abstract class _RestoreResult implements RestoreResult {
  const factory _RestoreResult(
      {required final bool hasRestoredPurchases,
      required final bool adFreeRestored,
      required final int restoredCount,
      final List<String> restoredProducts}) = _$RestoreResultImpl;

  factory _RestoreResult.fromJson(Map<String, dynamic> json) =
      _$RestoreResultImpl.fromJson;

  @override
  bool get hasRestoredPurchases;
  @override
  bool get adFreeRestored;
  @override
  int get restoredCount;
  @override
  List<String> get restoredProducts;

  /// Create a copy of RestoreResult
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$RestoreResultImplCopyWith<_$RestoreResultImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

VerifyPurchaseRequest _$VerifyPurchaseRequestFromJson(
    Map<String, dynamic> json) {
  return _VerifyPurchaseRequest.fromJson(json);
}

/// @nodoc
mixin _$VerifyPurchaseRequest {
  String get platform => throw _privateConstructorUsedError;
  String get productId => throw _privateConstructorUsedError;
  String get receiptData => throw _privateConstructorUsedError;
  String get transactionId => throw _privateConstructorUsedError;
  String? get tripId => throw _privateConstructorUsedError;

  /// Serializes this VerifyPurchaseRequest to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of VerifyPurchaseRequest
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $VerifyPurchaseRequestCopyWith<VerifyPurchaseRequest> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $VerifyPurchaseRequestCopyWith<$Res> {
  factory $VerifyPurchaseRequestCopyWith(VerifyPurchaseRequest value,
          $Res Function(VerifyPurchaseRequest) then) =
      _$VerifyPurchaseRequestCopyWithImpl<$Res, VerifyPurchaseRequest>;
  @useResult
  $Res call(
      {String platform,
      String productId,
      String receiptData,
      String transactionId,
      String? tripId});
}

/// @nodoc
class _$VerifyPurchaseRequestCopyWithImpl<$Res,
        $Val extends VerifyPurchaseRequest>
    implements $VerifyPurchaseRequestCopyWith<$Res> {
  _$VerifyPurchaseRequestCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of VerifyPurchaseRequest
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? platform = null,
    Object? productId = null,
    Object? receiptData = null,
    Object? transactionId = null,
    Object? tripId = freezed,
  }) {
    return _then(_value.copyWith(
      platform: null == platform
          ? _value.platform
          : platform // ignore: cast_nullable_to_non_nullable
              as String,
      productId: null == productId
          ? _value.productId
          : productId // ignore: cast_nullable_to_non_nullable
              as String,
      receiptData: null == receiptData
          ? _value.receiptData
          : receiptData // ignore: cast_nullable_to_non_nullable
              as String,
      transactionId: null == transactionId
          ? _value.transactionId
          : transactionId // ignore: cast_nullable_to_non_nullable
              as String,
      tripId: freezed == tripId
          ? _value.tripId
          : tripId // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$VerifyPurchaseRequestImplCopyWith<$Res>
    implements $VerifyPurchaseRequestCopyWith<$Res> {
  factory _$$VerifyPurchaseRequestImplCopyWith(
          _$VerifyPurchaseRequestImpl value,
          $Res Function(_$VerifyPurchaseRequestImpl) then) =
      __$$VerifyPurchaseRequestImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String platform,
      String productId,
      String receiptData,
      String transactionId,
      String? tripId});
}

/// @nodoc
class __$$VerifyPurchaseRequestImplCopyWithImpl<$Res>
    extends _$VerifyPurchaseRequestCopyWithImpl<$Res,
        _$VerifyPurchaseRequestImpl>
    implements _$$VerifyPurchaseRequestImplCopyWith<$Res> {
  __$$VerifyPurchaseRequestImplCopyWithImpl(_$VerifyPurchaseRequestImpl _value,
      $Res Function(_$VerifyPurchaseRequestImpl) _then)
      : super(_value, _then);

  /// Create a copy of VerifyPurchaseRequest
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? platform = null,
    Object? productId = null,
    Object? receiptData = null,
    Object? transactionId = null,
    Object? tripId = freezed,
  }) {
    return _then(_$VerifyPurchaseRequestImpl(
      platform: null == platform
          ? _value.platform
          : platform // ignore: cast_nullable_to_non_nullable
              as String,
      productId: null == productId
          ? _value.productId
          : productId // ignore: cast_nullable_to_non_nullable
              as String,
      receiptData: null == receiptData
          ? _value.receiptData
          : receiptData // ignore: cast_nullable_to_non_nullable
              as String,
      transactionId: null == transactionId
          ? _value.transactionId
          : transactionId // ignore: cast_nullable_to_non_nullable
              as String,
      tripId: freezed == tripId
          ? _value.tripId
          : tripId // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$VerifyPurchaseRequestImpl implements _VerifyPurchaseRequest {
  const _$VerifyPurchaseRequestImpl(
      {required this.platform,
      required this.productId,
      required this.receiptData,
      required this.transactionId,
      this.tripId});

  factory _$VerifyPurchaseRequestImpl.fromJson(Map<String, dynamic> json) =>
      _$$VerifyPurchaseRequestImplFromJson(json);

  @override
  final String platform;
  @override
  final String productId;
  @override
  final String receiptData;
  @override
  final String transactionId;
  @override
  final String? tripId;

  @override
  String toString() {
    return 'VerifyPurchaseRequest(platform: $platform, productId: $productId, receiptData: $receiptData, transactionId: $transactionId, tripId: $tripId)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$VerifyPurchaseRequestImpl &&
            (identical(other.platform, platform) ||
                other.platform == platform) &&
            (identical(other.productId, productId) ||
                other.productId == productId) &&
            (identical(other.receiptData, receiptData) ||
                other.receiptData == receiptData) &&
            (identical(other.transactionId, transactionId) ||
                other.transactionId == transactionId) &&
            (identical(other.tripId, tripId) || other.tripId == tripId));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType, platform, productId, receiptData, transactionId, tripId);

  /// Create a copy of VerifyPurchaseRequest
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$VerifyPurchaseRequestImplCopyWith<_$VerifyPurchaseRequestImpl>
      get copyWith => __$$VerifyPurchaseRequestImplCopyWithImpl<
          _$VerifyPurchaseRequestImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$VerifyPurchaseRequestImplToJson(
      this,
    );
  }
}

abstract class _VerifyPurchaseRequest implements VerifyPurchaseRequest {
  const factory _VerifyPurchaseRequest(
      {required final String platform,
      required final String productId,
      required final String receiptData,
      required final String transactionId,
      final String? tripId}) = _$VerifyPurchaseRequestImpl;

  factory _VerifyPurchaseRequest.fromJson(Map<String, dynamic> json) =
      _$VerifyPurchaseRequestImpl.fromJson;

  @override
  String get platform;
  @override
  String get productId;
  @override
  String get receiptData;
  @override
  String get transactionId;
  @override
  String? get tripId;

  /// Create a copy of VerifyPurchaseRequest
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$VerifyPurchaseRequestImplCopyWith<_$VerifyPurchaseRequestImpl>
      get copyWith => throw _privateConstructorUsedError;
}
