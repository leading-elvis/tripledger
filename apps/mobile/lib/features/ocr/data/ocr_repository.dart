import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../domain/ocr_result_model.dart';

/// OCR API Repository
///
/// 提供與後端 OCR API 的通訊
class OcrRepository {
  final ApiClient _apiClient;

  OcrRepository(this._apiClient);

  /// 解析收據文字
  ///
  /// 將 ML Kit 辨識的原始文字傳送到後端進行品牌對照和解析
  Future<OcrResult> parseReceipt({
    required String rawText,
    String? tripId,
  }) async {
    try {
      final response = await _apiClient.post(
        '/ocr/scan-receipt',
        data: {
          'rawText': rawText,
          if (tripId != null) 'tripId': tripId,
        },
      );

      return OcrResult.fromJson(response.data as Map<String, dynamic>);
    } on ApiException {
      rethrow;
    } catch (e, stack) {
      debugPrint('OCR parseReceipt 錯誤: $e\n$stack');
      throw ApiException(
        type: ApiExceptionType.unknown,
        message: '解析收據時發生錯誤',
        originalError: e,
      );
    }
  }

  /// 查詢品牌對照
  Future<OcrResult> lookupBrand(String companyName) async {
    try {
      final response = await _apiClient.get(
        '/ocr/company-mapping',
        queryParameters: {'companyName': companyName},
      );

      final data = response.data;
      if (data is! Map<String, dynamic>) {
        throw ApiException(
          type: ApiExceptionType.unknown,
          message: '伺服器回應格式錯誤',
        );
      }

      return OcrResult(
        brandName: data['brandName'] as String?,
        suggestedCategory: data['category'] as String?,
        confidence: (data['confidence'] as num?)?.toDouble() ?? 0,
        brandSource: _parseBrandSource(data['source'] as String?),
      );
    } on ApiException {
      rethrow;
    } catch (e, stack) {
      debugPrint('OCR lookupBrand 錯誤: $e\n$stack');
      throw ApiException(
        type: ApiExceptionType.unknown,
        message: '查詢品牌時發生錯誤',
        originalError: e,
      );
    }
  }

  /// 學習品牌對照
  ///
  /// 用戶修正品牌名稱後，記錄到後端供未來使用
  Future<void> learnMapping({
    required String companyName,
    required String customBrandName,
  }) async {
    try {
      await _apiClient.post(
        '/ocr/learn',
        data: {
          'companyName': companyName,
          'customBrandName': customBrandName,
        },
      );
    } on ApiException {
      rethrow;
    } catch (e, stack) {
      debugPrint('OCR learnMapping 錯誤: $e\n$stack');
      throw ApiException(
        type: ApiExceptionType.unknown,
        message: '儲存品牌對照時發生錯誤',
        originalError: e,
      );
    }
  }

  /// 使用圖片進行 OCR 辨識
  ///
  /// 將收據圖片上傳到後端，使用 Google Cloud Vision API 進行辨識
  /// 對中文（特別是台灣熱感應紙收據）的辨識效果優於本地 ML Kit
  ///
  /// [imageFile] 收據圖片檔案
  /// [tripId] 旅程 ID（用於個人化品牌對照和進階功能檢查）
  /// [mlKitFallbackText] ML Kit 辨識的文字（作為備援）
  Future<OcrResult> scanReceiptImage({
    required File imageFile,
    required String tripId,
    String? mlKitFallbackText,
  }) async {
    try {
      final response = await _apiClient.postMultipart(
        '/ocr/scan-receipt-image',
        file: imageFile,
        fileField: 'receiptImage',
        // tripId 需要通過 query parameter 傳遞，因為 PremiumGuard 在 FileInterceptor 之前執行
        queryParameters: {'tripId': tripId},
        data: {
          'tripId': tripId,
          if (mlKitFallbackText != null) 'mlKitFallbackText': mlKitFallbackText,
        },
      );

      return OcrResult.fromJson(response.data as Map<String, dynamic>);
    } on ApiException {
      rethrow;
    } catch (e, stack) {
      debugPrint('OCR scanReceiptImage 錯誤: $e\n$stack');
      throw ApiException(
        type: ApiExceptionType.unknown,
        message: '掃描收據圖片時發生錯誤',
        originalError: e,
      );
    }
  }

  BrandSource? _parseBrandSource(String? source) {
    switch (source) {
      case 'USER_HISTORY':
        return BrandSource.userHistory;
      case 'MAPPING_TABLE':
        return BrandSource.mappingTable;
      case 'AI_SUGGEST':
        return BrandSource.aiSuggest;
      case 'NOT_FOUND':
        return BrandSource.notFound;
      default:
        return null;
    }
  }
}

/// OCR Repository Provider
final ocrRepositoryProvider = Provider<OcrRepository>((ref) {
  final apiClient = ref.read(apiClientProvider);
  return OcrRepository(apiClient);
});
