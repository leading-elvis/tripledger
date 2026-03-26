import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import '../data/purchase_repository.dart';
import 'models/purchase_models.dart';

/// 產品 ID 常數
class ProductIds {
  static const String tripPremium3d = 'trip_premium_3d';
  static const String tripPremium7d = 'trip_premium_7d';
  static const String tripPremium30d = 'trip_premium_30d';
  static const String removeAdsForever = 'remove_ads_forever';

  static const Set<String> all = {
    tripPremium3d,
    tripPremium7d,
    tripPremium30d,
    removeAdsForever,
  };

  static const Set<String> consumables = {
    tripPremium3d,
    tripPremium7d,
    tripPremium30d,
  };

  static const Set<String> nonConsumables = {
    removeAdsForever,
  };
}

/// 購買狀態
enum PurchaseState {
  idle,
  loading,
  purchasing,
  verifying,
  success,
  error,
}

/// 購買服務 - 封裝 in_app_purchase 邏輯
class PurchaseService {
  final InAppPurchase _iap = InAppPurchase.instance;
  final PurchaseRepository _repository;

  StreamSubscription<List<PurchaseDetails>>? _subscription;
  final _purchaseStateController = StreamController<PurchaseState>.broadcast();
  final _errorController = StreamController<String>.broadcast();

  List<ProductDetails> _products = [];
  List<ProductDetails> get products => List.unmodifiable(_products);

  bool _isAvailable = false;
  bool get isAvailable => _isAvailable;

  // 診斷資訊
  final Set<String> _notFoundIds = {};
  Set<String> get notFoundIds => _notFoundIds;
  String? _lastError;
  String? get lastError => _lastError;

  // 已處理的交易 ID（防止重複處理同一筆交易）
  final Set<String> _processedTransactionIds = {};

  Stream<PurchaseState> get purchaseStateStream => _purchaseStateController.stream;
  Stream<String> get errorStream => _errorController.stream;

  // 回調函數（使用 Map 儲存，避免被覆蓋）
  final Map<String, Function(String productId, String? tripId)> _successCallbacks = {};
  final Map<String, Function(String error)> _errorCallbacks = {};

  // 當前購買的旅程 ID（消耗型產品用）
  String? _currentTripId;

  // 購買開始時間（用於判斷是否為新交易）
  DateTime? _purchaseStartTime;

  // 恢復購買狀態
  bool _isRestoring = false;
  final List<PurchaseDetails> _restoredPurchases = [];
  Completer<List<PurchaseDetails>>? _restoreCompleter;

  /// 註冊購買成功回調（返回取消註冊的函數）
  VoidCallback registerSuccessCallback(String key, Function(String productId, String? tripId) callback) {
    _successCallbacks[key] = callback;
    return () => _successCallbacks.remove(key);
  }

  /// 註冊購買錯誤回調（返回取消註冊的函數）
  VoidCallback registerErrorCallback(String key, Function(String error) callback) {
    _errorCallbacks[key] = callback;
    return () => _errorCallbacks.remove(key);
  }

  void _notifySuccess(String productId, String? tripId) {
    for (final callback in _successCallbacks.values) {
      callback(productId, tripId);
    }
  }

  void _notifyError(String error) {
    for (final callback in _errorCallbacks.values) {
      callback(error);
    }
  }

  PurchaseService(this._repository);

  // 初始化狀態追蹤
  bool _isInitialized = false;
  bool _isInitializing = false;
  Completer<void>? _initCompleter;

  /// 確保已初始化（供外部等待）
  Future<void> ensureInitialized() async {
    if (_isInitialized) return;
    if (_initCompleter != null) {
      return _initCompleter!.future;
    }
    await initialize();
  }

  /// 初始化
  Future<void> initialize() async {
    // 防止重複初始化
    if (_isInitialized || _isInitializing) {
      return _initCompleter?.future ?? Future.value();
    }

    _isInitializing = true;
    _initCompleter = Completer<void>();
    debugPrint('🛒 開始初始化內購服務...');
    debugPrint('🛒 平台: ${Platform.isIOS ? "iOS" : "Android"}');

    try {
      _isAvailable = await _iap.isAvailable();
      debugPrint('🛒 內購功能可用: $_isAvailable');

      if (!_isAvailable) {
        debugPrint('🛒 ❌ 內購功能不可用');
        return;
      }

      // 監聽購買流
      _subscription = _iap.purchaseStream.listen(
        _onPurchaseUpdate,
        onDone: _onPurchaseDone,
        onError: _onPurchaseError,
      );

      // 載入產品資訊
      await loadProducts();
    } finally {
      _isInitialized = true;
      _isInitializing = false;
      _initCompleter?.complete();
    }
  }

  /// 載入產品資訊
  Future<void> loadProducts() async {
    _purchaseStateController.add(PurchaseState.loading);

    debugPrint('🛒 正在查詢產品: ${ProductIds.all}');

    try {
      final response = await _iap.queryProductDetails(ProductIds.all);

      debugPrint('🛒 查詢完成');
      debugPrint('🛒 錯誤: ${response.error?.message ?? "無"}');
      debugPrint('🛒 找到的產品數量: ${response.productDetails.length}');
      debugPrint('🛒 找不到的產品: ${response.notFoundIDs}');

      if (response.error != null) {
        debugPrint('🛒 ❌ 載入產品失敗: ${response.error!.message}');
        _lastError = response.error!.message;
        _errorController.add('無法載入產品資訊');
        _purchaseStateController.add(PurchaseState.error);
        return;
      }

      _notFoundIds.clear();
      if (response.notFoundIDs.isNotEmpty) {
        debugPrint('🛒 ⚠️ 找不到的產品: ${response.notFoundIDs}');
        _notFoundIds.addAll(response.notFoundIDs);
      }

      _products = response.productDetails;
      _lastError = null;

      // 輸出每個產品的詳細資訊
      for (final product in _products) {
        debugPrint('🛒 ✅ 產品: ${product.id} - ${product.title} - ${product.price}');
      }

      debugPrint('🛒 成功載入 ${_products.length} 個產品');
      _purchaseStateController.add(PurchaseState.idle);
    } catch (e, stack) {
      debugPrint('🛒 ❌ 載入產品例外: $e');
      debugPrint('🛒 堆疊: $stack');
      _errorController.add('載入產品時發生錯誤');
      _purchaseStateController.add(PurchaseState.error);
    }
  }

  /// 取得產品詳情
  ProductDetails? getProduct(String productId) {
    for (final product in _products) {
      if (product.id == productId) return product;
    }
    return null;
  }

  /// 購買產品
  Future<void> buyProduct(String productId, {String? tripId}) async {
    final product = getProduct(productId);
    if (product == null) {
      _errorController.add('找不到產品');
      return;
    }

    // 消耗型產品需要 tripId
    if (ProductIds.consumables.contains(productId) && tripId == null) {
      _errorController.add('請選擇要升級的旅程');
      return;
    }

    _currentTripId = tripId;
    _purchaseStartTime = DateTime.now();
    _purchaseStateController.add(PurchaseState.purchasing);

    try {
      final purchaseParam = PurchaseParam(
        productDetails: product,
        applicationUserName: tripId, // 用於追蹤
      );

      if (ProductIds.nonConsumables.contains(productId)) {
        await _iap.buyNonConsumable(purchaseParam: purchaseParam);
      } else {
        await _iap.buyConsumable(purchaseParam: purchaseParam);
      }
    } catch (e) {
      debugPrint('購買例外: $e');
      _errorController.add('購買時發生錯誤');
      _purchaseStateController.add(PurchaseState.error);
    }
  }

  /// 恢復購買（非消耗型）
  /// 返回恢復結果，包含是否成功恢復及恢復的產品
  Future<RestoreResult> restorePurchases() async {
    _purchaseStateController.add(PurchaseState.loading);
    _isRestoring = true;
    _restoredPurchases.clear();
    _restoreCompleter = Completer<List<PurchaseDetails>>();

    try {
      // 觸發 App Store / Google Play 恢復
      await _iap.restorePurchases();

      // 等待恢復完成（有超時保護）
      final restoredList = await _restoreCompleter!.future.timeout(
        const Duration(seconds: 30),
        onTimeout: () => _restoredPurchases.toList(),
      );

      // 收集非消耗型產品的收據
      final nonConsumableReceipts = <String>[];
      for (final purchase in restoredList) {
        if (ProductIds.nonConsumables.contains(purchase.productID)) {
          nonConsumableReceipts.add(purchase.verificationData.serverVerificationData);
        }
      }

      // 發送到後端驗證
      if (nonConsumableReceipts.isNotEmpty) {
        final platform = Platform.isIOS ? 'IOS' : 'ANDROID';
        final result = await _repository.restorePurchases(
          platform: platform,
          receiptDataList: nonConsumableReceipts,
        );
        _purchaseStateController.add(PurchaseState.idle);
        return result;
      }

      _purchaseStateController.add(PurchaseState.idle);
      return const RestoreResult(
        hasRestoredPurchases: false,
        adFreeRestored: false,
        restoredCount: 0,
      );
    } catch (e) {
      debugPrint('恢復購買失敗: $e');
      _errorController.add('恢復購買時發生錯誤');
      _purchaseStateController.add(PurchaseState.error);
      rethrow;
    } finally {
      _isRestoring = false;
      _restoreCompleter = null;
    }
  }

  /// 處理購買更新
  Future<void> _onPurchaseUpdate(List<PurchaseDetails> purchases) async {
    for (final purchase in purchases) {
      debugPrint('🛒 購買更新: ${purchase.productID}, 狀態: ${purchase.status}');
      debugPrint('🛒 交易ID: ${purchase.purchaseID}');
      debugPrint('🛒 待完成: ${purchase.pendingCompletePurchase}');
      debugPrint('🛒 當前 tripId: $_currentTripId');
      debugPrint('🛒 恢復模式: $_isRestoring');

      // 追蹤此交易是否需要完成
      bool shouldCompletePurchase = false;

      switch (purchase.status) {
        case PurchaseStatus.pending:
          _purchaseStateController.add(PurchaseState.purchasing);
          break;

        case PurchaseStatus.purchased:
        case PurchaseStatus.restored:
          final isConsumable = ProductIds.consumables.contains(purchase.productID);
          final transactionId = purchase.purchaseID;
          final hasActivePurchase = _currentTripId != null && _purchaseStartTime != null;

          debugPrint('🛒 isConsumable: $isConsumable');
          debugPrint('🛒 status: ${purchase.status}');
          debugPrint('🛒 transactionId: $transactionId');
          debugPrint('🛒 hasActivePurchase: $hasActivePurchase');

          // 恢復購買模式：收集非消耗型產品
          if (_isRestoring && purchase.status == PurchaseStatus.restored) {
            if (!isConsumable) {
              debugPrint('🛒 收集恢復的非消耗型產品: ${purchase.productID}');
              _restoredPurchases.add(purchase);
            }
            // 恢復模式下直接完成交易
            shouldCompletePurchase = true;
            break;
          }

          // 1. 檢查是否已處理過此交易（防止沙盒環境重複恢復）
          if (transactionId != null && _processedTransactionIds.contains(transactionId)) {
            debugPrint('🛒 跳過已處理的交易: $transactionId');
            shouldCompletePurchase = true;
            // 靜默處理重複交易，不顯示錯誤給用戶
            // 這在沙盒環境中很常見，不需要打擾用戶
            if (!hasActivePurchase) {
              _purchaseStateController.add(PurchaseState.idle);
            }
            // 如果有主動購買，等待真正的新交易
            break;
          }

          // 2. 消耗型產品不應該被恢復（Apple 規範）
          // 在沙盒環境中，舊的消耗型交易可能會被意外恢復
          if (isConsumable && purchase.status == PurchaseStatus.restored) {
            debugPrint('🛒 跳過消耗型產品的恢復事件（沙盒環境常見）: ${purchase.productID}');
            shouldCompletePurchase = true;
            // 靜默完成這些舊交易，不干擾用戶體驗
            if (!hasActivePurchase) {
              _purchaseStateController.add(PurchaseState.idle);
            }
            // 如果正在購買中，等待真正的新交易到達
            break;
          }

          // 3. 檢查是否為主動觸發的購買
          final isRecentPurchase = _purchaseStartTime != null &&
              DateTime.now().difference(_purchaseStartTime!).inSeconds < 60;
          final isActivePurchase = !isConsumable || (hasActivePurchase && isRecentPurchase);

          debugPrint('🛒 isRecentPurchase: $isRecentPurchase');
          debugPrint('🛒 isActivePurchase: $isActivePurchase');

          if (!isActivePurchase) {
            debugPrint('🛒 跳過舊交易（非主動購買）: ${purchase.productID}');
            shouldCompletePurchase = true;
            _currentTripId = null;
            _purchaseStartTime = null;
            _purchaseStateController.add(PurchaseState.idle);
            break;
          }

          // 記錄已處理的交易 ID
          if (transactionId != null) {
            _processedTransactionIds.add(transactionId);
          }

          // 驗證購買（只有驗證成功才會完成交易）
          final success = await _verifyAndDeliverPurchase(purchase);
          shouldCompletePurchase = success;
          break;

        case PurchaseStatus.error:
          _handlePurchaseError(purchase);
          shouldCompletePurchase = true;
          break;

        case PurchaseStatus.canceled:
          _purchaseStateController.add(PurchaseState.idle);
          shouldCompletePurchase = true;
          break;
      }

      // 只有在應該完成時才完成購買交易
      if (shouldCompletePurchase && purchase.pendingCompletePurchase) {
        await _iap.completePurchase(purchase);
      }
    }

    // 恢復購買完成
    if (_isRestoring && _restoreCompleter != null && !_restoreCompleter!.isCompleted) {
      // 給一點時間讓所有恢復事件都到達
      Future.delayed(const Duration(milliseconds: 500), () {
        if (_restoreCompleter != null && !_restoreCompleter!.isCompleted) {
          _restoreCompleter!.complete(_restoredPurchases.toList());
        }
      });
    }
  }

  /// 驗證並交付購買
  /// 返回 true 表示驗證成功，可以完成交易
  /// 返回 false 表示驗證失敗，不應完成交易（用戶可以重試）
  Future<bool> _verifyAndDeliverPurchase(PurchaseDetails purchase) async {
    _purchaseStateController.add(PurchaseState.verifying);

    try {
      final platform = Platform.isIOS ? 'IOS' : 'ANDROID';

      // 取得收據資料
      String receiptData;
      if (Platform.isIOS) {
        // iOS: 使用 verificationData
        receiptData = purchase.verificationData.serverVerificationData;
      } else {
        // Android: 使用購買 token
        receiptData = purchase.verificationData.serverVerificationData;
      }

      // 呼叫後端驗證
      await _repository.verifyPurchase(
        platform: platform,
        productId: purchase.productID,
        receiptData: receiptData,
        transactionId: purchase.purchaseID ?? DateTime.now().toIso8601String(),
        tripId: _currentTripId,
      );

      debugPrint('購買驗證成功: ${purchase.productID}');
      _purchaseStateController.add(PurchaseState.success);
      _notifySuccess(purchase.productID, _currentTripId);
      return true;
    } catch (e) {
      debugPrint('購買驗證失敗: $e');
      _errorController.add('驗證購買時發生錯誤，請稍後重試');
      _purchaseStateController.add(PurchaseState.error);
      _notifyError(e.toString());
      // 驗證失敗時不完成交易，讓用戶可以重試
      return false;
    } finally {
      _currentTripId = null;
      _purchaseStartTime = null;
    }
  }

  /// 處理購買錯誤
  void _handlePurchaseError(PurchaseDetails purchase) {
    final error = purchase.error;
    String errorMessage = '購買失敗';

    if (error != null) {
      debugPrint('購買錯誤: ${error.code} - ${error.message}');

      // 解析常見錯誤
      switch (error.code) {
        case 'user_cancelled':
          errorMessage = '您已取消購買';
          break;
        case 'payment_invalid':
          errorMessage = '付款資訊無效';
          break;
        case 'payment_not_allowed':
          errorMessage = '此裝置不允許購買';
          break;
        default:
          errorMessage = error.message;
      }
    }

    _errorController.add(errorMessage);
    _purchaseStateController.add(PurchaseState.error);
    _notifyError(errorMessage);
  }

  void _onPurchaseDone() {
    debugPrint('購買流結束');
  }

  void _onPurchaseError(dynamic error) {
    debugPrint('購買流錯誤: $error');
    _errorController.add('購買時發生錯誤');
    _purchaseStateController.add(PurchaseState.error);
  }

  /// 清除已處理交易記錄（用於偵錯或重置狀態）
  void clearProcessedTransactions() {
    _processedTransactionIds.clear();
    debugPrint('🛒 已清除已處理交易記錄');
  }

  /// 重置購買狀態（用於從錯誤狀態恢復）
  void resetPurchaseState() {
    _currentTripId = null;
    _purchaseStartTime = null;
    _purchaseStateController.add(PurchaseState.idle);
    debugPrint('🛒 已重置購買狀態');
  }

  /// 檢查是否正在購買中
  bool get isPurchasing {
    return _purchaseStartTime != null &&
        DateTime.now().difference(_purchaseStartTime!).inSeconds < 120;
  }

  /// 釋放資源
  void dispose() {
    _subscription?.cancel();
    _purchaseStateController.close();
    _errorController.close();
  }
}
