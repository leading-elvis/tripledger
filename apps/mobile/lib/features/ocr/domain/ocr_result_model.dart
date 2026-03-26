import 'package:freezed_annotation/freezed_annotation.dart';

part 'ocr_result_model.freezed.dart';
part 'ocr_result_model.g.dart';

/// 品牌查詢來源
enum BrandSource {
  @JsonValue('USER_HISTORY')
  userHistory,
  @JsonValue('MAPPING_TABLE')
  mappingTable,
  @JsonValue('AI_SUGGEST')
  aiSuggest,
  @JsonValue('NOT_FOUND')
  notFound,
}

/// OCR 解析結果
@freezed
class OcrResult with _$OcrResult {
  const factory OcrResult({
    /// 公司名稱
    String? companyName,

    /// 品牌名稱
    String? brandName,

    /// 統一編號
    String? taxId,

    /// 電子發票號碼
    String? invoiceNumber,

    /// 金額
    int? amount,

    /// 日期
    DateTime? date,

    /// 建議分類
    String? suggestedCategory,

    /// 信心度 (0-1)
    @Default(0) double confidence,

    /// 原始文字
    @Default('') String rawText,

    /// 品牌來源
    BrandSource? brandSource,

    /// 品項明細
    LineItemParseResult? lineItems,

    /// 偵測到的語言（ja, ko, th, en 等）
    String? detectedLanguage,

    /// 幣別推斷結果
    CurrencyDetectionResult? currencyResult,
  }) = _OcrResult;

  factory OcrResult.fromJson(Map<String, dynamic> json) =>
      _$OcrResultFromJson(json);
}

/// 收據品項明細
@freezed
class ReceiptLineItem with _$ReceiptLineItem {
  const factory ReceiptLineItem({
    /// 品項名稱
    required String name,

    /// 單價
    int? unitPrice,

    /// 數量
    @Default(1) int quantity,

    /// 小計金額
    required int subtotal,

    /// 是否為折扣項目
    @Default(false) bool isDiscount,
  }) = _ReceiptLineItem;

  factory ReceiptLineItem.fromJson(Map<String, dynamic> json) =>
      _$ReceiptLineItemFromJson(json);
}

/// 品項解析結果
@freezed
class LineItemParseResult with _$LineItemParseResult {
  const factory LineItemParseResult({
    /// 品項列表
    required List<ReceiptLineItem> items,

    /// 品項金額總和
    required int itemsTotal,

    /// 解析信心度 (0-1)
    @Default(0) double confidence,

    /// 使用的解析器名稱
    @Default('') String parserUsed,
  }) = _LineItemParseResult;

  factory LineItemParseResult.fromJson(Map<String, dynamic> json) =>
      _$LineItemParseResultFromJson(json);
}

/// 幣別偵測結果
@freezed
class CurrencyDetectionResult with _$CurrencyDetectionResult {
  const factory CurrencyDetectionResult({
    /// 貨幣代碼（JPY, KRW, THB 等）
    required String currency,

    /// 信心度 (0-1)
    @Default(0) double confidence,
  }) = _CurrencyDetectionResult;

  factory CurrencyDetectionResult.fromJson(Map<String, dynamic> json) =>
      _$CurrencyDetectionResultFromJson(json);
}

/// 本地 OCR 辨識結果（ML Kit）
@freezed
class LocalOcrResult with _$LocalOcrResult {
  const factory LocalOcrResult({
    /// 辨識的完整文字
    required String fullText,

    /// 文字區塊列表
    @Default([]) List<TextBlockInfo> blocks,
  }) = _LocalOcrResult;

  factory LocalOcrResult.fromJson(Map<String, dynamic> json) =>
      _$LocalOcrResultFromJson(json);
}

/// 文字區塊資訊
@freezed
class TextBlockInfo with _$TextBlockInfo {
  const factory TextBlockInfo({
    /// 區塊文字
    required String text,

    /// 區塊位置（left, top, right, bottom）
    List<double>? boundingBox,

    /// 信心度
    @Default(0.9) double confidence,
  }) = _TextBlockInfo;

  factory TextBlockInfo.fromJson(Map<String, dynamic> json) =>
      _$TextBlockInfoFromJson(json);
}
