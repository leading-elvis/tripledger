import 'package:flutter_test/flutter_test.dart';
import 'package:tripledger/shared/utils/validators.dart';

void main() {
  group('Validators - 基礎驗證器', () {
    group('required', () {
      test('應拒絕 null', () {
        expect(Validators.required(null), isNotNull);
        expect(Validators.required(null), contains('請輸入'));
      });

      test('應拒絕空字串', () {
        expect(Validators.required(''), isNotNull);
      });

      test('應拒絕純空白', () {
        expect(Validators.required('   '), isNotNull);
        expect(Validators.required('\t\n'), isNotNull);
      });

      test('應接受有效字串', () {
        expect(Validators.required('valid'), isNull);
        expect(Validators.required('有效文字'), isNull);
      });

      test('應使用自訂欄位名稱', () {
        final error = Validators.required(null, fieldName: '旅程名稱');
        expect(error, contains('旅程名稱'));
      });
    });

    group('amount', () {
      test('應拒絕 null 和空字串', () {
        expect(Validators.amount(null), isNotNull);
        expect(Validators.amount(''), isNotNull);
      });

      test('應拒絕非數字', () {
        expect(Validators.amount('abc'), isNotNull);
        expect(Validators.amount('12a34'), isNotNull);
        expect(Validators.amount('--100'), isNotNull);
      });

      test('應拒絕負數（預設）', () {
        expect(Validators.amount('-100'), isNotNull);
        expect(Validators.amount('-0.01'), isNotNull);
      });

      test('應拒絕零（預設 allowZero=false）', () {
        expect(Validators.amount('0'), isNotNull);
        expect(Validators.amount('0.00'), isNotNull);
      });

      test('allowZero=true 應接受零', () {
        expect(Validators.amount('0', allowZero: true), isNull);
        expect(Validators.amount('0.00', allowZero: true), isNull);
      });

      test('應檢查 min 限制', () {
        expect(Validators.amount('50', min: 100), isNotNull);
        expect(Validators.amount('99.99', min: 100), isNotNull);
        expect(Validators.amount('100', min: 100), isNull);
      });

      test('應檢查 max 限制', () {
        expect(Validators.amount('150', max: 100), isNotNull);
        expect(Validators.amount('100.01', max: 100), isNotNull);
        expect(Validators.amount('100', max: 100), isNull);
      });

      test('應接受有效金額', () {
        expect(Validators.amount('100'), isNull);
        expect(Validators.amount('99.99'), isNull);
        expect(Validators.amount('0.01'), isNull);
        expect(Validators.amount('1000000'), isNull);
      });
    });

    group('percentage', () {
      test('應拒絕 null 和空字串', () {
        expect(Validators.percentage(null), isNotNull);
        expect(Validators.percentage(''), isNotNull);
      });

      test('應拒絕超過 100', () {
        expect(Validators.percentage('101'), isNotNull);
        expect(Validators.percentage('100.01'), isNotNull);
        expect(Validators.percentage('999'), isNotNull);
      });

      test('應拒絕負數', () {
        expect(Validators.percentage('-1'), isNotNull);
        expect(Validators.percentage('-0.01'), isNotNull);
      });

      test('應拒絕零（預設 allowZero=false）', () {
        expect(Validators.percentage('0'), isNotNull);
      });

      test('allowZero=true 應接受零', () {
        expect(Validators.percentage('0', allowZero: true), isNull);
      });

      test('應接受有效百分比', () {
        expect(Validators.percentage('50'), isNull);
        expect(Validators.percentage('100'), isNull);
        expect(Validators.percentage('33.33'), isNull);
        expect(Validators.percentage('0.01'), isNull);
      });
    });

    group('integer', () {
      test('應拒絕非整數', () {
        expect(Validators.integer('12.5'), isNotNull);
        expect(Validators.integer('abc'), isNotNull);
      });

      test('應檢查 min 限制', () {
        expect(Validators.integer('0', min: 1), isNotNull);
        expect(Validators.integer('1', min: 1), isNull);
      });

      test('應檢查 max 限制', () {
        expect(Validators.integer('11', max: 10), isNotNull);
        expect(Validators.integer('10', max: 10), isNull);
      });

      test('應使用自訂欄位名稱', () {
        final error = Validators.integer('abc', fieldName: '份數');
        expect(error, contains('整數'));
      });
    });

    group('length', () {
      test('應檢查最小長度', () {
        expect(Validators.length('a', min: 2), isNotNull);
        expect(Validators.length('ab', min: 2), isNull);
      });

      test('應檢查最大長度', () {
        expect(Validators.length('abcdef', max: 5), isNotNull);
        expect(Validators.length('abcde', max: 5), isNull);
      });

      test('應接受空值當無 min 限制', () {
        expect(Validators.length('', max: 100), isNull);
        expect(Validators.length(null, max: 100), isNull);
      });

      test('空值且有 min 限制時應拒絕', () {
        expect(Validators.length('', min: 1), isNotNull);
      });
    });

    group('inviteCode', () {
      test('應拒絕空值', () {
        expect(Validators.inviteCode(null), isNotNull);
        expect(Validators.inviteCode(''), isNotNull);
        expect(Validators.inviteCode('   '), isNotNull);
      });

      test('應拒絕過短的邀請碼', () {
        expect(Validators.inviteCode('ABC12'), isNotNull); // 5 位
      });

      test('應拒絕過長的邀請碼', () {
        expect(Validators.inviteCode('ABCDEFGHI'), isNotNull); // 9 位
      });

      test('應拒絕包含特殊字元', () {
        expect(Validators.inviteCode('ABC-123'), isNotNull);
        expect(Validators.inviteCode('ABC@123'), isNotNull);
        expect(Validators.inviteCode('ABC 123'), isNotNull);
      });

      test('應接受有效邀請碼', () {
        expect(Validators.inviteCode('ABC123'), isNull);
        expect(Validators.inviteCode('TOKYO23'), isNull);
        expect(Validators.inviteCode('12345678'), isNull);
      });

      test('應接受小寫（自動轉大寫）', () {
        expect(Validators.inviteCode('abc123'), isNull);
      });
    });

    group('combine', () {
      test('應依序執行驗證器', () {
        final validator = Validators.combine([
          (v) => Validators.required(v),
          (v) => Validators.length(v, min: 3),
        ]);

        expect(validator(null), contains('請輸入'));
        expect(validator('ab'), contains('字元'));
        expect(validator('abc'), isNull);
      });

      test('應在第一個錯誤時停止', () {
        var secondCalled = false;
        final validator = Validators.combine([
          (v) => 'First error',
          (v) {
            secondCalled = true;
            return null;
          },
        ]);

        validator('test');
        expect(secondCalled, isFalse);
      });
    });
  });

  group('BillValidators - 帳單驗證器', () {
    group('title', () {
      test('應拒絕空標題', () {
        expect(BillValidators.title(null), isNotNull);
        expect(BillValidators.title(''), isNotNull);
      });

      test('應拒絕過長標題', () {
        final longTitle = 'a' * 101;
        expect(BillValidators.title(longTitle), isNotNull);
      });

      test('應接受有效標題', () {
        expect(BillValidators.title('晚餐'), isNull);
        expect(BillValidators.title('日本旅遊第一天午餐'), isNull);
      });
    });

    group('amount', () {
      test('應拒絕過小金額', () {
        expect(BillValidators.amount('0'), isNotNull);
        expect(BillValidators.amount('0.5'), isNotNull);
      });

      test('應拒絕過大金額', () {
        expect(BillValidators.amount('10000001'), isNotNull);
      });

      test('應接受有效金額', () {
        expect(BillValidators.amount('1'), isNull);
        expect(BillValidators.amount('10000000'), isNull);
        expect(BillValidators.amount('1234.56'), isNull);
      });
    });

    group('note', () {
      test('應接受空備註', () {
        expect(BillValidators.note(null), isNull);
        expect(BillValidators.note(''), isNull);
      });

      test('應拒絕過長備註', () {
        final longNote = 'a' * 501;
        expect(BillValidators.note(longNote), isNotNull);
      });
    });

    group('exactAmountTotal', () {
      test('應拒絕總和與帳單金額不符', () {
        final error = BillValidators.exactAmountTotal(
          totalAmount: 1000,
          exactAmounts: {'a': 300, 'b': 300},
          selectedMemberIds: {'a', 'b'},
        );
        expect(error, isNotNull);
        expect(error, contains('不符'));
      });

      test('應接受總和與帳單金額相符', () {
        final error = BillValidators.exactAmountTotal(
          totalAmount: 1000,
          exactAmounts: {'a': 500, 'b': 300, 'c': 200},
          selectedMemberIds: {'a', 'b', 'c'},
        );
        expect(error, isNull);
      });

      test('應接受微小誤差（0.01 以內）', () {
        final error = BillValidators.exactAmountTotal(
          totalAmount: 1000,
          exactAmounts: {'a': 500.005, 'b': 500.005},
          selectedMemberIds: {'a', 'b'},
        );
        expect(error, isNull);
      });

      test('應只計算選中成員的金額', () {
        final error = BillValidators.exactAmountTotal(
          totalAmount: 1000,
          exactAmounts: {'a': 500, 'b': 500, 'c': 200},
          selectedMemberIds: {'a', 'b'}, // c 未選中
        );
        expect(error, isNull);
      });
    });

    group('percentageTotal', () {
      test('應拒絕總和不等於 100%', () {
        final error = BillValidators.percentageTotal(
          percentages: {'a': 50, 'b': 40},
          selectedMemberIds: {'a', 'b'},
        );
        expect(error, isNotNull);
        expect(error, contains('100%'));
      });

      test('應接受總和等於 100%', () {
        final error = BillValidators.percentageTotal(
          percentages: {'a': 50, 'b': 30, 'c': 20},
          selectedMemberIds: {'a', 'b', 'c'},
        );
        expect(error, isNull);
      });

      test('應接受微小誤差', () {
        final error = BillValidators.percentageTotal(
          percentages: {'a': 33.33, 'b': 33.33, 'c': 33.34},
          selectedMemberIds: {'a', 'b', 'c'},
        );
        expect(error, isNull);
      });
    });
  });

  group('TripValidators - 旅程驗證器', () {
    group('name', () {
      test('應拒絕空名稱', () {
        expect(TripValidators.name(null), isNotNull);
        expect(TripValidators.name(''), isNotNull);
      });

      test('應拒絕過長名稱', () {
        final longName = 'a' * 51;
        expect(TripValidators.name(longName), isNotNull);
      });

      test('應接受有效名稱', () {
        expect(TripValidators.name('東京旅行'), isNull);
        expect(TripValidators.name('2024 大阪五日遊'), isNull);
      });
    });

    group('description', () {
      test('應接受空描述', () {
        expect(TripValidators.description(null), isNull);
        expect(TripValidators.description(''), isNull);
      });

      test('應拒絕過長描述', () {
        final longDesc = 'a' * 201;
        expect(TripValidators.description(longDesc), isNotNull);
      });
    });

    group('inviteCode', () {
      test('應使用通用邀請碼驗證', () {
        expect(TripValidators.inviteCode('ABC123'), isNull);
        expect(TripValidators.inviteCode('ABC'), isNotNull);
      });
    });
  });
}
