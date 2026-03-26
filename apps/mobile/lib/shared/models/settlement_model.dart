class MemberBalance {
  final String? userId;
  final String? virtualMemberId;
  final String userName;
  final String? userAvatar;
  final double paid;
  final double owed;
  final double balance;
  final bool isVirtual;

  MemberBalance({
    this.userId,
    this.virtualMemberId,
    required this.userName,
    this.userAvatar,
    required this.paid,
    required this.owed,
    required this.balance,
    this.isVirtual = false,
  });

  factory MemberBalance.fromJson(Map<String, dynamic> json) {
    return MemberBalance(
      userId: json['userId'],
      virtualMemberId: json['virtualMemberId'],
      userName: json['userName'],
      userAvatar: json['userAvatar'],
      paid: double.parse(json['paid'].toString()),
      owed: double.parse(json['owed'].toString()),
      balance: double.parse(json['balance'].toString()),
      isVirtual: json['isVirtual'] ?? false,
    );
  }
}

class SuggestedSettlement {
  final String? fromUserId;
  final String? fromVirtualMemberId;
  final String fromUserName;
  final String? fromUserAvatar;
  final bool fromIsVirtual;
  final String? toUserId;
  final String? toVirtualMemberId;
  final String toUserName;
  final String? toUserAvatar;
  final bool toIsVirtual;
  final double amount;
  final String currency; // 結算幣種

  SuggestedSettlement({
    this.fromUserId,
    this.fromVirtualMemberId,
    required this.fromUserName,
    this.fromUserAvatar,
    this.fromIsVirtual = false,
    this.toUserId,
    this.toVirtualMemberId,
    required this.toUserName,
    this.toUserAvatar,
    this.toIsVirtual = false,
    required this.amount,
    this.currency = 'TWD',
  });

  factory SuggestedSettlement.fromJson(Map<String, dynamic> json) {
    return SuggestedSettlement(
      fromUserId: json['from']['id'],
      fromVirtualMemberId: json['from']['virtualMemberId'],
      fromUserName: json['from']['name'],
      fromUserAvatar: json['from']['avatarUrl'],
      fromIsVirtual: json['from']['isVirtual'] ?? false,
      toUserId: json['to']['id'],
      toVirtualMemberId: json['to']['virtualMemberId'],
      toUserName: json['to']['name'],
      toUserAvatar: json['to']['avatarUrl'],
      toIsVirtual: json['to']['isVirtual'] ?? false,
      amount: double.parse(json['amount'].toString()),
      currency: json['currency'] ?? 'TWD',
    );
  }
}

class TripSummary {
  final double totalSpent;
  final int billCount;
  final int memberCount;
  final List<MemberBalance> balances;
  final List<SuggestedSettlement> suggestedSettlements;
  final double settledAmount;

  TripSummary({
    required this.totalSpent,
    required this.billCount,
    required this.memberCount,
    required this.balances,
    required this.suggestedSettlements,
    required this.settledAmount,
  });

  factory TripSummary.fromJson(Map<String, dynamic> json) {
    return TripSummary(
      totalSpent: double.parse(json['totalSpent'].toString()),
      billCount: json['billCount'],
      memberCount: json['memberCount'],
      balances: (json['balances'] as List<dynamic>)
          .map((b) => MemberBalance.fromJson(b))
          .toList(),
      suggestedSettlements: (json['suggestedSettlements'] as List<dynamic>)
          .map((s) => SuggestedSettlement.fromJson(s))
          .toList(),
      settledAmount: double.parse(json['settledAmount'].toString()),
    );
  }
}

class Settlement {
  final String id;
  final String tripId;
  final String? payerId;
  final String? virtualPayerId;
  final String payerName;
  final String? payerAvatar;
  final bool payerIsVirtual;
  final String? receiverId;
  final String? virtualReceiverId;
  final String receiverName;
  final String? receiverAvatar;
  final bool receiverIsVirtual;
  final double amount;
  final String currency; // 結算幣種
  final String status;
  final DateTime? settledAt;
  final DateTime createdAt;

  Settlement({
    required this.id,
    required this.tripId,
    this.payerId,
    this.virtualPayerId,
    required this.payerName,
    this.payerAvatar,
    this.payerIsVirtual = false,
    this.receiverId,
    this.virtualReceiverId,
    required this.receiverName,
    this.receiverAvatar,
    this.receiverIsVirtual = false,
    required this.amount,
    this.currency = 'TWD',
    required this.status,
    this.settledAt,
    required this.createdAt,
  });

  factory Settlement.fromJson(Map<String, dynamic> json) {
    final virtualPayer = json['virtualPayer'];
    final virtualReceiver = json['virtualReceiver'];
    return Settlement(
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
      payerIsVirtual: virtualPayer != null,
      receiverId: json['receiverId'],
      virtualReceiverId: json['virtualReceiverId'],
      receiverName: virtualReceiver != null
          ? virtualReceiver['name']
          : json['receiver']['name'],
      receiverAvatar: virtualReceiver != null
          ? null
          : json['receiver']?['avatarUrl'],
      receiverIsVirtual: virtualReceiver != null,
      amount: double.parse(json['amount'].toString()),
      currency: json['currency'] ?? 'TWD',
      status: json['status'],
      settledAt: json['settledAt'] != null
          ? DateTime.parse(json['settledAt']).toLocal()
          : null,
      createdAt: DateTime.parse(json['createdAt']).toLocal(),
    );
  }
}

enum SettlementStatus {
  pending('PENDING', '待確認'),
  confirmed('CONFIRMED', '已確認'),
  cancelled('CANCELLED', '已取消');

  final String value;
  final String label;

  const SettlementStatus(this.value, this.label);

  static SettlementStatus fromValue(String value) {
    return SettlementStatus.values.firstWhere(
      (e) => e.value == value,
      orElse: () => SettlementStatus.pending,
    );
  }
}
