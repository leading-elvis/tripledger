import 'bill_model.dart';
import '../../core/utils/currency_utils.dart';

class Trip {
  final String id;
  final String name;
  final String? description;
  final String? coverImage;
  final String? startDate;
  final String? endDate;
  final String inviteCode;
  final int memberCount;
  final int billCount;
  final Currency defaultCurrency;
  final DateTime createdAt;

  Trip({
    required this.id,
    required this.name,
    this.description,
    this.coverImage,
    this.startDate,
    this.endDate,
    required this.inviteCode,
    required this.memberCount,
    required this.billCount,
    required this.defaultCurrency,
    required this.createdAt,
  });

  factory Trip.fromJson(Map<String, dynamic> json) {
    return Trip(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      coverImage: json['coverImage'],
      startDate: json['startDate'],
      endDate: json['endDate'],
      inviteCode: json['inviteCode'],
      memberCount: json['members']?.length ?? 0,
      billCount: json['_count']?['bills'] ?? 0,
      defaultCurrency: CurrencyUtils.fromString(json['defaultCurrency']) ?? Currency.TWD,
      createdAt: DateTime.parse(json['createdAt']).toLocal(),
    );
  }
}

class TripDetail {
  final String id;
  final String name;
  final String? description;
  final String? coverImage;
  final String? startDate;
  final String? endDate;
  final String inviteCode;
  final List<TripMember> members;
  final List<VirtualMember> virtualMembers;
  final List<Bill> bills;
  final Currency defaultCurrency;
  final DateTime? premiumExpiresAt;
  final DateTime createdAt;

  TripDetail({
    required this.id,
    required this.name,
    this.description,
    this.coverImage,
    this.startDate,
    this.endDate,
    required this.inviteCode,
    required this.members,
    this.virtualMembers = const [],
    required this.bills,
    required this.defaultCurrency,
    this.premiumExpiresAt,
    required this.createdAt,
  });

  bool get isPremium =>
      premiumExpiresAt != null && premiumExpiresAt!.isAfter(DateTime.now());

  factory TripDetail.fromJson(Map<String, dynamic> json) {
    return TripDetail(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      coverImage: json['coverImage'],
      startDate: json['startDate'],
      endDate: json['endDate'],
      inviteCode: json['inviteCode'],
      members: (json['members'] as List<dynamic>)
          .map((m) => TripMember.fromJson(m))
          .toList(),
      virtualMembers: (json['virtualMembers'] as List<dynamic>?)
              ?.map((vm) => VirtualMember.fromJson(vm))
              .toList() ??
          [],
      bills: (json['bills'] as List<dynamic>)
          .map((b) => Bill.fromJson(b))
          .toList(),
      defaultCurrency: CurrencyUtils.fromString(json['defaultCurrency']) ?? Currency.TWD,
      premiumExpiresAt: json['premiumExpiresAt'] != null
          ? DateTime.parse(json['premiumExpiresAt']).toLocal()
          : null,
      createdAt: DateTime.parse(json['createdAt']).toLocal(),
    );
  }
}

class VirtualMember {
  final String id;
  final String tripId;
  final String name;
  final String createdBy;
  final String? mergedTo;
  final DateTime? mergedAt;
  final DateTime createdAt;

  VirtualMember({
    required this.id,
    required this.tripId,
    required this.name,
    required this.createdBy,
    this.mergedTo,
    this.mergedAt,
    required this.createdAt,
  });

  factory VirtualMember.fromJson(Map<String, dynamic> json) {
    return VirtualMember(
      id: json['id'],
      tripId: json['tripId'],
      name: json['name'],
      createdBy: json['createdBy'],
      mergedTo: json['mergedTo'],
      mergedAt: json['mergedAt'] != null
          ? DateTime.parse(json['mergedAt']).toLocal()
          : null,
      createdAt: DateTime.parse(json['createdAt']).toLocal(),
    );
  }
}

/// 統一的參與者抽象（真實成員或虛擬人員）
class Participant {
  final String? userId;
  final String? virtualMemberId;
  final String displayName;
  final String? avatarUrl;
  final bool isVirtual;

  Participant({
    this.userId,
    this.virtualMemberId,
    required this.displayName,
    this.avatarUrl,
    required this.isVirtual,
  });

  String get participantKey =>
      isVirtual ? 'vm_$virtualMemberId' : userId!;

  factory Participant.fromTripMember(TripMember member) {
    return Participant(
      userId: member.userId,
      displayName: member.nickname ?? member.userName,
      avatarUrl: member.userAvatar,
      isVirtual: false,
    );
  }

  factory Participant.fromVirtualMember(VirtualMember vm) {
    return Participant(
      virtualMemberId: vm.id,
      displayName: vm.name,
      isVirtual: true,
    );
  }
}

class TripMember {
  final String id;
  final String tripId;
  final String userId;
  final String role;
  final String? nickname;
  final String userName;
  final String? userAvatar;
  final DateTime joinedAt;

  TripMember({
    required this.id,
    required this.tripId,
    required this.userId,
    required this.role,
    this.nickname,
    required this.userName,
    this.userAvatar,
    required this.joinedAt,
  });

  factory TripMember.fromJson(Map<String, dynamic> json) {
    return TripMember(
      id: json['id'],
      tripId: json['tripId'],
      userId: json['userId'],
      role: json['role'],
      nickname: json['nickname'],
      userName: json['user']['name'],
      userAvatar: json['user']['avatarUrl'],
      joinedAt: DateTime.parse(json['joinedAt']).toLocal(),
    );
  }
}
