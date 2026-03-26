import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/config/api_config.dart';
import '../../../shared/models/settlement_model.dart';

final settlementRepositoryProvider = Provider<SettlementRepository>((ref) {
  return SettlementRepository(apiClient: ref.read(apiClientProvider));
});

class SettlementRepository {
  final ApiClient apiClient;

  SettlementRepository({required this.apiClient});

  /// 取得旅程成員餘額
  Future<List<MemberBalance>> getBalances(String tripId) async {
    final response = await apiClient.get('${ApiConfig.trips}/$tripId/balances');
    final List<dynamic> data = response.data;
    return data.map((json) => MemberBalance.fromJson(json)).toList();
  }

  /// 取得建議的結算方式
  Future<List<SuggestedSettlement>> getSuggestedSettlements(String tripId) async {
    final response = await apiClient.get('${ApiConfig.trips}/$tripId${ApiConfig.settlements}/suggested');
    final List<dynamic> data = response.data;
    return data.map((json) => SuggestedSettlement.fromJson(json)).toList();
  }

  /// 取得旅程結算總結
  Future<TripSummary> getTripSummary(String tripId) async {
    final response = await apiClient.get('${ApiConfig.trips}/$tripId/summary');
    return TripSummary.fromJson(response.data);
  }

  /// 建立結算記錄
  /// [receiverId] 收款方用戶 ID（與 virtualReceiverId 擇一）
  /// [virtualPayerId] 付款方虛擬人員 ID
  /// [virtualReceiverId] 收款方虛擬人員 ID
  Future<Settlement> createSettlement({
    required String tripId,
    String? receiverId,
    required double amount,
    String? virtualPayerId,
    String? virtualReceiverId,
  }) async {
    final response = await apiClient.post(
      ApiConfig.settlements,
      data: {
        'tripId': tripId,
        if (receiverId != null) 'receiverId': receiverId,
        'amount': amount,
        if (virtualPayerId != null) 'virtualPayerId': virtualPayerId,
        if (virtualReceiverId != null) 'virtualReceiverId': virtualReceiverId,
      },
    );
    return Settlement.fromJson(response.data);
  }

  /// 確認結算（收款方確認）
  Future<Settlement> confirmSettlement(String settlementId) async {
    final response = await apiClient.put('${ApiConfig.settlements}/$settlementId/confirm');
    return Settlement.fromJson(response.data);
  }

  /// 取消結算
  Future<void> cancelSettlement(String settlementId) async {
    await apiClient.put('${ApiConfig.settlements}/$settlementId/cancel');
  }

  /// 取得待確認的結算
  Future<List<Settlement>> getPendingSettlements() async {
    final response = await apiClient.get('${ApiConfig.settlements}/pending');
    final List<dynamic> data = response.data;
    return data.map((json) => Settlement.fromJson(json)).toList();
  }

  /// 取得特定旅程的待處理結算
  Future<List<Settlement>> getTripPendingSettlements(String tripId) async {
    final response = await apiClient.get('${ApiConfig.trips}/$tripId${ApiConfig.settlements}/pending');
    final List<dynamic> data = response.data;
    return data.map((json) => Settlement.fromJson(json)).toList();
  }
}
