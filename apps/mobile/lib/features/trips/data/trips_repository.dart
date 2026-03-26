import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/config/api_config.dart';
import '../../../core/utils/currency_utils.dart';
import '../../../shared/models/trip_model.dart';

final tripsRepositoryProvider = Provider<TripsRepository>((ref) {
  return TripsRepository(apiClient: ref.read(apiClientProvider));
});

class TripsRepository {
  final ApiClient apiClient;

  TripsRepository({required this.apiClient});

  /// 取得用戶所有旅程
  Future<List<Trip>> getTrips() async {
    final response = await apiClient.get(ApiConfig.trips);
    final List<dynamic> data = response.data;
    return data.map((json) => Trip.fromJson(json)).toList();
  }

  /// 取得旅程詳情
  Future<TripDetail> getTripDetail(String tripId) async {
    final response = await apiClient.get('${ApiConfig.trips}/$tripId');
    return TripDetail.fromJson(response.data);
  }

  /// 建立新旅程
  Future<Trip> createTrip({
    required String name,
    String? description,
    String? startDate,
    String? endDate,
    Currency? defaultCurrency,
  }) async {
    final response = await apiClient.post(
      ApiConfig.trips,
      data: {
        'name': name,
        if (description != null) 'description': description,
        if (startDate != null) 'startDate': startDate,
        if (endDate != null) 'endDate': endDate,
        if (defaultCurrency != null) 'defaultCurrency': defaultCurrency.name,
      },
    );
    return Trip.fromJson(response.data);
  }

  /// 更新旅程
  Future<Trip> updateTrip({
    required String tripId,
    String? name,
    String? description,
    String? startDate,
    String? endDate,
    Currency? defaultCurrency,
  }) async {
    final response = await apiClient.put(
      '${ApiConfig.trips}/$tripId',
      data: {
        if (name != null) 'name': name,
        if (description != null) 'description': description,
        if (startDate != null) 'startDate': startDate,
        if (endDate != null) 'endDate': endDate,
        if (defaultCurrency != null) 'defaultCurrency': defaultCurrency.name,
      },
    );
    return Trip.fromJson(response.data);
  }

  /// 刪除旅程
  Future<void> deleteTrip(String tripId) async {
    await apiClient.delete('${ApiConfig.trips}/$tripId');
  }

  /// 透過邀請碼加入旅程
  Future<Trip> joinTrip(String inviteCode) async {
    final response = await apiClient.post(
      '${ApiConfig.trips}/join',
      data: {'inviteCode': inviteCode},
    );
    return Trip.fromJson(response.data);
  }

  /// 離開旅程
  Future<void> leaveTrip(String tripId) async {
    await apiClient.post('${ApiConfig.trips}/$tripId/leave');
  }

  /// 更新成員暱稱
  Future<void> updateMemberNickname({
    required String tripId,
    required String memberId,
    required String nickname,
  }) async {
    await apiClient.put(
      '${ApiConfig.trips}/$tripId/members/$memberId',
      data: {'nickname': nickname},
    );
  }

  /// 更新成員權限
  Future<void> updateMemberRole({
    required String tripId,
    required String memberId,
    required String role,
  }) async {
    await apiClient.put(
      '${ApiConfig.trips}/$tripId/members/$memberId/role',
      data: {'role': role},
    );
  }

  /// 移除成員
  Future<void> removeMember({
    required String tripId,
    required String memberId,
  }) async {
    await apiClient.delete('${ApiConfig.trips}/$tripId/members/$memberId');
  }

  /// 重新產生邀請碼
  Future<String> regenerateInviteCode(String tripId) async {
    final response = await apiClient.post(
      '${ApiConfig.trips}/$tripId/regenerate-invite',
    );
    return response.data['inviteCode'] as String;
  }

  // ============================================
  // 虛擬人員
  // ============================================

  /// 建立虛擬人員
  Future<VirtualMember> createVirtualMember({
    required String tripId,
    required String name,
  }) async {
    final response = await apiClient.post(
      '${ApiConfig.trips}/$tripId/virtual-members',
      data: {'name': name},
    );
    return VirtualMember.fromJson(response.data);
  }

  /// 取得虛擬人員列表
  Future<List<VirtualMember>> getVirtualMembers(String tripId) async {
    final response = await apiClient.get(
      '${ApiConfig.trips}/$tripId/virtual-members',
    );
    final List<dynamic> data = response.data;
    return data.map((json) => VirtualMember.fromJson(json)).toList();
  }

  /// 更新虛擬人員名稱
  Future<VirtualMember> updateVirtualMember({
    required String tripId,
    required String vmId,
    required String name,
  }) async {
    final response = await apiClient.put(
      '${ApiConfig.trips}/$tripId/virtual-members/$vmId',
      data: {'name': name},
    );
    return VirtualMember.fromJson(response.data);
  }

  /// 刪除虛擬人員
  Future<void> deleteVirtualMember({
    required String tripId,
    required String vmId,
  }) async {
    await apiClient.delete(
      '${ApiConfig.trips}/$tripId/virtual-members/$vmId',
    );
  }

  /// 合併虛擬人員到當前用戶
  Future<void> mergeVirtualMember({
    required String tripId,
    required String vmId,
  }) async {
    await apiClient.post(
      '${ApiConfig.trips}/$tripId/virtual-members/$vmId/merge',
    );
  }
}
