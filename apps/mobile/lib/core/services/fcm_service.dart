import 'dart:async';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../config/router.dart';

/// 背景訊息處理器（必須為頂層函數）
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  if (kDebugMode) {
    debugPrint('FCM 背景訊息: ${message.messageId}');
  }
}

/// FCM Token Provider
final fcmTokenProvider = StateProvider<String?>((ref) => null);

/// FCM Service Provider
final fcmServiceProvider = Provider<FcmService>((ref) => FcmService(ref));

/// UUID 格式驗證正則表達式
final _uuidRegex = RegExp(
  r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
);

/// Firebase Cloud Messaging 服務
class FcmService {
  final Ref _ref;
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  // 訂閱管理（避免記憶體洩漏）
  StreamSubscription<RemoteMessage>? _onMessageSubscription;
  StreamSubscription<RemoteMessage>? _onMessageOpenedAppSubscription;
  StreamSubscription<String>? _onTokenRefreshSubscription;

  static const AndroidNotificationChannel _androidChannel =
      AndroidNotificationChannel(
    'tripledger_notifications',
    'TripLedger 通知',
    description: '團體旅遊分帳通知',
    importance: Importance.high,
  );

  FcmService(this._ref);

  /// 初始化 FCM
  Future<void> initialize() async {
    // 設置背景訊息處理器
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // 請求通知權限
    await _requestPermission();

    // 初始化本地通知
    await _initializeLocalNotifications();

    // 建立 Android 通知頻道
    if (Platform.isAndroid) {
      await _localNotifications
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(_androidChannel);
    }

    // 設置前景訊息處理（儲存訂閱以便清理）
    _onMessageSubscription = FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // 設置通知點擊處理（儲存訂閱以便清理）
    _onMessageOpenedAppSubscription = FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageOpenedApp);

    // 檢查是否從通知啟動 App
    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      _handleMessageOpenedApp(initialMessage);
    }

    // 取得 FCM Token
    await _getToken();

    // 監聽 Token 刷新（儲存訂閱以便清理）
    _onTokenRefreshSubscription = _messaging.onTokenRefresh.listen((token) {
      if (kDebugMode) {
        debugPrint('FCM Token 已刷新');
      }
      _ref.read(fcmTokenProvider.notifier).state = token;
    });
  }

  /// 請求通知權限
  Future<void> _requestPermission() async {
    final settings = await _messaging.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );

    if (kDebugMode) {
      debugPrint('FCM 權限狀態: ${settings.authorizationStatus}');
    }
  }

  /// 初始化本地通知
  Future<void> _initializeLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (response) {
        _handleNotificationTap(response.payload);
      },
    );
  }

  /// 取得 FCM Token
  Future<String?> _getToken() async {
    try {
      final token = await _messaging.getToken();
      if (kDebugMode) {
        debugPrint('FCM Token 已取得');
      }
      _ref.read(fcmTokenProvider.notifier).state = token;
      return token;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('取得 FCM Token 失敗: $e');
      }
      return null;
    }
  }

  /// 取得當前 FCM Token
  Future<String?> getToken() async {
    final currentToken = _ref.read(fcmTokenProvider);
    if (currentToken != null) return currentToken;
    return _getToken();
  }

  /// 處理前景訊息
  void _handleForegroundMessage(RemoteMessage message) {
    if (kDebugMode) {
      debugPrint('FCM 前景訊息: ${message.messageId}');
    }

    final notification = message.notification;
    if (notification == null) return;

    // 顯示本地通知
    _showLocalNotification(
      title: notification.title ?? 'TripLedger',
      body: notification.body ?? '',
      payload: _buildPayload(message.data),
    );
  }

  /// 處理通知點擊開啟 App
  void _handleMessageOpenedApp(RemoteMessage message) {
    if (kDebugMode) {
      debugPrint('FCM 通知點擊');
    }
    _navigateByPayload(message.data);
  }

  /// 處理本地通知點擊
  void _handleNotificationTap(String? payload) {
    if (payload == null) return;
    if (kDebugMode) {
      debugPrint('本地通知點擊');
    }

    // 解析 payload 並導航
    final parts = payload.split(':');
    if (parts.length >= 2) {
      _navigateByPayload({
        'type': parts[0],
        'tripId': parts[1],
        if (parts.length > 2) 'billId': parts[2],
        if (parts.length > 3) 'settlementId': parts[3],
      });
    }
  }

  /// 顯示本地通知
  Future<void> _showLocalNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'tripledger_notifications',
      'TripLedger 通知',
      channelDescription: '團體旅遊分帳通知',
      importance: Importance.high,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications.show(
      DateTime.now().millisecondsSinceEpoch.remainder(100000),
      title,
      body,
      details,
      payload: payload,
    );
  }

  /// 構建通知 payload
  String _buildPayload(Map<String, dynamic> data) {
    final type = data['type'] ?? '';
    final tripId = data['tripId'] ?? '';
    final billId = data['billId'] ?? '';
    final settlementId = data['settlementId'] ?? '';
    return '$type:$tripId:$billId:$settlementId';
  }

  /// 驗證是否為有效的 UUID 格式
  bool _isValidUuid(String? value) {
    if (value == null || value.isEmpty) return false;
    return _uuidRegex.hasMatch(value);
  }

  /// 根據 payload 導航
  void _navigateByPayload(Map<String, dynamic> data) {
    final type = data['type'] as String?;
    final tripId = data['tripId'] as String?;
    final billId = data['billId'] as String?;

    // 驗證 tripId 格式（必要）
    if (!_isValidUuid(tripId)) {
      if (kDebugMode) {
        debugPrint('FCM 導航失敗：無效的 tripId 格式');
      }
      return;
    }

    // 驗證 billId 格式（如果存在）
    if (billId != null && billId.isNotEmpty && !_isValidUuid(billId)) {
      if (kDebugMode) {
        debugPrint('FCM 導航失敗：無效的 billId 格式');
      }
      return;
    }

    // 使用全域導航 key 進行導航
    final context = rootNavigatorKey.currentContext;
    if (context == null) {
      if (kDebugMode) {
        debugPrint('導航失敗：無法取得 context');
      }
      return;
    }

    if (kDebugMode) {
      debugPrint('FCM 導航: type=$type, tripId=$tripId');
    }

    // 根據通知類型導航到對應頁面
    // 注意：實際權限驗證由後端 API 負責，此處僅做格式驗證
    switch (type) {
      case 'newBill':
      case 'billUpdated':
        // 新帳單或帳單更新 -> 導航到帳單詳情
        if (billId != null && billId.isNotEmpty) {
          context.go('/trips/$tripId/bill/$billId');
        } else {
          context.go('/trips/$tripId');
        }
        break;

      case 'settlementRequest':
      case 'settlementConfirmed':
        // 結算相關 -> 導航到結算頁面
        context.go('/trips/$tripId/settlement');
        break;

      case 'memberJoined':
        // 成員加入 -> 導航到成員管理頁面
        context.go('/trips/$tripId/members');
        break;

      case 'tripInvite':
      case 'reminder':
      default:
        // 其他類型 -> 導航到旅程詳情
        context.go('/trips/$tripId');
        break;
    }
  }

  /// 刪除 FCM Token（登出時使用）
  Future<void> deleteToken() async {
    try {
      await _messaging.deleteToken();
      _ref.read(fcmTokenProvider.notifier).state = null;
      if (kDebugMode) {
        debugPrint('FCM Token 已刪除');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('刪除 FCM Token 失敗: $e');
      }
    }
  }

  /// 釋放資源（App 結束時調用）
  Future<void> dispose() async {
    await _onMessageSubscription?.cancel();
    await _onMessageOpenedAppSubscription?.cancel();
    await _onTokenRefreshSubscription?.cancel();
    _onMessageSubscription = null;
    _onMessageOpenedAppSubscription = null;
    _onTokenRefreshSubscription = null;
    if (kDebugMode) {
      debugPrint('FCM Service 已釋放資源');
    }
  }
}
