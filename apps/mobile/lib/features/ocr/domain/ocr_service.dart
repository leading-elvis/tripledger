import 'dart:io';
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

import 'ocr_result_model.dart';

/// OCR 本地文字辨識服務
///
/// 使用 Google ML Kit 進行本地端 OCR 辨識
class OcrService {
  /// 中文文字辨識器
  final TextRecognizer _textRecognizer = TextRecognizer(
    script: TextRecognitionScript.chinese,
  );

  /// 辨識圖片中的文字
  ///
  /// [imageFile] 要辨識的圖片檔案
  /// 返回辨識結果，包含完整文字和各區塊資訊
  Future<LocalOcrResult> recognizeText(File imageFile) async {
    final inputImage = InputImage.fromFile(imageFile);
    final recognizedText = await _textRecognizer.processImage(inputImage);

    final blocks = recognizedText.blocks.map((block) {
      final rect = block.boundingBox;

      // 計算區塊信心度：取所有元素的平均信心度
      double blockConfidence = 0.8; // 預設值
      int elementCount = 0;
      double totalConfidence = 0;

      for (final line in block.lines) {
        for (final element in line.elements) {
          // ML Kit 的 confidence 可能為 null，若有值則累加
          if (element.confidence != null) {
            totalConfidence += element.confidence!;
            elementCount++;
          }
        }
      }

      if (elementCount > 0) {
        blockConfidence = totalConfidence / elementCount;
      }

      return TextBlockInfo(
        text: block.text,
        boundingBox: [
          rect.left,
          rect.top,
          rect.right,
          rect.bottom,
        ],
        confidence: blockConfidence,
      );
    }).toList();

    return LocalOcrResult(
      fullText: recognizedText.text,
      blocks: blocks,
    );
  }

  /// 從辨識文字中提取金額
  ///
  /// 支援格式：NT$100, $100, 100元, 總計 100
  int? parseAmount(String text) {
    final patterns = [
      // 優先匹配「總計」等關鍵字
      RegExp(r'(?:總[計額金]|合[計總]|實付|應付|小計)[:：]?\s*(?:NT\$?)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', caseSensitive: false),
      RegExp(r'NT\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)'),
      RegExp(r'\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)'),
      RegExp(r'(\d{1,3}(?:,\d{3})*)\s*元'),
    ];

    for (final pattern in patterns) {
      final match = pattern.firstMatch(text);
      if (match != null) {
        final amountStr = match.group(1)!.replaceAll(',', '');
        final amount = double.tryParse(amountStr);
        if (amount != null && amount >= 1 && amount <= 10000000) {
          return amount.round();
        }
      }
    }

    return null;
  }

  /// 從辨識文字中提取日期
  ///
  /// 支援格式：2026/01/29, 2026-01-29, 115/01/29 (民國年)
  DateTime? parseDate(String text) {
    final now = DateTime.now();

    // 西元年格式
    final westernPatterns = [
      RegExp(r'(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})'),
      RegExp(r'(\d{4})年(\d{1,2})月(\d{1,2})日'),
    ];

    for (final pattern in westernPatterns) {
      final match = pattern.firstMatch(text);
      if (match != null) {
        final year = int.parse(match.group(1)!);
        final month = int.parse(match.group(2)!);
        final day = int.parse(match.group(3)!);

        if (_isValidDate(year, month, day, now)) {
          return DateTime(year, month, day);
        }
      }
    }

    // 民國年格式
    final rocPatterns = [
      RegExp(r'(\d{2,3})[/\-.](\d{1,2})[/\-.](\d{1,2})'),
      RegExp(r'(\d{2,3})年(\d{1,2})月(\d{1,2})日'),
    ];

    for (final pattern in rocPatterns) {
      final match = pattern.firstMatch(text);
      if (match != null) {
        var year = int.parse(match.group(1)!);
        final month = int.parse(match.group(2)!);
        final day = int.parse(match.group(3)!);

        // 民國年轉西元年
        if (year < 200) {
          year += 1911;
        }

        if (_isValidDate(year, month, day, now)) {
          return DateTime(year, month, day);
        }
      }
    }

    return null;
  }

  /// 驗證日期是否合理
  bool _isValidDate(int year, int month, int day, DateTime now) {
    if (year < 2020 || year > now.year + 1) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;

    try {
      final date = DateTime(year, month, day);
      return date.isBefore(now.add(const Duration(days: 1)));
    } catch (_) {
      return false;
    }
  }

  /// 釋放資源
  void dispose() {
    _textRecognizer.close();
  }
}
