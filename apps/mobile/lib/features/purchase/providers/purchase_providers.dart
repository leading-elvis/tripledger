import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/purchase_repository.dart';
import '../domain/models/purchase_models.dart';
import '../domain/purchase_service.dart';

/// PurchaseService 單例（自動初始化）
final purchaseServiceProvider = Provider<PurchaseService>((ref) {
  final repository = ref.read(purchaseRepositoryProvider);
  final service = PurchaseService(repository);

  // 自動初始化（fire and forget，錯誤會在 service 內部處理）
  service.initialize();

  ref.onDispose(() => service.dispose());
  return service;
});

/// PurchaseService 初始化狀態
final purchaseServiceInitializedProvider = FutureProvider<bool>((ref) async {
  final service = ref.read(purchaseServiceProvider);
  await service.ensureInitialized();
  return service.isAvailable;
});

/// 用戶去廣告狀態
final adFreeStatusProvider = FutureProvider<AdFreeStatus>((ref) async {
  final repository = ref.read(purchaseRepositoryProvider);
  return repository.getAdFreeStatus();
});

/// 是否去廣告（簡化版本）
final isAdFreeProvider = Provider<bool>((ref) {
  final status = ref.watch(adFreeStatusProvider);
  return status.maybeWhen(
    data: (s) => s.isAdFree,
    orElse: () => false,
  );
});

/// 旅程進階狀態
final tripPremiumStatusProvider =
    FutureProvider.family<TripPremiumStatus, String>((ref, tripId) async {
  final repository = ref.read(purchaseRepositoryProvider);
  return repository.getTripPremiumStatus(tripId);
});

/// 旅程是否為進階版（簡化版本）
final isTripPremiumProvider = Provider.family<bool, String>((ref, tripId) {
  final status = ref.watch(tripPremiumStatusProvider(tripId));
  return status.maybeWhen(
    data: (s) => s.isPremium,
    orElse: () => false,
  );
});

/// 購買歷史
final purchaseHistoryProvider = FutureProvider<List<PurchaseRecord>>((ref) async {
  final repository = ref.read(purchaseRepositoryProvider);
  return repository.getPurchaseHistory();
});

/// 可購買產品清單
final productsProvider = FutureProvider<List<ProductInfo>>((ref) async {
  final repository = ref.read(purchaseRepositoryProvider);
  return repository.getProducts();
});

/// 進階功能存取守衛（檢查是否可使用進階功能）
final canAccessPremiumFeatureProvider =
    Provider.family<AsyncValue<bool>, String>((ref, tripId) {
  final status = ref.watch(tripPremiumStatusProvider(tripId));
  return status.whenData((s) => s.isPremium);
});

/// 刷新進階狀態
void refreshPremiumStatus(WidgetRef ref, String tripId) {
  ref.invalidate(tripPremiumStatusProvider(tripId));
}

/// 刷新去廣告狀態
void refreshAdFreeStatus(WidgetRef ref) {
  ref.invalidate(adFreeStatusProvider);
}

/// 刷新購買歷史
void refreshPurchaseHistory(WidgetRef ref) {
  ref.invalidate(purchaseHistoryProvider);
}
