import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:in_app_purchase/in_app_purchase.dart';

import '../../../core/config/theme.dart';
import '../../../shared/utils/error_handler.dart';
import '../../trips/data/trips_repository.dart';
import '../domain/purchase_service.dart';
import '../providers/purchase_providers.dart';

/// 免費版 vs 進階版比較畫面
///
/// [tripId] 有值時顯示價格方案和購買按鈕；無值時僅展示比較
class PremiumComparisonSheet extends ConsumerStatefulWidget {
  final String? tripId;

  const PremiumComparisonSheet({super.key, this.tripId});

  /// 顯示比較畫面
  static Future<bool?> show(BuildContext context, {String? tripId}) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => PremiumComparisonSheet(tripId: tripId),
    );
  }

  @override
  ConsumerState<PremiumComparisonSheet> createState() =>
      _PremiumComparisonSheetState();
}

class _PremiumComparisonSheetState
    extends ConsumerState<PremiumComparisonSheet> {
  String? _selectedProductId;
  bool _isPurchasing = false;
  VoidCallback? _unregisterSuccessCallback;
  VoidCallback? _unregisterErrorCallback;

  bool get _hasTripId => widget.tripId != null;

  @override
  void initState() {
    super.initState();
    _selectedProductId = ProductIds.tripPremium7d;

    if (_hasTripId) {
      final purchaseService = ref.read(purchaseServiceProvider);
      final callbackKey = 'comparison_${widget.tripId}_$hashCode';
      _unregisterSuccessCallback = purchaseService.registerSuccessCallback(
        callbackKey,
        _onPurchaseSuccess,
      );
      _unregisterErrorCallback = purchaseService.registerErrorCallback(
        callbackKey,
        _onPurchaseError,
      );
    }
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
    refreshPremiumStatus(ref, widget.tripId!);
    Navigator.of(context).pop(true);
    ErrorHandler.showSuccessSnackBar(context, '升級成功！');
  }

  void _onPurchaseError(String error) {
    if (!mounted) return;
    setState(() => _isPurchasing = false);
    ErrorHandler.showErrorSnackBar(context, error);
  }

  Future<void> _purchase() async {
    if (_selectedProductId == null || !_hasTripId) return;
    setState(() => _isPurchasing = true);
    final purchaseService = ref.read(purchaseServiceProvider);
    await purchaseService.buyProduct(
      _selectedProductId!,
      tripId: widget.tripId!,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        child: SingleChildScrollView(
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
                padding: const EdgeInsets.fromLTRB(24, 20, 24, 0),
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        gradient: AppTheme.warmGradient,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.workspace_premium_rounded,
                        color: Colors.white,
                        size: 28,
                      ),
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      '方案比較',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '了解免費版與進階版的差異',
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // 比較表格
              _buildComparisonTable(isDark),

              const SizedBox(height: 20),

              // 價格方案（有 tripId 時顯示）
              if (_hasTripId) ...[
                _buildPricingSection(isDark),
                const SizedBox(height: 16),
                _buildPurchaseButton(),
                const SizedBox(height: 10),
                Text(
                  '僅限此旅程・到期後自動降級',
                  style: TextStyle(
                    color: Colors.grey[500],
                    fontSize: 12,
                  ),
                ),
              ],

              // 無 tripId 時顯示旅程選擇
              if (!_hasTripId) ...[
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '選擇要升級的旅程',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : Colors.grey[800],
                        ),
                      ),
                      const SizedBox(height: 10),
                      _buildTripSelector(isDark),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  /// 旅程選擇列表
  Widget _buildTripSelector(bool isDark) {
    final tripsRepository = ref.read(tripsRepositoryProvider);

    return FutureBuilder(
      future: tripsRepository.getTrips(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
          );
        }

        if (snapshot.hasError || !snapshot.hasData || snapshot.data!.isEmpty) {
          return Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.05)
                  : Colors.grey.withValues(alpha: 0.06),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              '尚無旅程，請先建立旅程',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[500], fontSize: 14),
            ),
          );
        }

        final trips = snapshot.data!;
        return Container(
          constraints: const BoxConstraints(maxHeight: 180),
          decoration: BoxDecoration(
            color: isDark
                ? Colors.white.withValues(alpha: 0.05)
                : Colors.grey.withValues(alpha: 0.04),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.1)
                  : Colors.grey.withValues(alpha: 0.15),
            ),
          ),
          child: ListView.separated(
            shrinkWrap: true,
            padding: EdgeInsets.zero,
            itemCount: trips.length,
            separatorBuilder: (_, __) => Divider(
              height: 1,
              color: isDark
                  ? Colors.white.withValues(alpha: 0.06)
                  : Colors.grey.withValues(alpha: 0.1),
            ),
            itemBuilder: (context, index) {
              final trip = trips[index];
              return ListTile(
                dense: true,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.vertical(
                    top: index == 0
                        ? const Radius.circular(12)
                        : Radius.zero,
                    bottom: index == trips.length - 1
                        ? const Radius.circular(12)
                        : Radius.zero,
                  ),
                ),
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    Icons.luggage_rounded,
                    size: 18,
                    color: AppTheme.primaryColor,
                  ),
                ),
                title: Text(
                  trip.name,
                  style: const TextStyle(fontSize: 14),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                subtitle: Text(
                  '${trip.memberCount} 位成員',
                  style: TextStyle(fontSize: 12, color: Colors.grey[500]),
                ),
                trailing: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    gradient: AppTheme.warmGradient,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    '升級',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                onTap: () {
                  Navigator.of(context).pop();
                  PremiumComparisonSheet.show(context, tripId: trip.id);
                },
              );
            },
          ),
        );
      },
    );
  }

  /// 比較表格
  Widget _buildComparisonTable(bool isDark) {
    final items = [
      _ComparisonItem(
        icon: Icons.people_rounded,
        feature: '成員數量',
        free: '最多 5 人',
        premium: '無限制',
      ),
      _ComparisonItem(
        icon: Icons.receipt_rounded,
        feature: '帳單數量',
        free: '最多 50 筆',
        premium: '無限制',
      ),
      _ComparisonItem(
        icon: Icons.person_outline_rounded,
        feature: '虛擬人員',
        free: null,
        premium: '最多 5 人',
      ),
      _ComparisonItem(
        icon: Icons.document_scanner_rounded,
        feature: '收據掃描',
        free: null,
        premium: 'AI 辨識',
      ),
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        decoration: BoxDecoration(
          color: isDark
              ? Colors.white.withValues(alpha: 0.05)
              : Colors.grey.withValues(alpha: 0.04),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark
                ? Colors.white.withValues(alpha: 0.1)
                : Colors.grey.withValues(alpha: 0.15),
          ),
        ),
        child: Column(
          children: [
            // 表頭
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.05)
                    : AppTheme.primaryColor.withValues(alpha: 0.06),
                borderRadius:
                    const BorderRadius.vertical(top: Radius.circular(16)),
              ),
              child: Row(
                children: [
                  const Expanded(
                    flex: 5,
                    child: Text(
                      '功能',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 3,
                    child: Text(
                      '免費版',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        color: Colors.grey[600],
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 3,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        gradient: AppTheme.warmGradient,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        '進階版',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // 表格內容
            ...items.asMap().entries.map((entry) {
              final index = entry.key;
              final item = entry.value;
              final isLast = index == items.length - 1;
              return _buildComparisonRow(item, isDark, isLast: isLast);
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildComparisonRow(
    _ComparisonItem item,
    bool isDark, {
    bool isLast = false,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        border: isLast
            ? null
            : Border(
                bottom: BorderSide(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.06)
                      : Colors.grey.withValues(alpha: 0.1),
                ),
              ),
      ),
      child: Row(
        children: [
          // 功能名稱
          Expanded(
            flex: 5,
            child: Row(
              children: [
                Icon(item.icon, size: 16, color: AppTheme.primaryColor),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    item.feature,
                    style: const TextStyle(fontSize: 13),
                  ),
                ),
              ],
            ),
          ),
          // 免費版
          Expanded(
            flex: 3,
            child: item.free != null
                ? Text(
                    item.free!,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[500],
                    ),
                  )
                : Icon(
                    Icons.remove_rounded,
                    size: 16,
                    color: Colors.grey[400],
                  ),
          ),
          // 進階版
          Expanded(
            flex: 3,
            child: item.premium != null
                ? Text(
                    item.premium!,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.primaryColor,
                    ),
                  )
                : Icon(
                    Icons.check_circle_rounded,
                    size: 18,
                    color: AppTheme.secondaryColor,
                  ),
          ),
        ],
      ),
    );
  }

  /// 價格方案區
  Widget _buildPricingSection(bool isDark) {
    final purchaseService = ref.watch(purchaseServiceProvider);
    final products = purchaseService.products;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          _buildPriceCard(products, ProductIds.tripPremium3d, '3 天', isDark),
          const SizedBox(width: 8),
          _buildPriceCard(products, ProductIds.tripPremium7d, '7 天', isDark,
              recommended: true),
          const SizedBox(width: 8),
          _buildPriceCard(products, ProductIds.tripPremium30d, '30 天', isDark),
        ],
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
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
          decoration: BoxDecoration(
            color: isSelected
                ? AppTheme.primaryColor.withValues(alpha: 0.1)
                : isDark
                    ? Colors.white.withValues(alpha: 0.05)
                    : Colors.grey.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? AppTheme.primaryColor : Colors.transparent,
              width: 2,
            ),
          ),
          child: Column(
            children: [
              if (recommended)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  margin: const EdgeInsets.only(bottom: 6),
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

  /// 購買按鈕
  Widget _buildPurchaseButton() {
    return Padding(
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
    );
  }
}

/// 比較項目資料
class _ComparisonItem {
  final IconData icon;
  final String feature;
  final String? free; // null 表示不支援（顯示 —）
  final String? premium; // null 表示使用勾勾圖標

  const _ComparisonItem({
    required this.icon,
    required this.feature,
    this.free,
    this.premium,
  });
}
