import 'dart:io';
import 'dart:typed_data';

import 'ocr_result_model.dart';

/// 圖片品質等級
enum ImageQualityLevel {
  good,
  acceptable,
  poor,
}

/// 圖片品質評估結果
class ImageQualityResult {
  /// 品質等級
  final ImageQualityLevel level;

  /// 平均信心度（來自 OCR）
  final double avgConfidence;

  /// 辨識到的文字區塊數
  final int blockCount;

  /// 品質建議訊息
  final String? hint;

  /// 是否建議重拍
  final bool shouldRetake;

  const ImageQualityResult({
    required this.level,
    required this.avgConfidence,
    required this.blockCount,
    this.hint,
    this.shouldRetake = false,
  });

  factory ImageQualityResult.good({
    required double avgConfidence,
    required int blockCount,
  }) =>
      ImageQualityResult(
        level: ImageQualityLevel.good,
        avgConfidence: avgConfidence,
        blockCount: blockCount,
        shouldRetake: false,
      );

  factory ImageQualityResult.acceptable({
    required double avgConfidence,
    required int blockCount,
    String? hint,
  }) =>
      ImageQualityResult(
        level: ImageQualityLevel.acceptable,
        avgConfidence: avgConfidence,
        blockCount: blockCount,
        hint: hint,
        shouldRetake: false,
      );

  factory ImageQualityResult.poor({
    required double avgConfidence,
    required int blockCount,
    required String hint,
  }) =>
      ImageQualityResult(
        level: ImageQualityLevel.poor,
        avgConfidence: avgConfidence,
        blockCount: blockCount,
        hint: hint,
        shouldRetake: true,
      );
}

/// 圖片品質評估服務
///
/// 基於 OCR 辨識結果評估圖片品質，
/// 提供使用者重拍建議
class ImageQualityService {
  /// 評估圖片品質
  ///
  /// 基於 OCR 結果的信心度和區塊數判斷品質
  ImageQualityResult evaluateFromOcrResult(LocalOcrResult ocrResult) {
    // 計算平均信心度
    double avgConfidence = 0;
    if (ocrResult.blocks.isNotEmpty) {
      avgConfidence = ocrResult.blocks
              .map((b) => b.confidence)
              .reduce((a, b) => a + b) /
          ocrResult.blocks.length;
    }

    final blockCount = ocrResult.blocks.length;
    final fullTextLength = ocrResult.fullText.length;

    // 評估標準：
    // 1. 沒有辨識到文字 → 品質差
    // 2. 信心度很低 < 0.5 → 品質差
    // 3. 信心度中等 0.5-0.7 → 可接受
    // 4. 信心度高 >= 0.7 → 品質好

    if (blockCount == 0 || fullTextLength < 10) {
      return ImageQualityResult.poor(
        avgConfidence: avgConfidence,
        blockCount: blockCount,
        hint: '未偵測到文字，請確保收據在畫面中且光線充足',
      );
    }

    if (avgConfidence < 0.5) {
      return ImageQualityResult.poor(
        avgConfidence: avgConfidence,
        blockCount: blockCount,
        hint: '辨識困難，請確保圖片清晰且光線充足',
      );
    }

    if (avgConfidence < 0.7) {
      return ImageQualityResult.acceptable(
        avgConfidence: avgConfidence,
        blockCount: blockCount,
        hint: '部分文字辨識不清，可能需要手動修正',
      );
    }

    return ImageQualityResult.good(
      avgConfidence: avgConfidence,
      blockCount: blockCount,
    );
  }

  /// 評估圖片檔案大小
  ///
  /// 太小的檔案可能品質不佳
  Future<bool> isFileSizeAdequate(File imageFile) async {
    final bytes = await imageFile.length();
    // 小於 50KB 的圖片可能太模糊
    return bytes >= 50 * 1024;
  }

  /// 基於圖片尺寸評估
  ///
  /// 使用圖片的 bytes 快速檢查（不需要解碼整張圖）
  Future<String?> checkImageSize(File imageFile) async {
    final bytes = await imageFile.readAsBytes();

    // 解析圖片尺寸（簡易方式：檢查 JPEG/PNG header）
    final size = _getImageSize(bytes);
    if (size == null) return null;

    final (width, height) = size;

    // 太小的圖片難以辨識
    if (width < 640 || height < 480) {
      return '圖片解析度過低，請使用較高品質拍攝';
    }

    // 太大的圖片會增加處理時間
    if (width > 4000 || height > 4000) {
      return null; // 不顯示警告，但可能需要壓縮
    }

    return null;
  }

  /// 嘗試從圖片 bytes 解析尺寸
  (int, int)? _getImageSize(Uint8List bytes) {
    if (bytes.length < 24) return null;

    // JPEG
    if (bytes[0] == 0xFF && bytes[1] == 0xD8) {
      return _getJpegSize(bytes);
    }

    // PNG
    if (bytes[0] == 0x89 &&
        bytes[1] == 0x50 &&
        bytes[2] == 0x4E &&
        bytes[3] == 0x47) {
      final width = (bytes[16] << 24) |
          (bytes[17] << 16) |
          (bytes[18] << 8) |
          bytes[19];
      final height = (bytes[20] << 24) |
          (bytes[21] << 16) |
          (bytes[22] << 8) |
          bytes[23];
      return (width, height);
    }

    return null;
  }

  /// 解析 JPEG 尺寸
  (int, int)? _getJpegSize(Uint8List bytes) {
    int offset = 2;
    while (offset < bytes.length - 8) {
      if (bytes[offset] != 0xFF) return null;

      final marker = bytes[offset + 1];

      // SOF0, SOF1, SOF2 markers contain image dimensions
      if (marker >= 0xC0 && marker <= 0xC3) {
        final height = (bytes[offset + 5] << 8) | bytes[offset + 6];
        final width = (bytes[offset + 7] << 8) | bytes[offset + 8];
        return (width, height);
      }

      // Skip to next marker
      final length = (bytes[offset + 2] << 8) | bytes[offset + 3];
      offset += 2 + length;
    }
    return null;
  }
}
