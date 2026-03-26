import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../data/bills_repository.dart';
import '../../../shared/models/bill_model.dart';
import '../../../core/config/theme.dart';
import '../../../shared/widgets/animated_widgets.dart';
import '../../../shared/utils/error_handler.dart';
import '../../../shared/utils/category_utils.dart';
import '../../../core/utils/currency_utils.dart';
import '../../../core/services/ad_service.dart';
import '../../../shared/widgets/banner_ad_widget.dart';
import '../../purchase/providers/purchase_providers.dart';

class BillDetailPage extends ConsumerStatefulWidget {
  final String tripId;
  final String billId;

  const BillDetailPage({
    super.key,
    required this.tripId,
    required this.billId,
  });

  @override
  ConsumerState<BillDetailPage> createState() => _BillDetailPageState();
}

class _BillDetailPageState extends ConsumerState<BillDetailPage> {
  Bill? _bill;
  bool _isLoading = true;
  bool _isDeleting = false;

  @override
  void initState() {
    super.initState();
    _loadBill();
  }

  Future<void> _loadBill() async {
    try {
      final bill = await ref.read(billsRepositoryProvider).getBillDetail(widget.billId);
      setState(() {
        _bill = bill;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ErrorHandler.showErrorSnackBar(context, e, prefix: '載入失敗');
      }
    }
  }

  Future<void> _deleteBill() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => _DeleteConfirmDialog(),
    );

    if (confirmed != true) return;

    setState(() => _isDeleting = true);

    try {
      await ref.read(billsRepositoryProvider).deleteBill(widget.billId);
      if (mounted) {
        ErrorHandler.showSuccessSnackBar(context, '帳單已刪除');
        context.pop(true); // 返回 true 表示有刪除資料，需要刷新
      }
    } catch (e) {
      if (mounted) {
        ErrorHandler.showErrorSnackBar(context, e, prefix: '刪除失敗');
      }
    } finally {
      if (mounted) {
        setState(() => _isDeleting = false);
      }
    }
  }

  void _editBill() async {
    final result = await context.push('/trips/${widget.tripId}/bill/${widget.billId}/edit');
    if (result == true && mounted) {
      _loadBill(); // 刷新帳單詳情
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('帳單詳情')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator()
                  .animate(onPlay: (c) => c.repeat())
                  .rotate(duration: 1000.ms),
              const SizedBox(height: 16),
              Text('載入中...', style: TextStyle(color: Colors.grey[500])),
            ],
          ),
        ),
      );
    }

    if (_bill == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('帳單詳情')),
        body: EmptyStateWidget(
          icon: Icons.error_outline_rounded,
          title: '無法載入帳單資訊',
          subtitle: '請檢查網路連線後重試',
          action: GradientButton(
            label: '返回',
            icon: Icons.arrow_back_rounded,
            gradient: AppTheme.primaryGradient,
            onPressed: () => context.pop(),
            width: 120,
          ),
        ),
      );
    }

    final categoryColor = AppTheme.categoryColors[_bill!.category] ?? Colors.grey;
    final categoryGradient = AppTheme.categoryGradients[_bill!.category];
    final dateFormat = DateFormat('yyyy/MM/dd HH:mm');

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // 標頭
          SliverAppBar(
            expandedHeight: 220,
            floating: false,
            pinned: true,
            stretch: true,
            backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
            flexibleSpace: FlexibleSpaceBar(
              titlePadding: const EdgeInsets.only(left: 56, bottom: 16, right: 56),
              title: Text(
                _bill!.title,
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  letterSpacing: -0.5,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              background: _buildHeaderBackground(categoryGradient, categoryColor),
            ),
            actions: [
              IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.edit_rounded, color: Colors.white),
                ),
                onPressed: _editBill,
                tooltip: '編輯',
              ),
              IconButton(
                icon: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.delete_rounded, color: Colors.white),
                ),
                onPressed: _isDeleting ? null : _deleteBill,
                tooltip: '刪除',
              ),
              const SizedBox(width: 8),
            ],
          ),

          // 金額卡片
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: _AmountCard(
                bill: _bill!,
                categoryColor: categoryColor,
                categoryGradient: categoryGradient,
              ),
            ),
          ),

          // 帳單資訊
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: _InfoSection(bill: _bill!, dateFormat: dateFormat),
            ),
          ),

          // 品項明細（細項分攤模式）
          if (_bill!.splitType == 'ITEMIZED' && _bill!.items != null && _bill!.items!.isNotEmpty)
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
                child: _ItemsSection(items: _bill!.items!, currency: _bill!.currency),
              ),
            ),

          // 分攤明細標題
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
              child: Row(
                children: [
                  Icon(Icons.people_rounded, size: 20, color: AppTheme.primaryColor),
                  const SizedBox(width: 8),
                  Text(
                    _bill!.splitType == 'ITEMIZED' ? '每人總計' : '分攤明細',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${_bill!.shares.length} 人',
                      style: TextStyle(
                        color: AppTheme.primaryColor,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              )
                  .animate(delay: 400.ms)
                  .fadeIn(duration: 400.ms)
                  .slideX(begin: -0.1, end: 0),
            ),
          ),

          // 分攤列表
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
            sliver: SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final share = _bill!.shares[index];
                  final isPayer = _bill!.isVirtualPayer
                      ? (share.isVirtual && share.virtualMemberId == _bill!.virtualPayerId)
                      : (share.userId != null && share.userId == _bill!.payerId);
                  return _ShareItem(
                    share: share,
                    index: index,
                    isPayer: isPayer,
                    currency: _bill!.currency,
                  );
                },
                childCount: _bill!.shares.length,
              ),
            ),
          ),

          // Inline 廣告
          if (!ref.watch(isAdFreeProvider) && ref.watch(adInitializedProvider))
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: const InlineBannerAd(margin: EdgeInsets.zero),
              ),
            ),

          // 收據圖片（如果有）
          if (_bill!.receiptImage != null)
            SliverToBoxAdapter(
              child: _ReceiptSection(imageUrl: _bill!.receiptImage!),
            ),
        ],
      ),
    );
  }

  Widget _buildHeaderBackground(LinearGradient? gradient, Color color) {
    return Container(
      decoration: BoxDecoration(
        gradient: gradient ?? LinearGradient(colors: [color, color.withValues(alpha: 0.8)]),
      ),
      child: Stack(
        children: [
          Positioned(
            right: -50,
            top: -50,
            child: Container(
              width: 200,
              height: 200,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.1),
              ),
            ),
          ),
          Positioned(
            left: -30,
            bottom: -30,
            child: Container(
              width: 150,
              height: 150,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.08),
              ),
            ),
          ),
          Positioned(
            right: 30,
            bottom: 80,
            child: Icon(
              CategoryUtils.getIcon(_bill!.category),
              size: 80,
              color: Colors.white.withValues(alpha: 0.2),
            ),
          ),
        ],
      ),
    );
  }
}

class _AmountCard extends StatelessWidget {
  final Bill bill;
  final Color categoryColor;
  final LinearGradient? categoryGradient;

  const _AmountCard({
    required this.bill,
    required this.categoryColor,
    required this.categoryGradient,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: isDark ? null : AppTheme.mediumShadow,
      ),
      child: Column(
        children: [
          // 金額
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                CurrencyUtils.getSymbol(bill.currency),
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w500,
                  color: categoryColor,
                ),
              ),
              const SizedBox(width: 4),
              TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: bill.amount),
                duration: const Duration(milliseconds: 1000),
                curve: Curves.easeOut,
                builder: (context, value, child) {
                  return Text(
                    CurrencyUtils.formatAmountNumber(value, bill.currency),
                    style: TextStyle(
                      fontSize: 48,
                      fontWeight: FontWeight.bold,
                      color: categoryColor,
                      letterSpacing: -2,
                    ),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 16),

          // 分類和分攤方式
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _TagChip(
                icon: CategoryUtils.getIcon(bill.category),
                label: BillCategory.fromValue(bill.category).label,
                color: categoryColor,
              ),
              const SizedBox(width: 12),
              _TagChip(
                icon: Icons.pie_chart_rounded,
                label: SplitType.fromValue(bill.splitType).label,
                color: AppTheme.secondaryColor,
              ),
            ],
          ),
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 500.ms)
        .slideY(begin: 0.2, end: 0, duration: 500.ms);
  }
}

class _TagChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _TagChip({
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoSection extends StatelessWidget {
  final Bill bill;
  final DateFormat dateFormat;

  const _InfoSection({
    required this.bill,
    required this.dateFormat,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: isDark ? null : AppTheme.softShadow,
      ),
      child: Column(
        children: [
          _InfoRow(
            icon: bill.isVirtualPayer ? Icons.person_outline : Icons.person_rounded,
            label: '付款人',
            value: bill.isVirtualPayer ? '${bill.payerName}（虛擬）' : bill.payerName,
            gradient: bill.isVirtualPayer
                ? LinearGradient(colors: [Colors.orange[400]!, Colors.orange[600]!])
                : AppTheme.primaryGradient,
          ),
          const Divider(height: 24),
          _InfoRow(
            icon: Icons.access_time_rounded,
            label: '付款時間',
            value: dateFormat.format(bill.paidAt),
            gradient: AppTheme.secondaryGradient,
          ),
          if (bill.note != null && bill.note!.isNotEmpty) ...[
            const Divider(height: 24),
            _InfoRow(
              icon: Icons.note_rounded,
              label: '備註',
              value: bill.note!,
              gradient: AppTheme.warmGradient,
            ),
          ],
          // 收據圖片
          if (bill.receiptImage != null && bill.receiptImage!.isNotEmpty) ...[
            const Divider(height: 24),
            _ReceiptImageSection(imageData: bill.receiptImage!),
          ],
        ],
      ),
    )
        .animate(delay: 200.ms)
        .fadeIn(duration: 400.ms)
        .slideY(begin: 0.1, end: 0);
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final LinearGradient gradient;

  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.gradient,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        GradientIconBox(
          icon: icon,
          gradient: gradient,
          size: 40,
          iconSize: 20,
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey[500],
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// 收據圖片區塊 - 支援 Base64 編碼的圖片資料
class _ReceiptImageSection extends StatelessWidget {
  final String imageData;

  const _ReceiptImageSection({required this.imageData});

  Uint8List? _decodeBase64Image() {
    try {
      String base64String = imageData;
      // 移除 data URI 前綴 (如 "data:image/jpeg;base64,")
      if (base64String.contains(',')) {
        base64String = base64String.split(',').last;
      }
      return base64Decode(base64String);
    } catch (e) {
      return null;
    }
  }

  void _showFullScreenImage(BuildContext context, Uint8List imageBytes) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => _FullScreenImageViewer(imageBytes: imageBytes),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final imageBytes = _decodeBase64Image();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            GradientIconBox(
              icon: Icons.receipt_long_rounded,
              gradient: AppTheme.successGradient,
              size: 40,
              iconSize: 20,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '收據',
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey[500],
                    ),
                  ),
                  const SizedBox(height: 2),
                  const Text(
                    '點擊查看大圖',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (imageBytes != null)
          GestureDetector(
            onTap: () => _showFullScreenImage(context, imageBytes),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.memory(
                imageBytes,
                height: 150,
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return _buildErrorWidget();
                },
              ),
            ),
          )
        else
          _buildErrorWidget(),
      ],
    );
  }

  Widget _buildErrorWidget() {
    return Container(
      height: 100,
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.grey[200],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.broken_image_rounded, size: 32, color: Colors.grey[400]),
          const SizedBox(height: 8),
          Text('無法載入圖片', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
        ],
      ),
    );
  }
}

/// 全螢幕圖片檢視器
class _FullScreenImageViewer extends StatelessWidget {
  final Uint8List imageBytes;

  const _FullScreenImageViewer({required this.imageBytes});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        title: const Text(
          '收據照片',
          style: TextStyle(color: Colors.white),
        ),
      ),
      body: Center(
        child: InteractiveViewer(
          minScale: 0.5,
          maxScale: 4.0,
          child: Image.memory(
            imageBytes,
            fit: BoxFit.contain,
          ),
        ),
      ),
    );
  }
}

/// 品項明細區塊（細項分攤模式）
class _ItemsSection extends StatelessWidget {
  final List<BillItem> items;
  final Currency currency;

  const _ItemsSection({required this.items, required this.currency});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: isDark ? null : AppTheme.softShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 標題
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                GradientIconBox(
                  icon: Icons.list_alt_rounded,
                  gradient: AppTheme.warmGradient,
                  size: 40,
                  iconSize: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '品項明細',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '共 ${items.length} 個品項',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[500],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Divider(height: 1, color: Colors.grey.withValues(alpha: 0.1)),

          // 品項列表
          ...items.asMap().entries.map((entry) {
            final index = entry.key;
            final item = entry.value;
            return _buildItemRow(context, item, index, isDark);
          }),
        ],
      ),
    )
        .animate(delay: 300.ms)
        .fadeIn(duration: 400.ms)
        .slideY(begin: 0.1, end: 0);
  }

  Widget _buildItemRow(BuildContext context, BillItem item, int index, bool isDark) {
    // 計算參與者名稱
    final participantNames = item.shares.map((s) => s.userName).join('、');
    final perPerson = item.shares.isNotEmpty ? item.amount / item.shares.length : 0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border(
          bottom: index < items.length - 1
              ? BorderSide(color: Colors.grey.withValues(alpha: 0.1))
              : BorderSide.none,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 品項名稱和金額
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  gradient: AppTheme.warmGradient,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Text(
                    '${index + 1}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  item.name,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              Text(
                CurrencyUtils.formatAmount(item.amount, currency),
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          // 參與者資訊
          Row(
            children: [
              const SizedBox(width: 40), // 對齊
              Icon(
                Icons.people_outline_rounded,
                size: 14,
                color: Colors.grey[500],
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  participantNames,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            children: [
              const SizedBox(width: 40), // 對齊
              Text(
                '每人 ${CurrencyUtils.formatAmount(perPerson, currency)}',
                style: TextStyle(
                  fontSize: 12,
                  color: AppTheme.primaryColor,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ShareItem extends StatelessWidget {
  final BillShare share;
  final int index;
  final bool isPayer;
  final Currency currency;

  const _ShareItem({
    required this.share,
    required this.index,
    required this.isPayer,
    required this.currency,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedCard(
      delayMs: 450 + index * 60,
      child: Row(
        children: [
          // 頭像
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              gradient: share.isVirtual
                  ? LinearGradient(colors: [Colors.orange[400]!, Colors.orange[600]!])
                  : AppTheme.categoryGradients.values.elementAt(index % 6),
              borderRadius: BorderRadius.circular(12),
              border: share.isVirtual
                  ? Border.all(color: Colors.orange, width: 1.5)
                  : null,
            ),
            child: Center(
              child: share.isVirtual
                  ? const Icon(Icons.person_outline, color: Colors.white, size: 20)
                  : Text(
                      share.userName[0].toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
            ),
          ),
          const SizedBox(width: 14),

          // 名稱
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        share.userName,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (share.isVirtual) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.orange.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          '虛擬',
                          style: TextStyle(
                            color: Colors.orange[700],
                            fontSize: 10,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                    if (isPayer) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          gradient: AppTheme.primaryGradient,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Text(
                          '付款人',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '分攤金額',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[500],
                  ),
                ),
              ],
            ),
          ),

          // 金額
          Text(
            CurrencyUtils.formatAmount(share.amount, currency),
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.bold,
              letterSpacing: -0.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _ReceiptSection extends StatelessWidget {
  final String imageUrl;

  const _ReceiptSection({required this.imageUrl});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.receipt_long_rounded, size: 20, color: AppTheme.primaryColor),
              const SizedBox(width: 8),
              const Text(
                '收據照片',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  letterSpacing: -0.3,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Image.network(
              imageUrl,
              fit: BoxFit.cover,
              loadingBuilder: (context, child, loadingProgress) {
                if (loadingProgress == null) return child;
                return Container(
                  height: 200,
                  color: Colors.grey[200],
                  child: const Center(child: CircularProgressIndicator()),
                );
              },
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  height: 200,
                  color: Colors.grey[200],
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.broken_image_rounded, size: 48, color: Colors.grey[400]),
                      const SizedBox(height: 8),
                      Text('無法載入圖片', style: TextStyle(color: Colors.grey[500])),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    )
        .animate(delay: 600.ms)
        .fadeIn(duration: 400.ms);
  }
}

class _DeleteConfirmDialog extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: AppTheme.categoryColors['FOOD']!.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Icon(
                Icons.delete_rounded,
                size: 32,
                color: AppTheme.categoryColors['FOOD'],
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              '確認刪除',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              '確定要刪除這筆帳單嗎？\n此操作無法復原。',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 15,
                color: Colors.grey[600],
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context, false),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text('取消'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: GradientButton(
                    label: '刪除',
                    gradient: AppTheme.dangerGradient,
                    onPressed: () => Navigator.pop(context, true),
                    height: 48,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    )
        .animate()
        .fadeIn(duration: 200.ms)
        .scale(begin: const Offset(0.9, 0.9), end: const Offset(1, 1));
  }
}
