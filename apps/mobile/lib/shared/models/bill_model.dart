import '../../core/utils/currency_utils.dart';

class Bill {
  final String id;
  final String tripId;
  final String? payerId;
  final String? virtualPayerId;
  final String payerName;
  final String? payerAvatar;
  final String title;
  final double amount;
  final String category;
  final String splitType;
  final String? receiptImage;
  final String? note;
  final DateTime paidAt;
  final List<BillShare> shares;
  final List<BillItem>? items;
  // 多國貨幣支援
  final Currency currency;
  final double? exchangeRate;
  final double? baseAmount;

  Bill({
    required this.id,
    required this.tripId,
    this.payerId,
    this.virtualPayerId,
    required this.payerName,
    this.payerAvatar,
    required this.title,
    required this.amount,
    required this.category,
    required this.splitType,
    this.receiptImage,
    this.note,
    required this.paidAt,
    required this.shares,
    this.items,
    required this.currency,
    this.exchangeRate,
    this.baseAmount,
  });

  bool get isVirtualPayer => virtualPayerId != null;

  factory Bill.fromJson(Map<String, dynamic> json) {
    final virtualPayer = json['virtualPayer'];
    return Bill(
      id: json['id'],
      tripId: json['tripId'],
      payerId: json['payerId'],
      virtualPayerId: json['virtualPayerId'],
      payerName: virtualPayer != null
          ? virtualPayer['name']
          : json['payer']['name'],
      payerAvatar: virtualPayer != null
          ? null
          : json['payer']?['avatarUrl'],
      title: json['title'],
      amount: double.parse(json['amount'].toString()),
      category: json['category'],
      splitType: json['splitType'],
      receiptImage: json['receiptImage'],
      note: json['note'],
      paidAt: DateTime.parse(json['paidAt']).toLocal(),
      shares: (json['shares'] as List<dynamic>?)
              ?.map((s) => BillShare.fromJson(s))
              .toList() ??
          [],
      items: (json['items'] as List<dynamic>?)
              ?.map((i) => BillItem.fromJson(i))
              .toList(),
      currency: CurrencyUtils.fromString(json['currency']) ?? Currency.TWD,
      exchangeRate: json['exchangeRate'] != null
          ? double.parse(json['exchangeRate'].toString())
          : null,
      baseAmount: json['baseAmount'] != null
          ? double.parse(json['baseAmount'].toString())
          : null,
    );
  }
}

class BillShare {
  final String id;
  final String billId;
  final String? userId;
  final String? virtualMemberId;
  final String userName;
  final String? userAvatar;
  final double amount;
  final bool isVirtual;

  BillShare({
    required this.id,
    required this.billId,
    this.userId,
    this.virtualMemberId,
    required this.userName,
    this.userAvatar,
    required this.amount,
    this.isVirtual = false,
  });

  factory BillShare.fromJson(Map<String, dynamic> json) {
    final virtualMember = json['virtualMember'];
    return BillShare(
      id: json['id'],
      billId: json['billId'],
      userId: json['userId'],
      virtualMemberId: json['virtualMemberId'],
      userName: virtualMember != null
          ? virtualMember['name']
          : json['user']['name'],
      userAvatar: virtualMember != null
          ? null
          : json['user']?['avatarUrl'],
      amount: double.parse(json['amount'].toString()),
      isVirtual: virtualMember != null,
    );
  }
}

/// 帳單細項
class BillItem {
  final String id;
  final String billId;
  final String name;
  final double amount;
  final List<BillItemShare> shares;

  BillItem({
    required this.id,
    required this.billId,
    required this.name,
    required this.amount,
    required this.shares,
  });

  factory BillItem.fromJson(Map<String, dynamic> json) {
    return BillItem(
      id: json['id'],
      billId: json['billId'],
      name: json['name'],
      amount: double.parse(json['amount'].toString()),
      shares: (json['shares'] as List<dynamic>?)
              ?.map((s) => BillItemShare.fromJson(s))
              .toList() ??
          [],
    );
  }
}

/// 細項分攤明細
class BillItemShare {
  final String id;
  final String billItemId;
  final String? userId;
  final String? virtualMemberId;
  final String userName;
  final String? userAvatar;
  final double amount;
  final bool isVirtual;

  BillItemShare({
    required this.id,
    required this.billItemId,
    this.userId,
    this.virtualMemberId,
    required this.userName,
    this.userAvatar,
    required this.amount,
    this.isVirtual = false,
  });

  factory BillItemShare.fromJson(Map<String, dynamic> json) {
    final virtualMember = json['virtualMember'];
    return BillItemShare(
      id: json['id'],
      billItemId: json['billItemId'],
      userId: json['userId'],
      virtualMemberId: json['virtualMemberId'],
      userName: virtualMember != null
          ? virtualMember['name']
          : json['user']['name'],
      userAvatar: virtualMember != null
          ? null
          : json['user']?['avatarUrl'],
      amount: double.parse(json['amount'].toString()),
      isVirtual: virtualMember != null,
    );
  }
}

enum BillCategory {
  food('FOOD', '餐飲'),
  transport('TRANSPORT', '交通'),
  accommodation('ACCOMMODATION', '住宿'),
  attraction('ATTRACTION', '景點門票'),
  shopping('SHOPPING', '購物'),
  other('OTHER', '其他');

  final String value;
  final String label;

  const BillCategory(this.value, this.label);

  static BillCategory fromValue(String value) {
    return BillCategory.values.firstWhere(
      (e) => e.value == value,
      orElse: () => BillCategory.other,
    );
  }
}

enum SplitType {
  equal('EQUAL', '平均分攤'),
  exact('EXACT', '指定金額'),
  percentage('PERCENTAGE', '百分比'),
  shares('SHARES', '份數'),
  itemized('ITEMIZED', '細項分攤');

  final String value;
  final String label;

  const SplitType(this.value, this.label);

  static SplitType fromValue(String value) {
    return SplitType.values.firstWhere(
      (e) => e.value == value,
      orElse: () => SplitType.equal,
    );
  }
}
