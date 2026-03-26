import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/config/api_config.dart';
import '../../../core/utils/currency_utils.dart';
import '../../../shared/models/bill_model.dart';

final billsRepositoryProvider = Provider<BillsRepository>((ref) {
  return BillsRepository(apiClient: ref.read(apiClientProvider));
});

/// 帳單分頁回應
class BillsResponse {
  final List<Bill> bills;
  final int total;
  final int limit;
  final int offset;
  final bool hasMore;

  BillsResponse({
    required this.bills,
    required this.total,
    required this.limit,
    required this.offset,
    required this.hasMore,
  });
}

class BillsRepository {
  final ApiClient apiClient;

  BillsRepository({required this.apiClient});

  /// 取得旅程所有帳單（支援分頁）
  Future<BillsResponse> getBillsPaginated(String tripId, {int? limit, int? offset}) async {
    final queryParams = <String, dynamic>{};
    if (limit != null) queryParams['limit'] = limit;
    if (offset != null) queryParams['offset'] = offset;

    final response = await apiClient.get(
      '${ApiConfig.trips}/$tripId${ApiConfig.bills}',
      queryParameters: queryParams.isNotEmpty ? queryParams : null,
    );

    // 後端回傳分頁格式: { data: [], pagination: { total, limit, offset, hasMore } }
    final responseData = response.data;
    final List<dynamic> data = responseData['data'];
    final pagination = responseData['pagination'];

    return BillsResponse(
      bills: data.map((json) => Bill.fromJson(json)).toList(),
      total: pagination['total'],
      limit: pagination['limit'],
      offset: pagination['offset'],
      hasMore: pagination['hasMore'],
    );
  }

  /// 取得旅程所有帳單（簡易版，回傳 List - 向下相容）
  Future<List<Bill>> getBills(String tripId) async {
    final response = await getBillsPaginated(tripId, limit: 100);
    return response.bills;
  }

  /// 取得帳單詳情
  Future<Bill> getBillDetail(String billId) async {
    final response = await apiClient.get('${ApiConfig.bills}/$billId');
    return Bill.fromJson(response.data);
  }

  /// 新增帳單
  /// [receiptImageFile] 為收據圖片檔案，若提供則使用 multipart 上傳
  /// [currency] 帳單貨幣，不填則使用旅程預設貨幣
  /// [payerId] 付款者用戶 ID（不填則為當前用戶）
  /// [virtualPayerId] 付款者虛擬人員 ID（與 payerId 擇一）
  Future<Bill> createBill({
    required String tripId,
    required String title,
    required double amount,
    required String category,
    required String splitType,
    String? note,
    File? receiptImageFile,
    required List<Map<String, dynamic>> participants,
    List<Map<String, dynamic>>? items,  // 細項分攤模式使用
    Currency? currency,
    String? payerId,
    String? virtualPayerId,
  }) async {
    final data = {
      'title': title,
      'amount': amount,
      'category': category,
      'splitType': splitType,
      if (note != null) 'note': note,
      'participants': participants,
      if (items != null) 'items': items,
      if (currency != null) 'currency': currency.name,
      if (payerId != null) 'payerId': payerId,
      if (virtualPayerId != null) 'virtualPayerId': virtualPayerId,
    };

    // 如果有檔案，使用 multipart 上傳
    if (receiptImageFile != null) {
      final response = await apiClient.postMultipart(
        '${ApiConfig.trips}/$tripId${ApiConfig.bills}',
        data: data,
        file: receiptImageFile,
        fileField: 'receiptImage',
      );
      return Bill.fromJson(response.data);
    }

    // 沒有檔案，使用一般 JSON 請求
    final response = await apiClient.post(
      '${ApiConfig.trips}/$tripId${ApiConfig.bills}',
      data: data,
    );
    return Bill.fromJson(response.data);
  }

  /// 更新帳單
  /// [receiptImageFile] 為新的收據圖片檔案，若提供則使用 multipart 上傳
  /// [currency] 帳單貨幣
  /// [payerId] 付款者用戶 ID
  /// [virtualPayerId] 付款者虛擬人員 ID
  Future<Bill> updateBill({
    required String billId,
    String? title,
    double? amount,
    String? category,
    String? splitType,
    String? note,
    File? receiptImageFile,
    List<Map<String, dynamic>>? participants,
    List<Map<String, dynamic>>? items,  // 細項分攤模式使用
    Currency? currency,
    String? payerId,
    String? virtualPayerId,
  }) async {
    final data = <String, dynamic>{
      if (title != null) 'title': title,
      if (amount != null) 'amount': amount,
      if (category != null) 'category': category,
      if (splitType != null) 'splitType': splitType,
      if (note != null) 'note': note,
      if (participants != null) 'participants': participants,
      if (items != null) 'items': items,
      if (currency != null) 'currency': currency.name,
      if (payerId != null) 'payerId': payerId,
      if (virtualPayerId != null) 'virtualPayerId': virtualPayerId,
    };

    // 如果有檔案，使用 multipart 上傳
    if (receiptImageFile != null) {
      final response = await apiClient.putMultipart(
        '${ApiConfig.bills}/$billId',
        data: data,
        file: receiptImageFile,
        fileField: 'receiptImage',
      );
      return Bill.fromJson(response.data);
    }

    // 沒有檔案，使用一般 JSON 請求
    final response = await apiClient.put(
      '${ApiConfig.bills}/$billId',
      data: data,
    );
    return Bill.fromJson(response.data);
  }

  /// 刪除帳單
  Future<void> deleteBill(String billId) async {
    await apiClient.delete('${ApiConfig.bills}/$billId');
  }

  /// 取得帳單統計
  Future<List<Map<String, dynamic>>> getBillStats(String tripId) async {
    final response = await apiClient.get('${ApiConfig.trips}/$tripId${ApiConfig.bills}/stats');
    return List<Map<String, dynamic>>.from(response.data);
  }
}
