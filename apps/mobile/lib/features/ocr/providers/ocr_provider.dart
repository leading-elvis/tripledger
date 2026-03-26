import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../data/ocr_repository.dart';
import '../domain/image_quality_service.dart';
import '../domain/ocr_result_model.dart';
import '../domain/ocr_service.dart';

/// OCR 服務 Provider
final ocrServiceProvider = Provider<OcrService>((ref) {
  final service = OcrService();
  ref.onDispose(() => service.dispose());
  return service;
});

/// 圖片品質評估服務 Provider
final imageQualityServiceProvider = Provider<ImageQualityService>((ref) {
  return ImageQualityService();
});

/// OCR 掃描狀態
enum OcrScanStatus {
  idle,
  scanning,
  parsing,
  success,
  error,
}

/// OCR 掃描狀態類
class OcrScanState {
  final OcrScanStatus status;
  final LocalOcrResult? localResult;
  final OcrResult? serverResult;
  final String? errorMessage;
  final ImageQualityResult? qualityResult;

  const OcrScanState({
    this.status = OcrScanStatus.idle,
    this.localResult,
    this.serverResult,
    this.errorMessage,
    this.qualityResult,
  });

  OcrScanState copyWith({
    OcrScanStatus? status,
    LocalOcrResult? localResult,
    OcrResult? serverResult,
    String? errorMessage,
    ImageQualityResult? qualityResult,
  }) {
    return OcrScanState(
      status: status ?? this.status,
      localResult: localResult ?? this.localResult,
      serverResult: serverResult ?? this.serverResult,
      errorMessage: errorMessage,
      qualityResult: qualityResult ?? this.qualityResult,
    );
  }
}

/// OCR 掃描 Notifier
class OcrScanNotifier extends StateNotifier<OcrScanState> {
  final OcrService _ocrService;
  final OcrRepository _ocrRepository;
  final ImageQualityService _qualityService;

  OcrScanNotifier(this._ocrService, this._ocrRepository, this._qualityService)
      : super(const OcrScanState());

  /// 掃描並解析收據圖片（混合辨識策略）
  ///
  /// 策略：
  /// 1. 先嘗試本地 ML Kit 辨識（離線、快速）
  /// 2. 若本地辨識結果品質夠好（有金額和商家），使用文字解析
  /// 3. 若本地辨識品質不佳，上傳圖片到後端使用 Vision API
  ///
  /// [imageFile] 收據圖片檔案
  /// [tripId] 旅程 ID（必填，用於進階功能檢查和品牌對照）
  Future<void> scanReceipt(File imageFile, {required String tripId}) async {
    try {
      state = state.copyWith(status: OcrScanStatus.scanning);

      // 1. 先嘗試本地 ML Kit 辨識
      LocalOcrResult? localResult;
      String? mlKitText;
      ImageQualityResult? qualityResult;

      try {
        localResult = await _ocrService.recognizeText(imageFile);
        mlKitText = localResult.fullText;

        // 評估圖片品質
        qualityResult = _qualityService.evaluateFromOcrResult(localResult);
      } catch (e) {
        // ML Kit 辨識失敗，繼續使用後端 Vision API
      }

      state = state.copyWith(
        status: OcrScanStatus.parsing,
        localResult: localResult,
        qualityResult: qualityResult,
      );

      // 2. 評估 ML Kit 結果品質
      final isLocalResultGood = _isLocalResultSatisfactory(mlKitText);

      if (isLocalResultGood && mlKitText != null) {
        // 本地結果品質夠好，使用文字解析
        try {
          final serverResult = await _ocrRepository.parseReceipt(
            rawText: mlKitText,
            tripId: tripId,
          );

          // 檢查解析結果是否滿意（有金額且有商家名稱）
          if (_isParseResultSatisfactory(serverResult)) {
            state = state.copyWith(
              status: OcrScanStatus.success,
              serverResult: serverResult,
            );
            return;
          }
        } catch (e) {
          // 文字解析失敗，繼續使用圖片上傳
        }
      }

      // 3. 本地結果品質不佳或解析失敗，上傳圖片到後端使用 Vision API
      final serverResult = await _ocrRepository.scanReceiptImage(
        imageFile: imageFile,
        tripId: tripId,
        mlKitFallbackText: mlKitText,
      );

      state = state.copyWith(
        status: OcrScanStatus.success,
        serverResult: serverResult,
      );
    } on ApiException catch (e) {
      // 保留 ApiException 的錯誤碼，讓上層能判斷 PREMIUM_REQUIRED 等
      state = state.copyWith(
        status: OcrScanStatus.error,
        errorMessage: e.errorCode ?? e.message,
      );
    } catch (e) {
      state = state.copyWith(
        status: OcrScanStatus.error,
        errorMessage: '辨識收據時發生錯誤，請重試或手動新增帳單',
      );
    }
  }

  /// 評估本地 OCR 結果是否滿意
  ///
  /// 判斷標準：
  /// - 文字長度至少 20 字元
  /// - 包含一些中文字元（表示中文辨識正常）
  bool _isLocalResultSatisfactory(String? text) {
    if (text == null || text.length < 20) return false;

    // 計算中文字元比例
    final chinesePattern = RegExp(r'[\u4e00-\u9fff]');
    final chineseCount = chinesePattern.allMatches(text).length;

    // 如果有超過 5 個中文字，認為 ML Kit 辨識品質可接受
    return chineseCount >= 5;
  }

  /// 評估解析結果是否滿意
  ///
  /// 判斷標準：
  /// - 有金額
  /// - 有商家/品牌名稱
  /// - 信心度高於 0.5
  bool _isParseResultSatisfactory(OcrResult result) {
    return result.amount != null &&
        (result.brandName != null || result.companyName != null) &&
        result.confidence > 0.5;
  }

  /// 學習品牌對照
  Future<void> learnBrandMapping(
    String companyName,
    String customBrandName,
  ) async {
    await _ocrRepository.learnMapping(
      companyName: companyName,
      customBrandName: customBrandName,
    );
  }

  /// 重置狀態
  void reset() {
    state = const OcrScanState();
  }
}

/// OCR 掃描 Provider
final ocrScanProvider =
    StateNotifierProvider<OcrScanNotifier, OcrScanState>((ref) {
  final ocrService = ref.read(ocrServiceProvider);
  final ocrRepository = ref.read(ocrRepositoryProvider);
  final qualityService = ref.read(imageQualityServiceProvider);
  return OcrScanNotifier(ocrService, ocrRepository, qualityService);
});
