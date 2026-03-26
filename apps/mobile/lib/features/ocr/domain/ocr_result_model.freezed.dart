// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'ocr_result_model.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

OcrResult _$OcrResultFromJson(Map<String, dynamic> json) {
  return _OcrResult.fromJson(json);
}

/// @nodoc
mixin _$OcrResult {
  /// 公司名稱
  String? get companyName => throw _privateConstructorUsedError;

  /// 品牌名稱
  String? get brandName => throw _privateConstructorUsedError;

  /// 統一編號
  String? get taxId => throw _privateConstructorUsedError;

  /// 電子發票號碼
  String? get invoiceNumber => throw _privateConstructorUsedError;

  /// 金額
  int? get amount => throw _privateConstructorUsedError;

  /// 日期
  DateTime? get date => throw _privateConstructorUsedError;

  /// 建議分類
  String? get suggestedCategory => throw _privateConstructorUsedError;

  /// 信心度 (0-1)
  double get confidence => throw _privateConstructorUsedError;

  /// 原始文字
  String get rawText => throw _privateConstructorUsedError;

  /// 品牌來源
  BrandSource? get brandSource => throw _privateConstructorUsedError;

  /// 品項明細
  LineItemParseResult? get lineItems => throw _privateConstructorUsedError;

  /// 偵測到的語言（ja, ko, th, en 等）
  String? get detectedLanguage => throw _privateConstructorUsedError;

  /// 幣別推斷結果
  CurrencyDetectionResult? get currencyResult =>
      throw _privateConstructorUsedError;

  /// Serializes this OcrResult to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of OcrResult
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $OcrResultCopyWith<OcrResult> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $OcrResultCopyWith<$Res> {
  factory $OcrResultCopyWith(OcrResult value, $Res Function(OcrResult) then) =
      _$OcrResultCopyWithImpl<$Res, OcrResult>;
  @useResult
  $Res call(
      {String? companyName,
      String? brandName,
      String? taxId,
      String? invoiceNumber,
      int? amount,
      DateTime? date,
      String? suggestedCategory,
      double confidence,
      String rawText,
      BrandSource? brandSource,
      LineItemParseResult? lineItems,
      String? detectedLanguage,
      CurrencyDetectionResult? currencyResult});

  $LineItemParseResultCopyWith<$Res>? get lineItems;
  $CurrencyDetectionResultCopyWith<$Res>? get currencyResult;
}

/// @nodoc
class _$OcrResultCopyWithImpl<$Res, $Val extends OcrResult>
    implements $OcrResultCopyWith<$Res> {
  _$OcrResultCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of OcrResult
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? companyName = freezed,
    Object? brandName = freezed,
    Object? taxId = freezed,
    Object? invoiceNumber = freezed,
    Object? amount = freezed,
    Object? date = freezed,
    Object? suggestedCategory = freezed,
    Object? confidence = null,
    Object? rawText = null,
    Object? brandSource = freezed,
    Object? lineItems = freezed,
    Object? detectedLanguage = freezed,
    Object? currencyResult = freezed,
  }) {
    return _then(_value.copyWith(
      companyName: freezed == companyName
          ? _value.companyName
          : companyName // ignore: cast_nullable_to_non_nullable
              as String?,
      brandName: freezed == brandName
          ? _value.brandName
          : brandName // ignore: cast_nullable_to_non_nullable
              as String?,
      taxId: freezed == taxId
          ? _value.taxId
          : taxId // ignore: cast_nullable_to_non_nullable
              as String?,
      invoiceNumber: freezed == invoiceNumber
          ? _value.invoiceNumber
          : invoiceNumber // ignore: cast_nullable_to_non_nullable
              as String?,
      amount: freezed == amount
          ? _value.amount
          : amount // ignore: cast_nullable_to_non_nullable
              as int?,
      date: freezed == date
          ? _value.date
          : date // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      suggestedCategory: freezed == suggestedCategory
          ? _value.suggestedCategory
          : suggestedCategory // ignore: cast_nullable_to_non_nullable
              as String?,
      confidence: null == confidence
          ? _value.confidence
          : confidence // ignore: cast_nullable_to_non_nullable
              as double,
      rawText: null == rawText
          ? _value.rawText
          : rawText // ignore: cast_nullable_to_non_nullable
              as String,
      brandSource: freezed == brandSource
          ? _value.brandSource
          : brandSource // ignore: cast_nullable_to_non_nullable
              as BrandSource?,
      lineItems: freezed == lineItems
          ? _value.lineItems
          : lineItems // ignore: cast_nullable_to_non_nullable
              as LineItemParseResult?,
      detectedLanguage: freezed == detectedLanguage
          ? _value.detectedLanguage
          : detectedLanguage // ignore: cast_nullable_to_non_nullable
              as String?,
      currencyResult: freezed == currencyResult
          ? _value.currencyResult
          : currencyResult // ignore: cast_nullable_to_non_nullable
              as CurrencyDetectionResult?,
    ) as $Val);
  }

  /// Create a copy of OcrResult
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $LineItemParseResultCopyWith<$Res>? get lineItems {
    if (_value.lineItems == null) {
      return null;
    }

    return $LineItemParseResultCopyWith<$Res>(_value.lineItems!, (value) {
      return _then(_value.copyWith(lineItems: value) as $Val);
    });
  }

  /// Create a copy of OcrResult
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $CurrencyDetectionResultCopyWith<$Res>? get currencyResult {
    if (_value.currencyResult == null) {
      return null;
    }

    return $CurrencyDetectionResultCopyWith<$Res>(_value.currencyResult!,
        (value) {
      return _then(_value.copyWith(currencyResult: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$OcrResultImplCopyWith<$Res>
    implements $OcrResultCopyWith<$Res> {
  factory _$$OcrResultImplCopyWith(
          _$OcrResultImpl value, $Res Function(_$OcrResultImpl) then) =
      __$$OcrResultImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String? companyName,
      String? brandName,
      String? taxId,
      String? invoiceNumber,
      int? amount,
      DateTime? date,
      String? suggestedCategory,
      double confidence,
      String rawText,
      BrandSource? brandSource,
      LineItemParseResult? lineItems,
      String? detectedLanguage,
      CurrencyDetectionResult? currencyResult});

  @override
  $LineItemParseResultCopyWith<$Res>? get lineItems;
  @override
  $CurrencyDetectionResultCopyWith<$Res>? get currencyResult;
}

/// @nodoc
class __$$OcrResultImplCopyWithImpl<$Res>
    extends _$OcrResultCopyWithImpl<$Res, _$OcrResultImpl>
    implements _$$OcrResultImplCopyWith<$Res> {
  __$$OcrResultImplCopyWithImpl(
      _$OcrResultImpl _value, $Res Function(_$OcrResultImpl) _then)
      : super(_value, _then);

  /// Create a copy of OcrResult
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? companyName = freezed,
    Object? brandName = freezed,
    Object? taxId = freezed,
    Object? invoiceNumber = freezed,
    Object? amount = freezed,
    Object? date = freezed,
    Object? suggestedCategory = freezed,
    Object? confidence = null,
    Object? rawText = null,
    Object? brandSource = freezed,
    Object? lineItems = freezed,
    Object? detectedLanguage = freezed,
    Object? currencyResult = freezed,
  }) {
    return _then(_$OcrResultImpl(
      companyName: freezed == companyName
          ? _value.companyName
          : companyName // ignore: cast_nullable_to_non_nullable
              as String?,
      brandName: freezed == brandName
          ? _value.brandName
          : brandName // ignore: cast_nullable_to_non_nullable
              as String?,
      taxId: freezed == taxId
          ? _value.taxId
          : taxId // ignore: cast_nullable_to_non_nullable
              as String?,
      invoiceNumber: freezed == invoiceNumber
          ? _value.invoiceNumber
          : invoiceNumber // ignore: cast_nullable_to_non_nullable
              as String?,
      amount: freezed == amount
          ? _value.amount
          : amount // ignore: cast_nullable_to_non_nullable
              as int?,
      date: freezed == date
          ? _value.date
          : date // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      suggestedCategory: freezed == suggestedCategory
          ? _value.suggestedCategory
          : suggestedCategory // ignore: cast_nullable_to_non_nullable
              as String?,
      confidence: null == confidence
          ? _value.confidence
          : confidence // ignore: cast_nullable_to_non_nullable
              as double,
      rawText: null == rawText
          ? _value.rawText
          : rawText // ignore: cast_nullable_to_non_nullable
              as String,
      brandSource: freezed == brandSource
          ? _value.brandSource
          : brandSource // ignore: cast_nullable_to_non_nullable
              as BrandSource?,
      lineItems: freezed == lineItems
          ? _value.lineItems
          : lineItems // ignore: cast_nullable_to_non_nullable
              as LineItemParseResult?,
      detectedLanguage: freezed == detectedLanguage
          ? _value.detectedLanguage
          : detectedLanguage // ignore: cast_nullable_to_non_nullable
              as String?,
      currencyResult: freezed == currencyResult
          ? _value.currencyResult
          : currencyResult // ignore: cast_nullable_to_non_nullable
              as CurrencyDetectionResult?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$OcrResultImpl implements _OcrResult {
  const _$OcrResultImpl(
      {this.companyName,
      this.brandName,
      this.taxId,
      this.invoiceNumber,
      this.amount,
      this.date,
      this.suggestedCategory,
      this.confidence = 0,
      this.rawText = '',
      this.brandSource,
      this.lineItems,
      this.detectedLanguage,
      this.currencyResult});

  factory _$OcrResultImpl.fromJson(Map<String, dynamic> json) =>
      _$$OcrResultImplFromJson(json);

  /// 公司名稱
  @override
  final String? companyName;

  /// 品牌名稱
  @override
  final String? brandName;

  /// 統一編號
  @override
  final String? taxId;

  /// 電子發票號碼
  @override
  final String? invoiceNumber;

  /// 金額
  @override
  final int? amount;

  /// 日期
  @override
  final DateTime? date;

  /// 建議分類
  @override
  final String? suggestedCategory;

  /// 信心度 (0-1)
  @override
  @JsonKey()
  final double confidence;

  /// 原始文字
  @override
  @JsonKey()
  final String rawText;

  /// 品牌來源
  @override
  final BrandSource? brandSource;

  /// 品項明細
  @override
  final LineItemParseResult? lineItems;

  /// 偵測到的語言（ja, ko, th, en 等）
  @override
  final String? detectedLanguage;

  /// 幣別推斷結果
  @override
  final CurrencyDetectionResult? currencyResult;

  @override
  String toString() {
    return 'OcrResult(companyName: $companyName, brandName: $brandName, taxId: $taxId, invoiceNumber: $invoiceNumber, amount: $amount, date: $date, suggestedCategory: $suggestedCategory, confidence: $confidence, rawText: $rawText, brandSource: $brandSource, lineItems: $lineItems, detectedLanguage: $detectedLanguage, currencyResult: $currencyResult)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$OcrResultImpl &&
            (identical(other.companyName, companyName) ||
                other.companyName == companyName) &&
            (identical(other.brandName, brandName) ||
                other.brandName == brandName) &&
            (identical(other.taxId, taxId) || other.taxId == taxId) &&
            (identical(other.invoiceNumber, invoiceNumber) ||
                other.invoiceNumber == invoiceNumber) &&
            (identical(other.amount, amount) || other.amount == amount) &&
            (identical(other.date, date) || other.date == date) &&
            (identical(other.suggestedCategory, suggestedCategory) ||
                other.suggestedCategory == suggestedCategory) &&
            (identical(other.confidence, confidence) ||
                other.confidence == confidence) &&
            (identical(other.rawText, rawText) || other.rawText == rawText) &&
            (identical(other.brandSource, brandSource) ||
                other.brandSource == brandSource) &&
            (identical(other.lineItems, lineItems) ||
                other.lineItems == lineItems) &&
            (identical(other.detectedLanguage, detectedLanguage) ||
                other.detectedLanguage == detectedLanguage) &&
            (identical(other.currencyResult, currencyResult) ||
                other.currencyResult == currencyResult));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      companyName,
      brandName,
      taxId,
      invoiceNumber,
      amount,
      date,
      suggestedCategory,
      confidence,
      rawText,
      brandSource,
      lineItems,
      detectedLanguage,
      currencyResult);

  /// Create a copy of OcrResult
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$OcrResultImplCopyWith<_$OcrResultImpl> get copyWith =>
      __$$OcrResultImplCopyWithImpl<_$OcrResultImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$OcrResultImplToJson(
      this,
    );
  }
}

abstract class _OcrResult implements OcrResult {
  const factory _OcrResult(
      {final String? companyName,
      final String? brandName,
      final String? taxId,
      final String? invoiceNumber,
      final int? amount,
      final DateTime? date,
      final String? suggestedCategory,
      final double confidence,
      final String rawText,
      final BrandSource? brandSource,
      final LineItemParseResult? lineItems,
      final String? detectedLanguage,
      final CurrencyDetectionResult? currencyResult}) = _$OcrResultImpl;

  factory _OcrResult.fromJson(Map<String, dynamic> json) =
      _$OcrResultImpl.fromJson;

  /// 公司名稱
  @override
  String? get companyName;

  /// 品牌名稱
  @override
  String? get brandName;

  /// 統一編號
  @override
  String? get taxId;

  /// 電子發票號碼
  @override
  String? get invoiceNumber;

  /// 金額
  @override
  int? get amount;

  /// 日期
  @override
  DateTime? get date;

  /// 建議分類
  @override
  String? get suggestedCategory;

  /// 信心度 (0-1)
  @override
  double get confidence;

  /// 原始文字
  @override
  String get rawText;

  /// 品牌來源
  @override
  BrandSource? get brandSource;

  /// 品項明細
  @override
  LineItemParseResult? get lineItems;

  /// 偵測到的語言（ja, ko, th, en 等）
  @override
  String? get detectedLanguage;

  /// 幣別推斷結果
  @override
  CurrencyDetectionResult? get currencyResult;

  /// Create a copy of OcrResult
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$OcrResultImplCopyWith<_$OcrResultImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

ReceiptLineItem _$ReceiptLineItemFromJson(Map<String, dynamic> json) {
  return _ReceiptLineItem.fromJson(json);
}

/// @nodoc
mixin _$ReceiptLineItem {
  /// 品項名稱
  String get name => throw _privateConstructorUsedError;

  /// 單價
  int? get unitPrice => throw _privateConstructorUsedError;

  /// 數量
  int get quantity => throw _privateConstructorUsedError;

  /// 小計金額
  int get subtotal => throw _privateConstructorUsedError;

  /// 是否為折扣項目
  bool get isDiscount => throw _privateConstructorUsedError;

  /// Serializes this ReceiptLineItem to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of ReceiptLineItem
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ReceiptLineItemCopyWith<ReceiptLineItem> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ReceiptLineItemCopyWith<$Res> {
  factory $ReceiptLineItemCopyWith(
          ReceiptLineItem value, $Res Function(ReceiptLineItem) then) =
      _$ReceiptLineItemCopyWithImpl<$Res, ReceiptLineItem>;
  @useResult
  $Res call(
      {String name,
      int? unitPrice,
      int quantity,
      int subtotal,
      bool isDiscount});
}

/// @nodoc
class _$ReceiptLineItemCopyWithImpl<$Res, $Val extends ReceiptLineItem>
    implements $ReceiptLineItemCopyWith<$Res> {
  _$ReceiptLineItemCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ReceiptLineItem
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? name = null,
    Object? unitPrice = freezed,
    Object? quantity = null,
    Object? subtotal = null,
    Object? isDiscount = null,
  }) {
    return _then(_value.copyWith(
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      unitPrice: freezed == unitPrice
          ? _value.unitPrice
          : unitPrice // ignore: cast_nullable_to_non_nullable
              as int?,
      quantity: null == quantity
          ? _value.quantity
          : quantity // ignore: cast_nullable_to_non_nullable
              as int,
      subtotal: null == subtotal
          ? _value.subtotal
          : subtotal // ignore: cast_nullable_to_non_nullable
              as int,
      isDiscount: null == isDiscount
          ? _value.isDiscount
          : isDiscount // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ReceiptLineItemImplCopyWith<$Res>
    implements $ReceiptLineItemCopyWith<$Res> {
  factory _$$ReceiptLineItemImplCopyWith(_$ReceiptLineItemImpl value,
          $Res Function(_$ReceiptLineItemImpl) then) =
      __$$ReceiptLineItemImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String name,
      int? unitPrice,
      int quantity,
      int subtotal,
      bool isDiscount});
}

/// @nodoc
class __$$ReceiptLineItemImplCopyWithImpl<$Res>
    extends _$ReceiptLineItemCopyWithImpl<$Res, _$ReceiptLineItemImpl>
    implements _$$ReceiptLineItemImplCopyWith<$Res> {
  __$$ReceiptLineItemImplCopyWithImpl(
      _$ReceiptLineItemImpl _value, $Res Function(_$ReceiptLineItemImpl) _then)
      : super(_value, _then);

  /// Create a copy of ReceiptLineItem
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? name = null,
    Object? unitPrice = freezed,
    Object? quantity = null,
    Object? subtotal = null,
    Object? isDiscount = null,
  }) {
    return _then(_$ReceiptLineItemImpl(
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      unitPrice: freezed == unitPrice
          ? _value.unitPrice
          : unitPrice // ignore: cast_nullable_to_non_nullable
              as int?,
      quantity: null == quantity
          ? _value.quantity
          : quantity // ignore: cast_nullable_to_non_nullable
              as int,
      subtotal: null == subtotal
          ? _value.subtotal
          : subtotal // ignore: cast_nullable_to_non_nullable
              as int,
      isDiscount: null == isDiscount
          ? _value.isDiscount
          : isDiscount // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ReceiptLineItemImpl implements _ReceiptLineItem {
  const _$ReceiptLineItemImpl(
      {required this.name,
      this.unitPrice,
      this.quantity = 1,
      required this.subtotal,
      this.isDiscount = false});

  factory _$ReceiptLineItemImpl.fromJson(Map<String, dynamic> json) =>
      _$$ReceiptLineItemImplFromJson(json);

  /// 品項名稱
  @override
  final String name;

  /// 單價
  @override
  final int? unitPrice;

  /// 數量
  @override
  @JsonKey()
  final int quantity;

  /// 小計金額
  @override
  final int subtotal;

  /// 是否為折扣項目
  @override
  @JsonKey()
  final bool isDiscount;

  @override
  String toString() {
    return 'ReceiptLineItem(name: $name, unitPrice: $unitPrice, quantity: $quantity, subtotal: $subtotal, isDiscount: $isDiscount)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ReceiptLineItemImpl &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.unitPrice, unitPrice) ||
                other.unitPrice == unitPrice) &&
            (identical(other.quantity, quantity) ||
                other.quantity == quantity) &&
            (identical(other.subtotal, subtotal) ||
                other.subtotal == subtotal) &&
            (identical(other.isDiscount, isDiscount) ||
                other.isDiscount == isDiscount));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode =>
      Object.hash(runtimeType, name, unitPrice, quantity, subtotal, isDiscount);

  /// Create a copy of ReceiptLineItem
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ReceiptLineItemImplCopyWith<_$ReceiptLineItemImpl> get copyWith =>
      __$$ReceiptLineItemImplCopyWithImpl<_$ReceiptLineItemImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ReceiptLineItemImplToJson(
      this,
    );
  }
}

abstract class _ReceiptLineItem implements ReceiptLineItem {
  const factory _ReceiptLineItem(
      {required final String name,
      final int? unitPrice,
      final int quantity,
      required final int subtotal,
      final bool isDiscount}) = _$ReceiptLineItemImpl;

  factory _ReceiptLineItem.fromJson(Map<String, dynamic> json) =
      _$ReceiptLineItemImpl.fromJson;

  /// 品項名稱
  @override
  String get name;

  /// 單價
  @override
  int? get unitPrice;

  /// 數量
  @override
  int get quantity;

  /// 小計金額
  @override
  int get subtotal;

  /// 是否為折扣項目
  @override
  bool get isDiscount;

  /// Create a copy of ReceiptLineItem
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ReceiptLineItemImplCopyWith<_$ReceiptLineItemImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

LineItemParseResult _$LineItemParseResultFromJson(Map<String, dynamic> json) {
  return _LineItemParseResult.fromJson(json);
}

/// @nodoc
mixin _$LineItemParseResult {
  /// 品項列表
  List<ReceiptLineItem> get items => throw _privateConstructorUsedError;

  /// 品項金額總和
  int get itemsTotal => throw _privateConstructorUsedError;

  /// 解析信心度 (0-1)
  double get confidence => throw _privateConstructorUsedError;

  /// 使用的解析器名稱
  String get parserUsed => throw _privateConstructorUsedError;

  /// Serializes this LineItemParseResult to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of LineItemParseResult
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $LineItemParseResultCopyWith<LineItemParseResult> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $LineItemParseResultCopyWith<$Res> {
  factory $LineItemParseResultCopyWith(
          LineItemParseResult value, $Res Function(LineItemParseResult) then) =
      _$LineItemParseResultCopyWithImpl<$Res, LineItemParseResult>;
  @useResult
  $Res call(
      {List<ReceiptLineItem> items,
      int itemsTotal,
      double confidence,
      String parserUsed});
}

/// @nodoc
class _$LineItemParseResultCopyWithImpl<$Res, $Val extends LineItemParseResult>
    implements $LineItemParseResultCopyWith<$Res> {
  _$LineItemParseResultCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of LineItemParseResult
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? items = null,
    Object? itemsTotal = null,
    Object? confidence = null,
    Object? parserUsed = null,
  }) {
    return _then(_value.copyWith(
      items: null == items
          ? _value.items
          : items // ignore: cast_nullable_to_non_nullable
              as List<ReceiptLineItem>,
      itemsTotal: null == itemsTotal
          ? _value.itemsTotal
          : itemsTotal // ignore: cast_nullable_to_non_nullable
              as int,
      confidence: null == confidence
          ? _value.confidence
          : confidence // ignore: cast_nullable_to_non_nullable
              as double,
      parserUsed: null == parserUsed
          ? _value.parserUsed
          : parserUsed // ignore: cast_nullable_to_non_nullable
              as String,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$LineItemParseResultImplCopyWith<$Res>
    implements $LineItemParseResultCopyWith<$Res> {
  factory _$$LineItemParseResultImplCopyWith(_$LineItemParseResultImpl value,
          $Res Function(_$LineItemParseResultImpl) then) =
      __$$LineItemParseResultImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {List<ReceiptLineItem> items,
      int itemsTotal,
      double confidence,
      String parserUsed});
}

/// @nodoc
class __$$LineItemParseResultImplCopyWithImpl<$Res>
    extends _$LineItemParseResultCopyWithImpl<$Res, _$LineItemParseResultImpl>
    implements _$$LineItemParseResultImplCopyWith<$Res> {
  __$$LineItemParseResultImplCopyWithImpl(_$LineItemParseResultImpl _value,
      $Res Function(_$LineItemParseResultImpl) _then)
      : super(_value, _then);

  /// Create a copy of LineItemParseResult
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? items = null,
    Object? itemsTotal = null,
    Object? confidence = null,
    Object? parserUsed = null,
  }) {
    return _then(_$LineItemParseResultImpl(
      items: null == items
          ? _value._items
          : items // ignore: cast_nullable_to_non_nullable
              as List<ReceiptLineItem>,
      itemsTotal: null == itemsTotal
          ? _value.itemsTotal
          : itemsTotal // ignore: cast_nullable_to_non_nullable
              as int,
      confidence: null == confidence
          ? _value.confidence
          : confidence // ignore: cast_nullable_to_non_nullable
              as double,
      parserUsed: null == parserUsed
          ? _value.parserUsed
          : parserUsed // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$LineItemParseResultImpl implements _LineItemParseResult {
  const _$LineItemParseResultImpl(
      {required final List<ReceiptLineItem> items,
      required this.itemsTotal,
      this.confidence = 0,
      this.parserUsed = ''})
      : _items = items;

  factory _$LineItemParseResultImpl.fromJson(Map<String, dynamic> json) =>
      _$$LineItemParseResultImplFromJson(json);

  /// 品項列表
  final List<ReceiptLineItem> _items;

  /// 品項列表
  @override
  List<ReceiptLineItem> get items {
    if (_items is EqualUnmodifiableListView) return _items;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_items);
  }

  /// 品項金額總和
  @override
  final int itemsTotal;

  /// 解析信心度 (0-1)
  @override
  @JsonKey()
  final double confidence;

  /// 使用的解析器名稱
  @override
  @JsonKey()
  final String parserUsed;

  @override
  String toString() {
    return 'LineItemParseResult(items: $items, itemsTotal: $itemsTotal, confidence: $confidence, parserUsed: $parserUsed)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$LineItemParseResultImpl &&
            const DeepCollectionEquality().equals(other._items, _items) &&
            (identical(other.itemsTotal, itemsTotal) ||
                other.itemsTotal == itemsTotal) &&
            (identical(other.confidence, confidence) ||
                other.confidence == confidence) &&
            (identical(other.parserUsed, parserUsed) ||
                other.parserUsed == parserUsed));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      const DeepCollectionEquality().hash(_items),
      itemsTotal,
      confidence,
      parserUsed);

  /// Create a copy of LineItemParseResult
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$LineItemParseResultImplCopyWith<_$LineItemParseResultImpl> get copyWith =>
      __$$LineItemParseResultImplCopyWithImpl<_$LineItemParseResultImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$LineItemParseResultImplToJson(
      this,
    );
  }
}

abstract class _LineItemParseResult implements LineItemParseResult {
  const factory _LineItemParseResult(
      {required final List<ReceiptLineItem> items,
      required final int itemsTotal,
      final double confidence,
      final String parserUsed}) = _$LineItemParseResultImpl;

  factory _LineItemParseResult.fromJson(Map<String, dynamic> json) =
      _$LineItemParseResultImpl.fromJson;

  /// 品項列表
  @override
  List<ReceiptLineItem> get items;

  /// 品項金額總和
  @override
  int get itemsTotal;

  /// 解析信心度 (0-1)
  @override
  double get confidence;

  /// 使用的解析器名稱
  @override
  String get parserUsed;

  /// Create a copy of LineItemParseResult
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$LineItemParseResultImplCopyWith<_$LineItemParseResultImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

CurrencyDetectionResult _$CurrencyDetectionResultFromJson(
    Map<String, dynamic> json) {
  return _CurrencyDetectionResult.fromJson(json);
}

/// @nodoc
mixin _$CurrencyDetectionResult {
  /// 貨幣代碼（JPY, KRW, THB 等）
  String get currency => throw _privateConstructorUsedError;

  /// 信心度 (0-1)
  double get confidence => throw _privateConstructorUsedError;

  /// Serializes this CurrencyDetectionResult to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of CurrencyDetectionResult
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $CurrencyDetectionResultCopyWith<CurrencyDetectionResult> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CurrencyDetectionResultCopyWith<$Res> {
  factory $CurrencyDetectionResultCopyWith(CurrencyDetectionResult value,
          $Res Function(CurrencyDetectionResult) then) =
      _$CurrencyDetectionResultCopyWithImpl<$Res, CurrencyDetectionResult>;
  @useResult
  $Res call({String currency, double confidence});
}

/// @nodoc
class _$CurrencyDetectionResultCopyWithImpl<$Res,
        $Val extends CurrencyDetectionResult>
    implements $CurrencyDetectionResultCopyWith<$Res> {
  _$CurrencyDetectionResultCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of CurrencyDetectionResult
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? currency = null,
    Object? confidence = null,
  }) {
    return _then(_value.copyWith(
      currency: null == currency
          ? _value.currency
          : currency // ignore: cast_nullable_to_non_nullable
              as String,
      confidence: null == confidence
          ? _value.confidence
          : confidence // ignore: cast_nullable_to_non_nullable
              as double,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$CurrencyDetectionResultImplCopyWith<$Res>
    implements $CurrencyDetectionResultCopyWith<$Res> {
  factory _$$CurrencyDetectionResultImplCopyWith(
          _$CurrencyDetectionResultImpl value,
          $Res Function(_$CurrencyDetectionResultImpl) then) =
      __$$CurrencyDetectionResultImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String currency, double confidence});
}

/// @nodoc
class __$$CurrencyDetectionResultImplCopyWithImpl<$Res>
    extends _$CurrencyDetectionResultCopyWithImpl<$Res,
        _$CurrencyDetectionResultImpl>
    implements _$$CurrencyDetectionResultImplCopyWith<$Res> {
  __$$CurrencyDetectionResultImplCopyWithImpl(
      _$CurrencyDetectionResultImpl _value,
      $Res Function(_$CurrencyDetectionResultImpl) _then)
      : super(_value, _then);

  /// Create a copy of CurrencyDetectionResult
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? currency = null,
    Object? confidence = null,
  }) {
    return _then(_$CurrencyDetectionResultImpl(
      currency: null == currency
          ? _value.currency
          : currency // ignore: cast_nullable_to_non_nullable
              as String,
      confidence: null == confidence
          ? _value.confidence
          : confidence // ignore: cast_nullable_to_non_nullable
              as double,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$CurrencyDetectionResultImpl implements _CurrencyDetectionResult {
  const _$CurrencyDetectionResultImpl(
      {required this.currency, this.confidence = 0});

  factory _$CurrencyDetectionResultImpl.fromJson(Map<String, dynamic> json) =>
      _$$CurrencyDetectionResultImplFromJson(json);

  /// 貨幣代碼（JPY, KRW, THB 等）
  @override
  final String currency;

  /// 信心度 (0-1)
  @override
  @JsonKey()
  final double confidence;

  @override
  String toString() {
    return 'CurrencyDetectionResult(currency: $currency, confidence: $confidence)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CurrencyDetectionResultImpl &&
            (identical(other.currency, currency) ||
                other.currency == currency) &&
            (identical(other.confidence, confidence) ||
                other.confidence == confidence));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, currency, confidence);

  /// Create a copy of CurrencyDetectionResult
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$CurrencyDetectionResultImplCopyWith<_$CurrencyDetectionResultImpl>
      get copyWith => __$$CurrencyDetectionResultImplCopyWithImpl<
          _$CurrencyDetectionResultImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$CurrencyDetectionResultImplToJson(
      this,
    );
  }
}

abstract class _CurrencyDetectionResult implements CurrencyDetectionResult {
  const factory _CurrencyDetectionResult(
      {required final String currency,
      final double confidence}) = _$CurrencyDetectionResultImpl;

  factory _CurrencyDetectionResult.fromJson(Map<String, dynamic> json) =
      _$CurrencyDetectionResultImpl.fromJson;

  /// 貨幣代碼（JPY, KRW, THB 等）
  @override
  String get currency;

  /// 信心度 (0-1)
  @override
  double get confidence;

  /// Create a copy of CurrencyDetectionResult
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$CurrencyDetectionResultImplCopyWith<_$CurrencyDetectionResultImpl>
      get copyWith => throw _privateConstructorUsedError;
}

LocalOcrResult _$LocalOcrResultFromJson(Map<String, dynamic> json) {
  return _LocalOcrResult.fromJson(json);
}

/// @nodoc
mixin _$LocalOcrResult {
  /// 辨識的完整文字
  String get fullText => throw _privateConstructorUsedError;

  /// 文字區塊列表
  List<TextBlockInfo> get blocks => throw _privateConstructorUsedError;

  /// Serializes this LocalOcrResult to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of LocalOcrResult
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $LocalOcrResultCopyWith<LocalOcrResult> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $LocalOcrResultCopyWith<$Res> {
  factory $LocalOcrResultCopyWith(
          LocalOcrResult value, $Res Function(LocalOcrResult) then) =
      _$LocalOcrResultCopyWithImpl<$Res, LocalOcrResult>;
  @useResult
  $Res call({String fullText, List<TextBlockInfo> blocks});
}

/// @nodoc
class _$LocalOcrResultCopyWithImpl<$Res, $Val extends LocalOcrResult>
    implements $LocalOcrResultCopyWith<$Res> {
  _$LocalOcrResultCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of LocalOcrResult
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? fullText = null,
    Object? blocks = null,
  }) {
    return _then(_value.copyWith(
      fullText: null == fullText
          ? _value.fullText
          : fullText // ignore: cast_nullable_to_non_nullable
              as String,
      blocks: null == blocks
          ? _value.blocks
          : blocks // ignore: cast_nullable_to_non_nullable
              as List<TextBlockInfo>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$LocalOcrResultImplCopyWith<$Res>
    implements $LocalOcrResultCopyWith<$Res> {
  factory _$$LocalOcrResultImplCopyWith(_$LocalOcrResultImpl value,
          $Res Function(_$LocalOcrResultImpl) then) =
      __$$LocalOcrResultImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String fullText, List<TextBlockInfo> blocks});
}

/// @nodoc
class __$$LocalOcrResultImplCopyWithImpl<$Res>
    extends _$LocalOcrResultCopyWithImpl<$Res, _$LocalOcrResultImpl>
    implements _$$LocalOcrResultImplCopyWith<$Res> {
  __$$LocalOcrResultImplCopyWithImpl(
      _$LocalOcrResultImpl _value, $Res Function(_$LocalOcrResultImpl) _then)
      : super(_value, _then);

  /// Create a copy of LocalOcrResult
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? fullText = null,
    Object? blocks = null,
  }) {
    return _then(_$LocalOcrResultImpl(
      fullText: null == fullText
          ? _value.fullText
          : fullText // ignore: cast_nullable_to_non_nullable
              as String,
      blocks: null == blocks
          ? _value._blocks
          : blocks // ignore: cast_nullable_to_non_nullable
              as List<TextBlockInfo>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$LocalOcrResultImpl implements _LocalOcrResult {
  const _$LocalOcrResultImpl(
      {required this.fullText, final List<TextBlockInfo> blocks = const []})
      : _blocks = blocks;

  factory _$LocalOcrResultImpl.fromJson(Map<String, dynamic> json) =>
      _$$LocalOcrResultImplFromJson(json);

  /// 辨識的完整文字
  @override
  final String fullText;

  /// 文字區塊列表
  final List<TextBlockInfo> _blocks;

  /// 文字區塊列表
  @override
  @JsonKey()
  List<TextBlockInfo> get blocks {
    if (_blocks is EqualUnmodifiableListView) return _blocks;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_blocks);
  }

  @override
  String toString() {
    return 'LocalOcrResult(fullText: $fullText, blocks: $blocks)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$LocalOcrResultImpl &&
            (identical(other.fullText, fullText) ||
                other.fullText == fullText) &&
            const DeepCollectionEquality().equals(other._blocks, _blocks));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
      runtimeType, fullText, const DeepCollectionEquality().hash(_blocks));

  /// Create a copy of LocalOcrResult
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$LocalOcrResultImplCopyWith<_$LocalOcrResultImpl> get copyWith =>
      __$$LocalOcrResultImplCopyWithImpl<_$LocalOcrResultImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$LocalOcrResultImplToJson(
      this,
    );
  }
}

abstract class _LocalOcrResult implements LocalOcrResult {
  const factory _LocalOcrResult(
      {required final String fullText,
      final List<TextBlockInfo> blocks}) = _$LocalOcrResultImpl;

  factory _LocalOcrResult.fromJson(Map<String, dynamic> json) =
      _$LocalOcrResultImpl.fromJson;

  /// 辨識的完整文字
  @override
  String get fullText;

  /// 文字區塊列表
  @override
  List<TextBlockInfo> get blocks;

  /// Create a copy of LocalOcrResult
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$LocalOcrResultImplCopyWith<_$LocalOcrResultImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

TextBlockInfo _$TextBlockInfoFromJson(Map<String, dynamic> json) {
  return _TextBlockInfo.fromJson(json);
}

/// @nodoc
mixin _$TextBlockInfo {
  /// 區塊文字
  String get text => throw _privateConstructorUsedError;

  /// 區塊位置（left, top, right, bottom）
  List<double>? get boundingBox => throw _privateConstructorUsedError;

  /// 信心度
  double get confidence => throw _privateConstructorUsedError;

  /// Serializes this TextBlockInfo to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of TextBlockInfo
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $TextBlockInfoCopyWith<TextBlockInfo> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TextBlockInfoCopyWith<$Res> {
  factory $TextBlockInfoCopyWith(
          TextBlockInfo value, $Res Function(TextBlockInfo) then) =
      _$TextBlockInfoCopyWithImpl<$Res, TextBlockInfo>;
  @useResult
  $Res call({String text, List<double>? boundingBox, double confidence});
}

/// @nodoc
class _$TextBlockInfoCopyWithImpl<$Res, $Val extends TextBlockInfo>
    implements $TextBlockInfoCopyWith<$Res> {
  _$TextBlockInfoCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of TextBlockInfo
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? text = null,
    Object? boundingBox = freezed,
    Object? confidence = null,
  }) {
    return _then(_value.copyWith(
      text: null == text
          ? _value.text
          : text // ignore: cast_nullable_to_non_nullable
              as String,
      boundingBox: freezed == boundingBox
          ? _value.boundingBox
          : boundingBox // ignore: cast_nullable_to_non_nullable
              as List<double>?,
      confidence: null == confidence
          ? _value.confidence
          : confidence // ignore: cast_nullable_to_non_nullable
              as double,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TextBlockInfoImplCopyWith<$Res>
    implements $TextBlockInfoCopyWith<$Res> {
  factory _$$TextBlockInfoImplCopyWith(
          _$TextBlockInfoImpl value, $Res Function(_$TextBlockInfoImpl) then) =
      __$$TextBlockInfoImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String text, List<double>? boundingBox, double confidence});
}

/// @nodoc
class __$$TextBlockInfoImplCopyWithImpl<$Res>
    extends _$TextBlockInfoCopyWithImpl<$Res, _$TextBlockInfoImpl>
    implements _$$TextBlockInfoImplCopyWith<$Res> {
  __$$TextBlockInfoImplCopyWithImpl(
      _$TextBlockInfoImpl _value, $Res Function(_$TextBlockInfoImpl) _then)
      : super(_value, _then);

  /// Create a copy of TextBlockInfo
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? text = null,
    Object? boundingBox = freezed,
    Object? confidence = null,
  }) {
    return _then(_$TextBlockInfoImpl(
      text: null == text
          ? _value.text
          : text // ignore: cast_nullable_to_non_nullable
              as String,
      boundingBox: freezed == boundingBox
          ? _value._boundingBox
          : boundingBox // ignore: cast_nullable_to_non_nullable
              as List<double>?,
      confidence: null == confidence
          ? _value.confidence
          : confidence // ignore: cast_nullable_to_non_nullable
              as double,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TextBlockInfoImpl implements _TextBlockInfo {
  const _$TextBlockInfoImpl(
      {required this.text,
      final List<double>? boundingBox,
      this.confidence = 0.9})
      : _boundingBox = boundingBox;

  factory _$TextBlockInfoImpl.fromJson(Map<String, dynamic> json) =>
      _$$TextBlockInfoImplFromJson(json);

  /// 區塊文字
  @override
  final String text;

  /// 區塊位置（left, top, right, bottom）
  final List<double>? _boundingBox;

  /// 區塊位置（left, top, right, bottom）
  @override
  List<double>? get boundingBox {
    final value = _boundingBox;
    if (value == null) return null;
    if (_boundingBox is EqualUnmodifiableListView) return _boundingBox;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(value);
  }

  /// 信心度
  @override
  @JsonKey()
  final double confidence;

  @override
  String toString() {
    return 'TextBlockInfo(text: $text, boundingBox: $boundingBox, confidence: $confidence)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TextBlockInfoImpl &&
            (identical(other.text, text) || other.text == text) &&
            const DeepCollectionEquality()
                .equals(other._boundingBox, _boundingBox) &&
            (identical(other.confidence, confidence) ||
                other.confidence == confidence));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(runtimeType, text,
      const DeepCollectionEquality().hash(_boundingBox), confidence);

  /// Create a copy of TextBlockInfo
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$TextBlockInfoImplCopyWith<_$TextBlockInfoImpl> get copyWith =>
      __$$TextBlockInfoImplCopyWithImpl<_$TextBlockInfoImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TextBlockInfoImplToJson(
      this,
    );
  }
}

abstract class _TextBlockInfo implements TextBlockInfo {
  const factory _TextBlockInfo(
      {required final String text,
      final List<double>? boundingBox,
      final double confidence}) = _$TextBlockInfoImpl;

  factory _TextBlockInfo.fromJson(Map<String, dynamic> json) =
      _$TextBlockInfoImpl.fromJson;

  /// 區塊文字
  @override
  String get text;

  /// 區塊位置（left, top, right, bottom）
  @override
  List<double>? get boundingBox;

  /// 信心度
  @override
  double get confidence;

  /// Create a copy of TextBlockInfo
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$TextBlockInfoImplCopyWith<_$TextBlockInfoImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
