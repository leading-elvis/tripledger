import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:in_app_purchase/in_app_purchase.dart';
import '../../../core/config/theme.dart';
import '../../../shared/utils/error_handler.dart';
import '../domain/purchase_service.dart';
import '../providers/purchase_providers.dart';

/// 付費牆對話框 - 顯示升級選項
class PaywallDialog extends ConsumerStatefulWidget {
  final String tripId;
  final String featureName;

  const PaywallDialog({
    super.key,
    required this.tripId,
    required this.featureName,
  });

  /// 顯示付費牆
  static Future<bool?> show(
    BuildContext context, {
    required String tripId,
    required String featureName,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => PaywallDialog(
        tripId: tripId,
        featureName: featureName,
      ),
    );
  }

  @override
  ConsumerState<PaywallDialog> createState() => _PaywallDialogState();
}

class _PaywallDialogState extends ConsumerState<PaywallDialog> {
  String? _selectedProductId;
  bool _isPurchasing = false;
  VoidCallback? _unregisterSuccessCallback;
  VoidCallback? _unregisterErrorCallback;

  @override
  void initState() {
    super.initState();
    // 預設選擇 7 天方案
    _selectedProductId = ProductIds.tripPremium7d;

    // 註冊回調（使用唯一 key 避免被覆蓋）
    final purchaseService = ref.read(purchaseServiceProvider);
    final callbackKey = 'paywall_${widget.tripId}_${hashCode}';
    _unregisterSuccessCallback = purchaseService.registerSuccessCallback(
      callbackKey,
      _onPurchaseSuccess,
    );
    _unregisterErrorCallback = purchaseService.registerErrorCallback(
      callbackKey,
      _onPurchaseError,
    );
  }

  @override
  void dispose() {
    // 取消註冊回調
    _unregisterSuccessCallback?.call();
    _unregisterErrorCallback?.call();
    super.dispose();
  }

  void _onPurchaseSuccess(String productId, String? tripId) {
    if (!mounted) return;
    setState(() => _isPurchasing = false);
    // 刷新進階狀態
    refreshPremiumStatus(ref, widget.tripId);
    // 關閉對話框並返回成功
    Navigator.of(context).pop(true);
    ErrorHandler.showSuccessSnackBar(context, '升級成功！');
  }

  void _onPurchaseError(String error) {
    if (!mounted) return;
    setState(() => _isPurchasing = false);
    ErrorHandler.showErrorSnackBar(context, error);
  }

  Future<void> _purchase() async {
    if (_selectedProductId == null) return;

    setState(() => _isPurchasing = true);

    final purchaseService = ref.read(purchaseServiceProvider);
    await purchaseService.buyProduct(
      _selectedProductId!,
      tripId: widget.tripId,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final purchaseService = ref.watch(purchaseServiceProvider);
    final products = purchaseService.products;
    final premiumStatus = ref.watch(tripPremiumStatusProvider(widget.tripId));

    // 取得當前剩餘天數
    final currentRemainingDays = premiumStatus.maybeWhen(
      data: (status) => status.isPremium ? status.remainingDays : null,
      orElse: () => null,
    );
    final isExtending = currentRemainingDays != null;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 拖曳指示器
            Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            // 標題區
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: isExtending ? AppTheme.warmGradient : AppTheme.primaryGradient,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isExtending ? Icons.add_circle_rounded : Icons.lock_open_rounded,
                      color: Colors.white,
                      size: 32,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    isExtending ? '延長進階版' : '解鎖「${widget.featureName}」',
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    isExtending
                        ? '目前剩餘 $currentRemainingDays 天，購買後會累計天數'
                        : '升級進階版即可使用此功能',
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 14,
                    ),
                  ),
                  // 如果是延長，顯示累計提示
                  if (isExtending) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppTheme.secondaryColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.info_outline_rounded,
                            color: AppTheme.secondaryColor,
                            size: 16,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            '天數會自動累加',
                            style: TextStyle(
                              color: AppTheme.secondaryColor,
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),

            // 功能清單
            _buildFeatureList(isDark),

            const SizedBox(height: 16),

            // 診斷訊息（產品未載入時顯示）
            if (products.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.orange.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.orange.withValues(alpha: 0.3)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 20),
                          const SizedBox(width: 8),
                          const Expanded(
                            child: Text(
                              '無法載入產品資訊',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Colors.orange,
                              ),
                            ),
                          ),
                          // 重新載入按鈕
                          GestureDetector(
                            onTap: () async {
                              await purchaseService.loadProducts();
                              if (mounted) setState(() {});
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.orange,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                '重試',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '診斷資訊:\n'
                        '• IAP 可用: ${purchaseService.isAvailable}\n'
                        '• 找不到的產品: ${purchaseService.notFoundIds.isEmpty ? "無" : purchaseService.notFoundIds.join(", ")}\n'
                        '• 錯誤: ${purchaseService.lastError ?? "無"}\n\n'
                        '請確認:\n'
                        '1. Paid Applications 合約狀態為 Active\n'
                        '2. 合約生效可能需要幾小時\n'
                        '3. 已使用 Sandbox 帳號登入',
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey[600],
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            if (products.isEmpty) const SizedBox(height: 16),

            // 價格方案
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  _buildPriceCard(
                    products,
                    ProductIds.tripPremium3d,
                    '3 天',
                    isDark,
                  ),
                  const SizedBox(width: 8),
                  _buildPriceCard(
                    products,
                    ProductIds.tripPremium7d,
                    '7 天',
                    isDark,
                    recommended: true,
                  ),
                  const SizedBox(width: 8),
                  _buildPriceCard(
                    products,
                    ProductIds.tripPremium30d,
                    '30 天',
                    isDark,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // 購買按鈕
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: SizedBox(
                width: double.infinity,
                child: Container(
                  decoration: BoxDecoration(
                    gradient: AppTheme.primaryGradient,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: AppTheme.coloredShadow,
                  ),
                  child: ElevatedButton(
                    onPressed: _isPurchasing ? null : _purchase,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: _isPurchasing
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2,
                            ),
                          )
                        : const Text(
                            '立即升級',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 12),

            // 備註
            Text(
              isExtending
                  ? '購買後天數自動累加・僅限此旅程'
                  : '僅限此旅程・到期後自動降級',
              style: TextStyle(
                color: Colors.grey[500],
                fontSize: 12,
              ),
            ),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildFeatureList(bool isDark) {
    final features = [
      ('智慧收據掃描', Icons.document_scanner_rounded),
      ('虛擬人員', Icons.person_outline_rounded),
      ('電子發票整合', Icons.receipt_long_rounded),
      ('無限成員數量', Icons.group_rounded),
      ('無限帳單數量', Icons.receipt_rounded),
    ];

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.05)
            : AppTheme.primaryColor.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.1)
              : AppTheme.primaryColor.withValues(alpha: 0.1),
        ),
      ),
      child: Column(
        children: features
            .map(
              (f) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  children: [
                    Icon(
                      f.$2,
                      color: AppTheme.primaryColor,
                      size: 20,
                    ),
                    const SizedBox(width: 12),
                    Text(
                      f.$1,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const Spacer(),
                    Icon(
                      Icons.check_circle_rounded,
                      color: AppTheme.secondaryColor,
                      size: 18,
                    ),
                  ],
                ),
              ),
            )
            .toList(),
      ),
    );
  }

  Widget _buildPriceCard(
    List<ProductDetails> products,
    String productId,
    String label,
    bool isDark, {
    bool recommended = false,
  }) {
    final isSelected = _selectedProductId == productId;
    final product = products.where((p) => p.id == productId).firstOrNull;
    final price = product?.price ?? '---';

    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedProductId = productId),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
          decoration: BoxDecoration(
            color: isSelected
                ? AppTheme.primaryColor.withValues(alpha: 0.1)
                : isDark
                    ? Colors.white.withValues(alpha: 0.05)
                    : Colors.grey.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected
                  ? AppTheme.primaryColor
                  : Colors.transparent,
              width: 2,
            ),
          ),
          child: Column(
            children: [
              if (recommended)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    gradient: AppTheme.primaryGradient,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    '推薦',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              Text(
                label,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: isSelected ? AppTheme.primaryColor : null,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                price,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? AppTheme.primaryColor : null,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 去廣告購買對話框
class RemoveAdsDialog extends ConsumerStatefulWidget {
  const RemoveAdsDialog({super.key});

  static Future<bool?> show(BuildContext context) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const RemoveAdsDialog(),
    );
  }

  @override
  ConsumerState<RemoveAdsDialog> createState() => _RemoveAdsDialogState();
}

class _RemoveAdsDialogState extends ConsumerState<RemoveAdsDialog> {
  bool _isPurchasing = false;
  VoidCallback? _unregisterSuccessCallback;
  VoidCallback? _unregisterErrorCallback;

  @override
  void initState() {
    super.initState();
    // 註冊回調（使用唯一 key 避免被覆蓋）
    final purchaseService = ref.read(purchaseServiceProvider);
    final callbackKey = 'remove_ads_$hashCode';
    _unregisterSuccessCallback = purchaseService.registerSuccessCallback(
      callbackKey,
      _onPurchaseSuccess,
    );
    _unregisterErrorCallback = purchaseService.registerErrorCallback(
      callbackKey,
      _onPurchaseError,
    );
  }

  @override
  void dispose() {
    _unregisterSuccessCallback?.call();
    _unregisterErrorCallback?.call();
    super.dispose();
  }

  void _onPurchaseSuccess(String productId, String? tripId) {
    if (!mounted) return;
    setState(() => _isPurchasing = false);
    refreshAdFreeStatus(ref);
    Navigator.of(context).pop(true);
    ErrorHandler.showSuccessSnackBar(context, '購買成功！廣告已移除');
  }

  void _onPurchaseError(String error) {
    if (!mounted) return;
    setState(() => _isPurchasing = false);
    ErrorHandler.showErrorSnackBar(context, error);
  }

  Future<void> _purchase() async {
    setState(() => _isPurchasing = true);
    final purchaseService = ref.read(purchaseServiceProvider);
    await purchaseService.buyProduct(ProductIds.removeAdsForever);
  }

  Future<void> _restore() async {
    setState(() => _isPurchasing = true);
    try {
      final purchaseService = ref.read(purchaseServiceProvider);
      final result = await purchaseService.restorePurchases();
      if (!mounted) return;

      if (result.adFreeRestored) {
        refreshAdFreeStatus(ref);
        Navigator.of(context).pop(true);
        ErrorHandler.showSuccessSnackBar(context, '已恢復去廣告購買！');
      } else if (result.hasRestoredPurchases) {
        ErrorHandler.showSuccessSnackBar(context, '已恢復 ${result.restoredCount} 筆購買');
      } else {
        ErrorHandler.showErrorSnackBar(context, '沒有找到可恢復的購買');
      }
    } catch (e) {
      if (!mounted) return;
      ErrorHandler.showErrorSnackBar(context, '恢復購買失敗');
    } finally {
      if (mounted) {
        setState(() => _isPurchasing = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final purchaseService = ref.watch(purchaseServiceProvider);
    final product = purchaseService.products
        .where((p) => p.id == ProductIds.removeAdsForever)
        .firstOrNull;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 拖曳指示器
            Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),

            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: AppTheme.secondaryGradient,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.block_rounded,
                      color: Colors.white,
                      size: 32,
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    '永久去廣告',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '一次購買，永久移除所有廣告',
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    product?.price ?? '---',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // 購買按鈕
                  SizedBox(
                    width: double.infinity,
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: AppTheme.primaryGradient,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: ElevatedButton(
                        onPressed: _isPurchasing ? null : _purchase,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.transparent,
                          shadowColor: Colors.transparent,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                        child: _isPurchasing
                            ? const SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(
                                  color: Colors.white,
                                  strokeWidth: 2,
                                ),
                              )
                            : const Text(
                                '立即購買',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 12),

                  // 恢復購買
                  TextButton(
                    onPressed: _isPurchasing ? null : _restore,
                    child: Text(
                      '恢復購買',
                      style: TextStyle(
                        color: AppTheme.primaryColor,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
