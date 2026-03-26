// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'ocr_result_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$OcrResultImpl _$$OcrResultImplFromJson(Map<String, dynamic> json) =>
    _$OcrResultImpl(
      companyName: json['companyName'] as String?,
      brandName: json['brandName'] as String?,
      taxId: json['taxId'] as String?,
      invoiceNumber: json['invoiceNumber'] as String?,
      amount: (json['amount'] as num?)?.toInt(),
      date:
          json['date'] == null ? null : DateTime.parse(json['date'] as String),
      suggestedCategory: json['suggestedCategory'] as String?,
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0,
      rawText: json['rawText'] as String? ?? '',
      brandSource:
          $enumDecodeNullable(_$BrandSourceEnumMap, json['brandSource']),
      lineItems: json['lineItems'] == null
          ? null
          : LineItemParseResult.fromJson(
              json['lineItems'] as Map<String, dynamic>),
      detectedLanguage: json['detectedLanguage'] as String?,
      currencyResult: json['currencyResult'] == null
          ? null
          : CurrencyDetectionResult.fromJson(
              json['currencyResult'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$$OcrResultImplToJson(_$OcrResultImpl instance) =>
    <String, dynamic>{
      'companyName': instance.companyName,
      'brandName': instance.brandName,
      'taxId': instance.taxId,
      'invoiceNumber': instance.invoiceNumber,
      'amount': instance.amount,
      'date': instance.date?.toIso8601String(),
      'suggestedCategory': instance.suggestedCategory,
      'confidence': instance.confidence,
      'rawText': instance.rawText,
      'brandSource': _$BrandSourceEnumMap[instance.brandSource],
      'lineItems': instance.lineItems,
      'detectedLanguage': instance.detectedLanguage,
      'currencyResult': instance.currencyResult,
    };

const _$BrandSourceEnumMap = {
  BrandSource.userHistory: 'USER_HISTORY',
  BrandSource.mappingTable: 'MAPPING_TABLE',
  BrandSource.aiSuggest: 'AI_SUGGEST',
  BrandSource.notFound: 'NOT_FOUND',
};

_$ReceiptLineItemImpl _$$ReceiptLineItemImplFromJson(
        Map<String, dynamic> json) =>
    _$ReceiptLineItemImpl(
      name: json['name'] as String,
      unitPrice: (json['unitPrice'] as num?)?.toInt(),
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      subtotal: (json['subtotal'] as num).toInt(),
      isDiscount: json['isDiscount'] as bool? ?? false,
    );

Map<String, dynamic> _$$ReceiptLineItemImplToJson(
        _$ReceiptLineItemImpl instance) =>
    <String, dynamic>{
      'name': instance.name,
      'unitPrice': instance.unitPrice,
      'quantity': instance.quantity,
      'subtotal': instance.subtotal,
      'isDiscount': instance.isDiscount,
    };

_$LineItemParseResultImpl _$$LineItemParseResultImplFromJson(
        Map<String, dynamic> json) =>
    _$LineItemParseResultImpl(
      items: (json['items'] as List<dynamic>)
          .map((e) => ReceiptLineItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      itemsTotal: (json['itemsTotal'] as num).toInt(),
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0,
      parserUsed: json['parserUsed'] as String? ?? '',
    );

Map<String, dynamic> _$$LineItemParseResultImplToJson(
        _$LineItemParseResultImpl instance) =>
    <String, dynamic>{
      'items': instance.items,
      'itemsTotal': instance.itemsTotal,
      'confidence': instance.confidence,
      'parserUsed': instance.parserUsed,
    };

_$CurrencyDetectionResultImpl _$$CurrencyDetectionResultImplFromJson(
        Map<String, dynamic> json) =>
    _$CurrencyDetectionResultImpl(
      currency: json['currency'] as String,
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0,
    );

Map<String, dynamic> _$$CurrencyDetectionResultImplToJson(
        _$CurrencyDetectionResultImpl instance) =>
    <String, dynamic>{
      'currency': instance.currency,
      'confidence': instance.confidence,
    };

_$LocalOcrResultImpl _$$LocalOcrResultImplFromJson(Map<String, dynamic> json) =>
    _$LocalOcrResultImpl(
      fullText: json['fullText'] as String,
      blocks: (json['blocks'] as List<dynamic>?)
              ?.map((e) => TextBlockInfo.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );

Map<String, dynamic> _$$LocalOcrResultImplToJson(
        _$LocalOcrResultImpl instance) =>
    <String, dynamic>{
      'fullText': instance.fullText,
      'blocks': instance.blocks,
    };

_$TextBlockInfoImpl _$$TextBlockInfoImplFromJson(Map<String, dynamic> json) =>
    _$TextBlockInfoImpl(
      text: json['text'] as String,
      boundingBox: (json['boundingBox'] as List<dynamic>?)
          ?.map((e) => (e as num).toDouble())
          .toList(),
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.9,
    );

Map<String, dynamic> _$$TextBlockInfoImplToJson(_$TextBlockInfoImpl instance) =>
    <String, dynamic>{
      'text': instance.text,
      'boundingBox': instance.boundingBox,
      'confidence': instance.confidence,
    };
