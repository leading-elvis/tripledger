import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/config/api_config.dart';
import '../../../shared/models/notification_model.dart';

final notificationsRepositoryProvider = Provider<NotificationsRepository>((ref) {
  return NotificationsRepository(apiClient: ref.read(apiClientProvider));
});

/// 通知狀態 Provider
final notificationsProvider = StateNotifierProvider<NotificationsNotifier, NotificationsState>((ref) {
  return NotificationsNotifier(ref.watch(notificationsRepositoryProvider));
});

/// 未讀通知數量 Provider
final unreadCountProvider = Provider<int>((ref) {
  final state = ref.watch(notificationsProvider);
  return state.notifications.where((n) => !n.isRead).length;
});

class NotificationsState {
  final List<AppNotification> notifications;
  final bool isLoading;
  final String? error;

  const NotificationsState({
    this.notifications = const [],
    this.isLoading = false,
    this.error,
  });

  NotificationsState copyWith({
    List<AppNotification>? notifications,
    bool? isLoading,
    String? error,
  }) {
    return NotificationsState(
      notifications: notifications ?? this.notifications,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class NotificationsNotifier extends StateNotifier<NotificationsState> {
  final NotificationsRepository _repository;

  NotificationsNotifier(this._repository) : super(const NotificationsState()) {
    loadNotifications();
  }

  Future<void> loadNotifications() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final notifications = await _repository.getNotifications();
      state = state.copyWith(notifications: notifications, isLoading: false);
    } catch (e) {
      state = state.copyWith(error: e.toString(), isLoading: false);
    }
  }

  Future<void> markAsRead(String notificationId) async {
    try {
      await _repository.markAsRead(notificationId);
      final updated = state.notifications.map((n) {
        if (n.id == notificationId) {
          return n.copyWith(isRead: true);
        }
        return n;
      }).toList();
      state = state.copyWith(notifications: updated);
    } catch (e) {
      // 靜默處理錯誤，UI 已經更新
    }
  }

  Future<void> markAllAsRead() async {
    // 樂觀更新 - 先更新 UI
    final updated = state.notifications.map((n) => n.copyWith(isRead: true)).toList();
    state = state.copyWith(notifications: updated);

    try {
      await _repository.markAllAsRead();
    } catch (e) {
      // 如果 API 失敗，重新載入資料
      await loadNotifications();
    }
  }

  Future<void> deleteNotification(String notificationId) async {
    // 樂觀更新 - 先從 UI 移除
    final previousNotifications = state.notifications;
    final updated = state.notifications.where((n) => n.id != notificationId).toList();
    state = state.copyWith(notifications: updated);

    try {
      await _repository.deleteNotification(notificationId);
    } catch (e) {
      // 如果 API 失敗，恢復原本的列表
      state = state.copyWith(notifications: previousNotifications);
    }
  }

  void addNotification(AppNotification notification) {
    state = state.copyWith(
      notifications: [notification, ...state.notifications],
    );
  }
}

class NotificationsRepository {
  final ApiClient apiClient;

  // 是否使用模擬資料（當 API 尚未實作時）
  bool _useMockData = false;

  NotificationsRepository({required this.apiClient});

  /// 取得所有通知（支援分頁）
  Future<List<AppNotification>> getNotifications({int? limit, int? offset}) async {
    if (_useMockData) {
      return _getMockNotifications();
    }

    try {
      final queryParams = <String, dynamic>{};
      if (limit != null) queryParams['limit'] = limit;
      if (offset != null) queryParams['offset'] = offset;

      final response = await apiClient.get(
        ApiConfig.notifications,
        queryParameters: queryParams.isNotEmpty ? queryParams : null,
      );

      // 後端回傳分頁格式: { data: [], pagination: { total, limit, offset, hasMore } }
      final responseData = response.data;
      final List<dynamic> data = responseData['data'];
      return data.map((json) => AppNotification.fromJson(json)).toList();
    } catch (e) {
      // 如果 API 失敗，回退到模擬資料
      _useMockData = true;
      return _getMockNotifications();
    }
  }

  /// 標記單一通知為已讀
  Future<void> markAsRead(String notificationId) async {
    if (_useMockData) {
      await Future.delayed(const Duration(milliseconds: 200));
      return;
    }

    await apiClient.put('${ApiConfig.notifications}/$notificationId/read');
  }

  /// 標記所有通知為已讀
  Future<void> markAllAsRead() async {
    if (_useMockData) {
      await Future.delayed(const Duration(milliseconds: 200));
      return;
    }

    await apiClient.put('${ApiConfig.notifications}/read-all');
  }

  /// 刪除通知
  Future<void> deleteNotification(String notificationId) async {
    if (_useMockData) {
      await Future.delayed(const Duration(milliseconds: 200));
      return;
    }

    await apiClient.delete('${ApiConfig.notifications}/$notificationId');
  }

  /// 取得未讀通知數量
  Future<int> getUnreadCount() async {
    if (_useMockData) {
      final notifications = await _getMockNotifications();
      return notifications.where((n) => !n.isRead).length;
    }

    try {
      final response = await apiClient.get('${ApiConfig.notifications}/unread-count');
      return response.data['count'] as int;
    } catch (e) {
      return 0;
    }
  }

  /// 模擬通知資料
  Future<List<AppNotification>> _getMockNotifications() async {
    // 模擬網路延遲
    await Future.delayed(const Duration(milliseconds: 500));

    final now = DateTime.now();
    return [
      AppNotification(
        id: '1',
        type: NotificationType.newBill,
        title: '新帳單',
        message: '小明 新增了一筆帳單「午餐 - 一蘭拉麵」',
        tripId: 'trip1',
        tripName: '東京五日遊',
        billId: 'bill1',
        fromUserId: 'user1',
        fromUserName: '小明',
        amount: 3200,
        isRead: false,
        createdAt: now.subtract(const Duration(minutes: 5)),
      ),
      AppNotification(
        id: '2',
        type: NotificationType.settlementRequest,
        title: '結算請求',
        message: '小華 向你發起了結算請求',
        tripId: 'trip1',
        tripName: '東京五日遊',
        settlementId: 'settlement1',
        fromUserId: 'user2',
        fromUserName: '小華',
        amount: 1500,
        isRead: false,
        createdAt: now.subtract(const Duration(hours: 1)),
      ),
      AppNotification(
        id: '3',
        type: NotificationType.memberJoined,
        title: '新成員加入',
        message: '小美 已加入旅程「大阪三日遊」',
        tripId: 'trip2',
        tripName: '大阪三日遊',
        fromUserId: 'user3',
        fromUserName: '小美',
        isRead: false,
        createdAt: now.subtract(const Duration(hours: 3)),
      ),
      AppNotification(
        id: '4',
        type: NotificationType.settlementConfirmed,
        title: '結算已確認',
        message: '小明 已確認收到你的付款 NT\$ 2,000',
        tripId: 'trip1',
        tripName: '東京五日遊',
        settlementId: 'settlement2',
        fromUserId: 'user1',
        fromUserName: '小明',
        amount: 2000,
        isRead: true,
        createdAt: now.subtract(const Duration(days: 1)),
      ),
      AppNotification(
        id: '5',
        type: NotificationType.billUpdated,
        title: '帳單已更新',
        message: '小明 更新了帳單「計程車」的金額',
        tripId: 'trip1',
        tripName: '東京五日遊',
        billId: 'bill2',
        fromUserId: 'user1',
        fromUserName: '小明',
        isRead: true,
        createdAt: now.subtract(const Duration(days: 2)),
      ),
      AppNotification(
        id: '6',
        type: NotificationType.tripInvite,
        title: '旅程邀請',
        message: '小華 邀請你加入旅程「北海道滑雪」',
        tripId: 'trip3',
        tripName: '北海道滑雪',
        fromUserId: 'user2',
        fromUserName: '小華',
        isRead: true,
        createdAt: now.subtract(const Duration(days: 3)),
      ),
      AppNotification(
        id: '7',
        type: NotificationType.reminder,
        title: '結算提醒',
        message: '「東京五日遊」還有 3 筆待結算款項',
        tripId: 'trip1',
        tripName: '東京五日遊',
        isRead: true,
        createdAt: now.subtract(const Duration(days: 5)),
      ),
    ];
  }
}
