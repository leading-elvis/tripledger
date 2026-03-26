import 'package:flutter_test/flutter_test.dart';
import 'package:tripledger/features/ocr/domain/ocr_result_model.dart';
import 'package:tripledger/features/ocr/providers/ocr_provider.dart';

// ============================
// OcrScanState 測試
// ============================
void main() {
  group('OcrScanState', () {
    test('初始狀態應為 idle', () {
      const state = OcrScanState();
      expect(state.status, OcrScanStatus.idle);
      expect(state.localResult, isNull);
      expect(state.serverResult, isNull);
      expect(state.errorMessage, isNull);
      expect(state.qualityResult, isNull);
    });

    test('copyWith 應正確複製狀態', () {
      const state = OcrScanState();
      final updated = state.copyWith(status: OcrScanStatus.scanning);

      expect(updated.status, OcrScanStatus.scanning);
      expect(updated.localResult, isNull); // 未改變的欄位保持原值
    });

    test('copyWith 應正確設置 serverResult', () {
      const state = OcrScanState();
      const mockResult = OcrResult(
        companyName: '7-ELEVEN',
        brandName: '7-ELEVEN',
        amount: 150,
        confidence: 0.85,
        rawText: '測試文字',
      );

      final updated = state.copyWith(
        status: OcrScanStatus.success,
        serverResult: mockResult,
      );

      expect(updated.status, OcrScanStatus.success);
      expect(updated.serverResult, isNotNull);
      expect(updated.serverResult!.brandName, '7-ELEVEN');
      expect(updated.serverResult!.amount, 150);
    });

    test('copyWith errorMessage 為 null 時應清除錯誤', () {
      final stateWithError = const OcrScanState().copyWith(
        status: OcrScanStatus.error,
        errorMessage: '發生錯誤',
      );
      expect(stateWithError.errorMessage, '發生錯誤');

      final cleared = stateWithError.copyWith(
        status: OcrScanStatus.idle,
      );
      // errorMessage 在 copyWith 中如果未傳值會變 null（因為原始碼用 errorMessage: errorMessage）
      expect(cleared.errorMessage, isNull);
    });
  });

  // ============================
  // OcrScanStatus 列舉測試
  // ============================
  group('OcrScanStatus', () {
    test('應包含所有預期狀態', () {
      expect(OcrScanStatus.values, contains(OcrScanStatus.idle));
      expect(OcrScanStatus.values, contains(OcrScanStatus.scanning));
      expect(OcrScanStatus.values, contains(OcrScanStatus.parsing));
      expect(OcrScanStatus.values, contains(OcrScanStatus.success));
      expect(OcrScanStatus.values, contains(OcrScanStatus.error));
      expect(OcrScanStatus.values.length, 5);
    });
  });

  // ============================
  // OcrResult model 測試
  // ============================
  group('OcrResult', () {
    test('應正確建立含多語言欄位的 OcrResult', () {
      const result = OcrResult(
        companyName: 'マツモトキヨシ',
        brandName: 'マツモトキヨシ',
        amount: 11574,
        confidence: 0.85,
        rawText: '合計 ¥11,574',
        detectedLanguage: 'ja',
        currencyResult: CurrencyDetectionResult(
          currency: 'JPY',
          confidence: 0.9,
        ),
      );

      expect(result.detectedLanguage, 'ja');
      expect(result.currencyResult, isNotNull);
      expect(result.currencyResult!.currency, 'JPY');
      expect(result.currencyResult!.confidence, 0.9);
    });

    test('detectedLanguage 和 currencyResult 應為可選', () {
      final result = OcrResult(
        companyName: '全家便利商店',
        amount: 150,
        confidence: 0.9,
        rawText: r'合計 $150',
      );

      expect(result.detectedLanguage, isNull);
      expect(result.currencyResult, isNull);
    });

    test('應正確序列化/反序列化 JSON', () {
      final json = {
        'companyName': 'ココカラファイン',
        'brandName': 'ココカラファイン',
        'amount': 30813,
        'confidence': 0.88,
        'rawText': '合計 ¥30,813',
        'detectedLanguage': 'ja',
        'currencyResult': {
          'currency': 'JPY',
          'confidence': 0.9,
        },
      };

      final result = OcrResult.fromJson(json);
      expect(result.companyName, 'ココカラファイン');
      expect(result.amount, 30813);
      expect(result.detectedLanguage, 'ja');
      expect(result.currencyResult!.currency, 'JPY');
    });

    test('JSON 缺少可選欄位時應正常解析', () {
      final json = {
        'confidence': 0.5,
        'rawText': '某些文字',
      };

      final result = OcrResult.fromJson(json);
      expect(result.companyName, isNull);
      expect(result.amount, isNull);
      expect(result.detectedLanguage, isNull);
      expect(result.currencyResult, isNull);
    });
  });

  // ============================
  // CurrencyDetectionResult 測試
  // ============================
  group('CurrencyDetectionResult', () {
    test('應正確建立', () {
      const result = CurrencyDetectionResult(
        currency: 'KRW',
        confidence: 0.95,
      );

      expect(result.currency, 'KRW');
      expect(result.confidence, 0.95);
    });

    test('confidence 預設為 0', () {
      const result = CurrencyDetectionResult(currency: 'THB');
      expect(result.confidence, 0);
    });

    test('應正確序列化/反序列化 JSON', () {
      final json = {'currency': 'JPY', 'confidence': 0.9};
      final result = CurrencyDetectionResult.fromJson(json);
      expect(result.currency, 'JPY');
      expect(result.confidence, 0.9);
    });
  });

  // ============================
  // LocalOcrResult 測試
  // ============================
  group('LocalOcrResult', () {
    test('應正確建立', () {
      final result = LocalOcrResult(
        fullText: '7-ELEVEN\n合計 NT150',
        blocks: [
          TextBlockInfo(text: '7-ELEVEN', confidence: 0.95),
          TextBlockInfo(text: '合計 NT150', confidence: 0.88),
        ],
      );

      expect(result.fullText, '7-ELEVEN\n合計 NT150');
      expect(result.blocks.length, 2);
      expect(result.blocks[0].text, '7-ELEVEN');
    });

    test('blocks 預設為空列表', () {
      const result = LocalOcrResult(fullText: '');
      expect(result.blocks, isEmpty);
    });
  });
}
