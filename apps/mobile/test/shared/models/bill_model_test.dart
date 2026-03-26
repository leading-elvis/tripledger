import 'package:flutter_test/flutter_test.dart';
import 'package:tripledger/shared/models/bill_model.dart';
import '../../fixtures/bill_fixtures.dart';

void main() {
  group('Bill.fromJson - JSON 反序列化', () {
    test('應正確解析完整帳單資料', () {
      final bill = Bill.fromJson(billJsonFixture);

      expect(bill.id, equals('bill-1'));
      expect(bill.tripId, equals('trip-1'));
      expect(bill.payerId, equals('user-1'));
      expect(bill.payerName, equals('小明'));
      expect(bill.payerAvatar, equals('https://example.com/avatar1.jpg'));
      expect(bill.title, equals('晚餐'));
      expect(bill.amount, equals(1000.0));
      expect(bill.category, equals('FOOD'));
      expect(bill.splitType, equals('EQUAL'));
      expect(bill.note, equals('好吃的日本料理'));
      expect(bill.paidAt, isA<DateTime>());
    });

    test('應處理 null 的 receiptImage 和 note', () {
      final bill = Bill.fromJson(minimalBillJsonFixture);

      expect(bill.receiptImage, isNull);
      expect(bill.note, isNull);
    });

    test('應正確解析 shares 列表', () {
      final bill = Bill.fromJson(billJsonFixture);

      expect(bill.shares.length, equals(3));
      expect(bill.shares[0].userId, equals('user-1'));
      expect(bill.shares[0].userName, equals('小明'));
      expect(bill.shares[0].amount, equals(333.34));
      expect(bill.shares[1].amount, equals(333.33));
      expect(bill.shares[2].amount, equals(333.33));
    });

    test('應正確解析 ITEMIZED 的 items', () {
      final bill = Bill.fromJson(itemizedBillJsonFixture);

      expect(bill.items, isNotNull);
      expect(bill.items!.length, equals(2));
      expect(bill.items![0].name, equals('牛排'));
      expect(bill.items![0].amount, equals(600.0));
      expect(bill.items![0].shares.length, equals(2));
      expect(bill.items![1].name, equals('沙拉'));
      expect(bill.items![1].amount, equals(400.0));
    });

    test('應處理金額字串轉數字 (Decimal -> double)', () {
      final bill = Bill.fromJson(integerAmountBillJsonFixture);

      expect(bill.amount, equals(500.0));
      expect(bill.amount, isA<double>());
    });

    test('應正確解析小數金額', () {
      final bill = Bill.fromJson(billJsonFixture);

      // 金額字串 '1000.00' 應轉為 1000.0
      expect(bill.amount, equals(1000.0));

      // shares 的金額也應正確轉換
      expect(bill.shares[0].amount, equals(333.34));
    });

    test('應處理空的 shares 列表', () {
      final bill = Bill.fromJson(minimalBillJsonFixture);

      expect(bill.shares, isEmpty);
    });

    test('應處理 items 為 null', () {
      final bill = Bill.fromJson(billJsonFixture);

      expect(bill.items, isNull);
    });

    test('應正確解析日期', () {
      final bill = Bill.fromJson(billJsonFixture);

      expect(bill.paidAt.year, equals(2024));
      expect(bill.paidAt.month, equals(1));
      expect(bill.paidAt.day, equals(15));
    });
  });

  group('BillShare.fromJson', () {
    test('應正確解析分攤明細', () {
      final shares = billJsonFixture['shares'] as List<dynamic>;
      final shareJson = shares[0] as Map<String, dynamic>;
      final share = BillShare.fromJson(shareJson);

      expect(share.id, equals('share-1'));
      expect(share.billId, equals('bill-1'));
      expect(share.userId, equals('user-1'));
      expect(share.userName, equals('小明'));
      expect(share.userAvatar, equals('https://example.com/avatar1.jpg'));
      expect(share.amount, equals(333.34));
    });

    test('應處理 null 的 userAvatar', () {
      final shares = billJsonFixture['shares'] as List<dynamic>;
      final shareJson = shares[1] as Map<String, dynamic>;
      final share = BillShare.fromJson(shareJson);

      expect(share.userAvatar, isNull);
    });
  });

  group('BillItem.fromJson', () {
    test('應正確解析帳單品項', () {
      final items = itemizedBillJsonFixture['items']! as List<dynamic>;
      final item = BillItem.fromJson(items[0] as Map<String, dynamic>);

      expect(item.id, equals('item-1'));
      expect(item.billId, equals('bill-itemized'));
      expect(item.name, equals('牛排'));
      expect(item.amount, equals(600.0));
      expect(item.shares.length, equals(2));
    });

    test('應正確解析品項的 shares', () {
      final items = itemizedBillJsonFixture['items']! as List<dynamic>;
      final item = BillItem.fromJson(items[0] as Map<String, dynamic>);

      expect(item.shares[0].userId, equals('user-1'));
      expect(item.shares[0].amount, equals(300.0));
      expect(item.shares[1].userId, equals('user-2'));
      expect(item.shares[1].amount, equals(300.0));
    });
  });

  group('BillItemShare.fromJson', () {
    test('應正確解析品項分攤明細', () {
      final items = itemizedBillJsonFixture['items']! as List<dynamic>;
      final itemJson = items[0] as Map<String, dynamic>;
      final shares = itemJson['shares'] as List<dynamic>;
      final itemShare = BillItemShare.fromJson(shares[0] as Map<String, dynamic>);

      expect(itemShare.id, equals('item-share-1'));
      expect(itemShare.billItemId, equals('item-1'));
      expect(itemShare.userId, equals('user-1'));
      expect(itemShare.userName, equals('小明'));
      expect(itemShare.amount, equals(300.0));
    });
  });

  group('BillCategory enum', () {
    test('fromValue 應返回正確的枚舉值', () {
      expect(BillCategory.fromValue('FOOD'), equals(BillCategory.food));
      expect(BillCategory.fromValue('TRANSPORT'), equals(BillCategory.transport));
      expect(BillCategory.fromValue('ACCOMMODATION'), equals(BillCategory.accommodation));
      expect(BillCategory.fromValue('ATTRACTION'), equals(BillCategory.attraction));
      expect(BillCategory.fromValue('SHOPPING'), equals(BillCategory.shopping));
      expect(BillCategory.fromValue('OTHER'), equals(BillCategory.other));
    });

    test('fromValue 無效值應返回 other', () {
      expect(BillCategory.fromValue('INVALID'), equals(BillCategory.other));
      expect(BillCategory.fromValue(''), equals(BillCategory.other));
      expect(BillCategory.fromValue('food'), equals(BillCategory.other)); // 小寫
    });

    test('label 應返回正確的中文標籤', () {
      expect(BillCategory.food.label, equals('餐飲'));
      expect(BillCategory.transport.label, equals('交通'));
      expect(BillCategory.accommodation.label, equals('住宿'));
      expect(BillCategory.attraction.label, equals('景點門票'));
      expect(BillCategory.shopping.label, equals('購物'));
      expect(BillCategory.other.label, equals('其他'));
    });

    test('value 應返回正確的 API 值', () {
      expect(BillCategory.food.value, equals('FOOD'));
      expect(BillCategory.transport.value, equals('TRANSPORT'));
    });
  });

  group('SplitType enum', () {
    test('fromValue 應支援所有 5 種分攤類型', () {
      expect(SplitType.fromValue('EQUAL'), equals(SplitType.equal));
      expect(SplitType.fromValue('EXACT'), equals(SplitType.exact));
      expect(SplitType.fromValue('PERCENTAGE'), equals(SplitType.percentage));
      expect(SplitType.fromValue('SHARES'), equals(SplitType.shares));
      expect(SplitType.fromValue('ITEMIZED'), equals(SplitType.itemized));
    });

    test('fromValue 無效值應返回 equal', () {
      expect(SplitType.fromValue('INVALID'), equals(SplitType.equal));
      expect(SplitType.fromValue(''), equals(SplitType.equal));
    });

    test('label 應返回正確的中文標籤', () {
      expect(SplitType.equal.label, equals('平均分攤'));
      expect(SplitType.exact.label, equals('指定金額'));
      expect(SplitType.percentage.label, equals('百分比'));
      expect(SplitType.shares.label, equals('份數'));
      expect(SplitType.itemized.label, equals('細項分攤'));
    });
  });
}
