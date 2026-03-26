import 'package:equatable/equatable.dart';
import '../../core/utils/currency_utils.dart';

/// 通知類型
enum NotificationType {
  newBill('NEW_BILL', '新帳單'),
  billUpdated('BILL_UPDATED', '帳單更新'),
  billDeleted('BILL_DELETED', '帳單刪除'),
  settlementRequest('SETTLEMENT_REQUEST', '結算請求'),
  settlementConfirmed('SETTLEMENT_CONFIRMED', '結算確認'),
  memberJoined('MEMBER_JOINED', '成員加入'),
  memberLeft('MEMBER_LEFT', '成員離開'),
  tripInvite('TRIP_INVITE', '旅程邀請'),
  reminder('REMINDER', '提醒');

  final String value;
  final String label;

  const NotificationType(this.value, this.label);

  static NotificationType fromValue(String value) {
    return NotificationType.values.firstWhere(
      (e) => e.value == value,
      orElse: () => NotificationType.reminder,
    );
  }
}

/// 通知模型
class AppNotification extends Equatable {
  final String id;
  final NotificationType type;
  final String title;
  final String message;
  final String? tripId;
  final String? tripName;
  final String? billId;
  final String? settlementId;
  final String? fromUserId;
  final String? fromUserName;
  final double? amount;
  final Currency? currency;
  final bool isRead;
  final DateTime createdAt;

  const AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.message,
    this.tripId,
    this.tripName,
    this.billId,
    this.settlementId,
    this.fromUserId,
    this.fromUserName,
    this.amount,
    this.currency,
    this.isRead = false,
    required this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'] as String,
      type: NotificationType.fromValue(json['type'] as String),
      title: json['title'] as String,
      message: json['message'] as String,
      tripId: json['tripId'] as String?,
      tripName: json['tripName'] as String?,
      billId: json['billId'] as String?,
      settlementId: json['settlementId'] as String?,
      fromUserId: json['fromUserId'] as String?,
      fromUserName: json['fromUserName'] as String?,
      amount: json['amount'] != null ? (json['amount'] as num).toDouble() : null,
      currency: CurrencyUtils.fromString(json['currency'] as String?),
      isRead: json['isRead'] as bool? ?? false,
      createdAt: DateTime.parse(json['createdAt'] as String).toLocal(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.value,
      'title': title,
      'message': message,
      'tripId': tripId,
      'tripName': tripName,
      'billId': billId,
      'settlementId': settlementId,
      'fromUserId': fromUserId,
      'fromUserName': fromUserName,
      'amount': amount,
      'currency': currency?.name,
      'isRead': isRead,
      'createdAt': createdAt.toIso8601String(),
    };
  }

  AppNotification copyWith({
    String? id,
    NotificationType? type,
    String? title,
    String? message,
    String? tripId,
    String? tripName,
    String? billId,
    String? settlementId,
    String? fromUserId,
    String? fromUserName,
    double? amount,
    Currency? currency,
    bool? isRead,
    DateTime? createdAt,
  }) {
    return AppNotification(
      id: id ?? this.id,
      type: type ?? this.type,
      title: title ?? this.title,
      message: message ?? this.message,
      tripId: tripId ?? this.tripId,
      tripName: tripName ?? this.tripName,
      billId: billId ?? this.billId,
      settlementId: settlementId ?? this.settlementId,
      fromUserId: fromUserId ?? this.fromUserId,
      fromUserName: fromUserName ?? this.fromUserName,
      amount: amount ?? this.amount,
      currency: currency ?? this.currency,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  List<Object?> get props => [
        id,
        type,
        title,
        message,
        tripId,
        tripName,
        billId,
        settlementId,
        fromUserId,
        fromUserName,
        amount,
        currency,
        isRead,
        createdAt,
      ];
}
