import 'package:flutter_test/flutter_test.dart';
import 'package:tripledger/shared/models/settlement_model.dart';
import '../../fixtures/settlement_fixtures.dart';

void main() {
  group('MemberBalance.fromJson', () {
    test('應正確解析成員餘額資料', () {
      final balance = MemberBalance.fromJson(memberBalanceJsonFixture);

      expect(balance.userId, equals('user-1'));
      expect(balance.userName, equals('小明'));
      expect(balance.userAvatar, equals('https://example.com/avatar.jpg'));
      expect(balance.paid, equals(1500.0));
      expect(balance.owed, equals(666.67));
      expect(balance.balance, equals(833.33));
    });

    test('應正確解析負餘額', () {
      final balance = MemberBalance.fromJson(negativeBalanceJsonFixture);

      expect(balance.balance, equals(-500.0));
      expect(balance.balance, isNegative);
    });

    test('應處理 null 的 userAvatar', () {
      final balance = MemberBalance.fromJson(negativeBalanceJsonFixture);

      expect(balance.userAvatar, isNull);
    });

    test('應正確轉換金額字串為 double', () {
      final balance = MemberBalance.fromJson(memberBalanceJsonFixture);

      expect(balance.paid, isA<double>());
      expect(balance.owed, isA<double>());
      expect(balance.balance, isA<double>());
    });
  });

  group('SuggestedSettlement.fromJson', () {
    test('應正確解析建議結算資料', () {
      final settlement = SuggestedSettlement.fromJson(suggestedSettlementJsonFixture);

      expect(settlement.fromUserId, equals('user-2'));
      expect(settlement.fromUserName, equals('小華'));
      expect(settlement.fromUserAvatar, isNull);
      expect(settlement.toUserId, equals('user-1'));
      expect(settlement.toUserName, equals('小明'));
      expect(settlement.toUserAvatar, equals('https://example.com/avatar.jpg'));
      expect(settlement.amount, equals(500.0));
    });

    test('應正確解析巢狀的 from 和 to 物件', () {
      final settlement = SuggestedSettlement.fromJson(suggestedSettlementJsonFixture);

      // 驗證從巢狀物件正確提取資料
      expect(settlement.fromUserName, equals('小華'));
      expect(settlement.toUserName, equals('小明'));
    });
  });

  group('TripSummary.fromJson', () {
    test('應正確解析旅程總結資料', () {
      final summary = TripSummary.fromJson(tripSummaryJsonFixture);

      expect(summary.totalSpent, equals(5000.0));
      expect(summary.billCount, equals(10));
      expect(summary.memberCount, equals(3));
      expect(summary.settledAmount, equals(500.0));
    });

    test('應正確解析 balances 列表', () {
      final summary = TripSummary.fromJson(tripSummaryJsonFixture);

      expect(summary.balances.length, equals(3));
      expect(summary.balances[0].userName, equals('小明'));
      expect(summary.balances[0].balance, equals(1333.33));
      expect(summary.balances[1].balance, equals(-166.67));
      expect(summary.balances[2].balance, equals(-1166.66));
    });

    test('應正確解析 suggestedSettlements 列表', () {
      final summary = TripSummary.fromJson(tripSummaryJsonFixture);

      expect(summary.suggestedSettlements.length, equals(2));
      expect(summary.suggestedSettlements[0].fromUserName, equals('小美'));
      expect(summary.suggestedSettlements[0].toUserName, equals('小明'));
      expect(summary.suggestedSettlements[0].amount, equals(1166.66));
    });

    test('應正確轉換所有數值字串', () {
      final summary = TripSummary.fromJson(tripSummaryJsonFixture);

      expect(summary.totalSpent, isA<double>());
      expect(summary.settledAmount, isA<double>());
    });
  });

  group('Settlement.fromJson', () {
    test('應正確解析 PENDING 狀態的結算記錄', () {
      final settlement = Settlement.fromJson(pendingSettlementJsonFixture);

      expect(settlement.id, equals('settlement-1'));
      expect(settlement.tripId, equals('trip-1'));
      expect(settlement.payerId, equals('user-2'));
      expect(settlement.payerName, equals('小華'));
      expect(settlement.payerAvatar, isNull);
      expect(settlement.receiverId, equals('user-1'));
      expect(settlement.receiverName, equals('小明'));
      expect(settlement.receiverAvatar, equals('https://example.com/avatar.jpg'));
      expect(settlement.amount, equals(500.0));
      expect(settlement.status, equals('PENDING'));
      expect(settlement.settledAt, isNull);
      expect(settlement.createdAt, isA<DateTime>());
    });

    test('應正確解析 CONFIRMED 狀態的結算記錄', () {
      final settlement = Settlement.fromJson(confirmedSettlementJsonFixture);

      expect(settlement.status, equals('CONFIRMED'));
      expect(settlement.settledAt, isNotNull);
      expect(settlement.settledAt!.year, equals(2024));
      expect(settlement.settledAt!.month, equals(1));
      expect(settlement.settledAt!.day, equals(21));
    });

    test('應正確解析巢狀的 payer 和 receiver 物件', () {
      final settlement = Settlement.fromJson(pendingSettlementJsonFixture);

      expect(settlement.payerName, equals('小華'));
      expect(settlement.receiverName, equals('小明'));
    });

    test('應處理整數金額字串', () {
      final settlement = Settlement.fromJson(integerAmountSettlementJsonFixture);

      expect(settlement.amount, equals(1000.0));
      expect(settlement.amount, isA<double>());
    });

    test('應處理小數金額字串', () {
      final settlement = Settlement.fromJson(confirmedSettlementJsonFixture);

      expect(settlement.amount, equals(300.5));
    });

    test('應正確解析日期時間', () {
      final settlement = Settlement.fromJson(pendingSettlementJsonFixture);

      expect(settlement.createdAt.year, equals(2024));
      expect(settlement.createdAt.month, equals(1));
      expect(settlement.createdAt.day, equals(20));
      expect(settlement.createdAt.hour, equals(10));
    });
  });

  group('SettlementStatus enum', () {
    test('fromValue 應返回正確的枚舉值', () {
      expect(SettlementStatus.fromValue('PENDING'), equals(SettlementStatus.pending));
      expect(SettlementStatus.fromValue('CONFIRMED'), equals(SettlementStatus.confirmed));
      expect(SettlementStatus.fromValue('CANCELLED'), equals(SettlementStatus.cancelled));
    });

    test('fromValue 無效值應返回 pending', () {
      expect(SettlementStatus.fromValue('INVALID'), equals(SettlementStatus.pending));
      expect(SettlementStatus.fromValue(''), equals(SettlementStatus.pending));
    });

    test('label 應返回正確的中文標籤', () {
      expect(SettlementStatus.pending.label, equals('待確認'));
      expect(SettlementStatus.confirmed.label, equals('已確認'));
      expect(SettlementStatus.cancelled.label, equals('已取消'));
    });

    test('value 應返回正確的 API 值', () {
      expect(SettlementStatus.pending.value, equals('PENDING'));
      expect(SettlementStatus.confirmed.value, equals('CONFIRMED'));
      expect(SettlementStatus.cancelled.value, equals('CANCELLED'));
    });
  });
}
