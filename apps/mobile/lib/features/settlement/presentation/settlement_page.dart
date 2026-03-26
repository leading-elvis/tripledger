import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../data/settlement_repository.dart';
import '../../trips/data/trips_repository.dart';
import '../../../shared/models/settlement_model.dart';
import '../../../core/config/theme.dart';
import '../../../core/services/ad_frequency_service.dart';
import '../../../core/services/interstitial_ad_service.dart';
import '../../../core/storage/auth_storage.dart';
import '../../purchase/providers/purchase_providers.dart';
import '../../../core/utils/currency_utils.dart';
import '../../../shared/widgets/animated_widgets.dart';

class SettlementPage extends ConsumerStatefulWidget {
  final String tripId;

  const SettlementPage({super.key, required this.tripId});

  @override
  ConsumerState<SettlementPage> createState() => _SettlementPageState();
}

class _SettlementPageState extends ConsumerState<SettlementPage> {
  TripSummary? _summary;
  List<Settlement> _pendingSettlements = [];
  String? _currentUserId;
  bool _isLoading = true;
  Currency _tripCurrency = Currency.TWD;

  @override
  void initState() {
    super.initState();
    _loadData();
    // 預先載入插頁式廣告
    ref.read(interstitialAdServiceProvider).loadAd();
  }

  Future<void> _loadData() async {
    // 先取得當前用戶 ID（本地操作，不會失敗）
    final userId = await ref.read(authStorageProvider).getUserId();

    try {
      // 同時載入結算摘要、待處理結算和旅程資訊（取得預設貨幣）
      // 使用 eagerError: false 讓所有 future 都完成
      final results = await Future.wait<dynamic>(
        [
          ref.read(settlementRepositoryProvider).getTripSummary(widget.tripId),
          ref.read(settlementRepositoryProvider).getTripPendingSettlements(widget.tripId),
          ref.read(tripsRepositoryProvider).getTripDetail(widget.tripId),
        ],
        eagerError: false,
      );

      if (!mounted) return;

      // 檢查是否有錯誤
      final summaryResult = results[0];
      final settlementsResult = results[1];
      final tripResult = results[2];

      setState(() {
        _currentUserId = userId;
        if (summaryResult is TripSummary) {
          _summary = summaryResult;
        }
        if (settlementsResult is List<Settlement>) {
          _pendingSettlements = settlementsResult;
        }
        // 載入旅程預設貨幣
        if (tripResult != null && tripResult.defaultCurrency != null) {
          _tripCurrency = tripResult.defaultCurrency;
        }
        _isLoading = false;
      });

      // 如果有任何錯誤，顯示警告但不阻止顯示其他資料
      if (summaryResult is! TripSummary || settlementsResult is! List<Settlement>) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('部分資料載入失敗，請下拉重新整理'),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _currentUserId = userId;
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('載入失敗: $e'),
          backgroundColor: AppTheme.categoryColors['FOOD'],
        ),
      );
    }
  }

  Future<void> _loadSummary() async {
    await _loadData();
  }

  Future<void> _createSettlement(SuggestedSettlement settlement) async {
    // 確認對話框
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => _ConfirmSettlementDialog(
        settlement: settlement,
        currency: _tripCurrency,
      ),
    );

    if (confirmed != true) return;

    try {
      await ref.read(settlementRepositoryProvider).createSettlement(
            tripId: widget.tripId,
            receiverId: settlement.toIsVirtual ? null : settlement.toUserId,
            amount: settlement.amount,
            virtualPayerId: settlement.fromIsVirtual ? settlement.fromVirtualMemberId : null,
            virtualReceiverId: settlement.toIsVirtual ? settlement.toVirtualMemberId : null,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle_rounded,
                    color: Colors.white, size: 20),
                const SizedBox(width: 8),
                const Text('已發送結算請求，等待對方確認'),
              ],
            ),
            backgroundColor: AppTheme.categoryColors['TRANSPORT'],
          ),
        );
        _loadSummary();

        // 結算成功後顯示插頁式廣告（尊重去廣告購買 + 頻率控制）
        final isAdFree = ref.read(isAdFreeProvider);
        final adFrequency = ref.read(adFrequencyServiceProvider);
        if (!isAdFree &&
            adFrequency.canShowInterstitial(actionKey: 'settlement_create')) {
          final shown = await ref.read(interstitialAdServiceProvider).showAd();
          if (shown) adFrequency.recordInterstitialShown();
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('操作失敗: $e'),
            backgroundColor: AppTheme.categoryColors['FOOD'],
          ),
        );
      }
    }
  }

  Future<void> _confirmSettlement(Settlement settlement) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('確認收款'),
        content: Text(
          '確認已收到 ${settlement.payerName} 支付的 ${CurrencyUtils.formatAmount(settlement.amount, _tripCurrency)} 嗎？',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: Text('取消', style: TextStyle(color: Colors.grey[600])),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            style: FilledButton.styleFrom(backgroundColor: AppTheme.primaryColor),
            child: const Text('確認收款'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await ref.read(settlementRepositoryProvider).confirmSettlement(settlement.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                const Text('已確認收款'),
              ],
            ),
            backgroundColor: const Color(0xFF10B981),
          ),
        );
        _loadData();

        // 確認結算後顯示插頁式廣告（尊重去廣告購買 + 頻率控制）
        final isAdFree2 = ref.read(isAdFreeProvider);
        final adFrequency2 = ref.read(adFrequencyServiceProvider);
        if (!isAdFree2 &&
            adFrequency2.canShowInterstitial(
                actionKey: 'settlement_confirm')) {
          final shown =
              await ref.read(interstitialAdServiceProvider).showAd();
          if (shown) adFrequency2.recordInterstitialShown();
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('操作失敗: $e'),
            backgroundColor: AppTheme.categoryColors['FOOD'],
          ),
        );
      }
    }
  }

  Future<void> _cancelSettlement(Settlement settlement) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('取消結算'),
        content: Text(
          '確定要取消這筆 ${CurrencyUtils.formatAmount(settlement.amount, _tripCurrency)} 的結算請求嗎？',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: Text('返回', style: TextStyle(color: Colors.grey[600])),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFFEF4444)),
            child: const Text('確定取消'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await ref.read(settlementRepositoryProvider).cancelSettlement(settlement.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.info_rounded, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                const Text('已取消結算請求'),
              ],
            ),
            backgroundColor: Colors.grey[700],
          ),
        );
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('操作失敗: $e'),
            backgroundColor: AppTheme.categoryColors['FOOD'],
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      body: _isLoading
          ? _buildLoadingState()
          : _summary == null
              ? _buildErrorState()
              : RefreshIndicator(
                  onRefresh: _loadSummary,
                  child: CustomScrollView(
                    slivers: [
                      // App Bar
                      SliverAppBar(
                        expandedHeight: 200,
                        floating: false,
                        pinned: true,
                        stretch: true,
                        backgroundColor: isDark
                            ? const Color(0xFF0F172A)
                            : const Color(0xFFF8FAFC),
                        flexibleSpace: FlexibleSpaceBar(
                          titlePadding:
                              const EdgeInsets.only(left: 56, bottom: 16),
                          title: const Text(
                            '結算',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              letterSpacing: -0.5,
                            ),
                          ),
                          background: _buildHeaderBackground(),
                        ),
                      ),

                      // 統計卡片
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                          child: Row(
                            children: [
                              Expanded(
                                child: StatCard(
                                  icon: Icons.attach_money_rounded,
                                  label: '總花費',
                                  value:
                                      CurrencyUtils.formatAmount(_summary!.totalSpent, _tripCurrency),
                                  gradient: AppTheme.primaryGradient,
                                  delayMs: 0,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: StatCard(
                                  icon: Icons.receipt_rounded,
                                  label: '帳單數',
                                  value: '${_summary!.billCount} 筆',
                                  gradient: AppTheme.warmGradient,
                                  delayMs: 100,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: StatCard(
                                  icon: Icons.people_rounded,
                                  label: '成員',
                                  value: '${_summary!.memberCount} 人',
                                  gradient: AppTheme.secondaryGradient,
                                  delayMs: 200,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      // 人均消費
                      SliverToBoxAdapter(
                        child: _buildAverageCard(),
                      ),

                      // 待處理結算（如果有）
                      if (_pendingSettlements.isNotEmpty) ...[
                        SliverToBoxAdapter(
                          child: _buildSectionHeader(
                            '待處理結算',
                            '請確認或取消以下結算請求',
                            Icons.pending_actions_rounded,
                            280,
                          ),
                        ),
                        SliverPadding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          sliver: SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (context, index) {
                                final settlement = _pendingSettlements[index];
                                return _PendingSettlementItem(
                                  settlement: settlement,
                                  currentUserId: _currentUserId,
                                  index: index,
                                  onConfirm: () => _confirmSettlement(settlement),
                                  onCancel: () => _cancelSettlement(settlement),
                                  currency: _tripCurrency,
                                );
                              },
                              childCount: _pendingSettlements.length,
                            ),
                          ),
                        ),
                      ],

                      // 餘額列表標題
                      SliverToBoxAdapter(
                        child: _buildSectionHeader(
                          '成員餘額',
                          '正數表示應收款，負數表示應付款',
                          Icons.account_balance_wallet_rounded,
                          300 + (_pendingSettlements.isNotEmpty ? _pendingSettlements.length * 80 + 60 : 0),
                        ),
                      ),

                      // 餘額列表
                      SliverPadding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        sliver: SliverList(
                          delegate: SliverChildBuilderDelegate(
                            (context, index) {
                              final balance = _summary!.balances[index];
                              return _BalanceItem(
                                balance: balance,
                                index: index,
                                currency: _tripCurrency,
                              );
                            },
                            childCount: _summary!.balances.length,
                          ),
                        ),
                      ),

                      // 建議結算標題
                      SliverToBoxAdapter(
                        child: _buildSectionHeader(
                          '建議的還款方式',
                          '最佳化後的還款路徑，可減少交易次數',
                          Icons.swap_horiz_rounded,
                          400 + _summary!.balances.length * 60,
                        ),
                      ),

                      // 結算建議列表或已結清提示
                      if (_summary!.suggestedSettlements.isEmpty)
                        SliverToBoxAdapter(
                          child: _buildAllSettledCard(),
                        )
                      else
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                          sliver: SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (context, index) {
                                final settlement =
                                    _summary!.suggestedSettlements[index];
                                return _SettlementItem(
                                  settlement: settlement,
                                  index: index,
                                  baseDelay:
                                      500 + _summary!.balances.length * 60,
                                  onSettle: () => _createSettlement(settlement),
                                  currency: _tripCurrency,
                                );
                              },
                              childCount:
                                  _summary!.suggestedSettlements.length,
                            ),
                          ),
                        ),

                      // 底部間距
                      const SliverToBoxAdapter(
                        child: SizedBox(height: 32),
                      ),
                    ],
                  ),
                ),
    );
  }

  Widget _buildLoadingState() {
    return Scaffold(
      appBar: AppBar(title: const Text('結算')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator()
                .animate(onPlay: (c) => c.repeat())
                .rotate(duration: 1000.ms),
            const SizedBox(height: 16),
            Text(
              '計算中...',
              style: TextStyle(color: Colors.grey[500]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState() {
    return Scaffold(
      appBar: AppBar(title: const Text('結算')),
      body: EmptyStateWidget(
        icon: Icons.error_outline_rounded,
        title: '無法載入結算資訊',
        subtitle: '請檢查網路連線後重試',
        action: GradientButton(
          label: '重試',
          icon: Icons.refresh_rounded,
          gradient: AppTheme.primaryGradient,
          onPressed: _loadSummary,
          width: 120,
        ),
      ),
    );
  }

  Widget _buildHeaderBackground() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF10B981),
            Color(0xFF06B6D4),
          ],
        ),
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
            right: 60,
            bottom: 60,
            child: Icon(
              Icons.payments_rounded,
              size: 80,
              color: Colors.white.withValues(alpha: 0.2),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAverageCard() {
    final average = _summary!.totalSpent / _summary!.memberCount;

    return Padding(
      padding: const EdgeInsets.all(16),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppTheme.accentColor.withValues(alpha: 0.15),
              AppTheme.primaryColor.withValues(alpha: 0.1),
            ],
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: AppTheme.accentColor.withValues(alpha: 0.2),
          ),
        ),
        child: Row(
          children: [
            GradientIconBox(
              icon: Icons.person_rounded,
              gradient: AppTheme.secondaryGradient,
              size: 48,
              iconSize: 24,
            ),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '人均消費',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[500],
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  CurrencyUtils.formatAmount(average, _tripCurrency),
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    letterSpacing: -0.5,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    )
        .animate(delay: 250.ms)
        .fadeIn(duration: 400.ms)
        .slideY(begin: 0.1, end: 0);
  }

  Widget _buildSectionHeader(
      String title, String subtitle, IconData icon, int delayMs) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 20, color: AppTheme.primaryColor),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  letterSpacing: -0.3,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey[500],
            ),
          ),
        ],
      ),
    )
        .animate(delay: Duration(milliseconds: delayMs))
        .fadeIn(duration: 400.ms)
        .slideX(begin: -0.1, end: 0);
  }

  Widget _buildAllSettledCard() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: AppTheme.successGradient,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF10B981).withValues(alpha: 0.3),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(
                Icons.celebration_rounded,
                color: Colors.white,
                size: 28,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '太棒了！',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '所有帳款已結清',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.9),
                      fontSize: 15,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    )
        .animate(delay: 500.ms)
        .fadeIn(duration: 500.ms)
        .scale(begin: const Offset(0.9, 0.9), end: const Offset(1, 1));
  }
}

class _BalanceItem extends StatelessWidget {
  final MemberBalance balance;
  final int index;
  final Currency currency;

  const _BalanceItem({
    required this.balance,
    required this.index,
    required this.currency,
  });

  @override
  Widget build(BuildContext context) {
    final isPositive = balance.balance >= 0;
    final balanceColor =
        isPositive ? const Color(0xFF10B981) : const Color(0xFFEF4444);
    final balanceGradient = isPositive
        ? AppTheme.successGradient
        : AppTheme.dangerGradient;

    return AnimatedCard(
      delayMs: 350 + index * 60,
      child: Row(
        children: [
          // 頭像
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              gradient: balance.isVirtual
                  ? LinearGradient(colors: [Colors.orange[400]!, Colors.orange[600]!])
                  : balanceGradient,
              borderRadius: BorderRadius.circular(14),
              border: balance.isVirtual
                  ? Border.all(color: Colors.orange, width: 1.5)
                  : null,
              boxShadow: [
                BoxShadow(
                  color: (balance.isVirtual ? Colors.orange : balanceColor).withValues(alpha: 0.3),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Center(
              child: balance.isVirtual
                  ? const Icon(Icons.person_outline, color: Colors.white, size: 22)
                  : Text(
                      balance.userName.isNotEmpty ? balance.userName[0].toUpperCase() : '?',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 18,
                      ),
                    ),
            ),
          ),
          const SizedBox(width: 14),

          // 姓名和明細
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        balance.userName,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          letterSpacing: -0.3,
                        ),
                      ),
                    ),
                    if (balance.isVirtual) ...[
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
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    _DetailChip(
                      label: '已付',
                      value: CurrencyUtils.formatAmount(balance.paid, currency),
                      color: AppTheme.primaryColor,
                    ),
                    const SizedBox(width: 8),
                    _DetailChip(
                      label: '應付',
                      value: CurrencyUtils.formatAmount(balance.owed, currency),
                      color: AppTheme.secondaryColor,
                    ),
                  ],
                ),
              ],
            ),
          ),

          // 餘額
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '${isPositive ? '+' : ''}${CurrencyUtils.formatAmount(balance.balance.abs(), currency)}',
                style: TextStyle(
                  color: balanceColor,
                  fontWeight: FontWeight.bold,
                  fontSize: 17,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: balanceColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  isPositive ? '應收' : '應付',
                  style: TextStyle(
                    fontSize: 11,
                    color: balanceColor,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _DetailChip extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _DetailChip({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '$label ',
            style: TextStyle(
              fontSize: 11,
              color: Colors.grey[500],
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 12,
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _SettlementItem extends StatelessWidget {
  final SuggestedSettlement settlement;
  final int index;
  final int baseDelay;
  final VoidCallback onSettle;
  final Currency currency;

  const _SettlementItem({
    required this.settlement,
    required this.index,
    required this.baseDelay,
    required this.onSettle,
    required this.currency,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: isDark ? null : AppTheme.softShadow,
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // 上半部：人員資訊
            Row(
              children: [
                // From 用戶
                Expanded(
                  child: _UserAvatar(
                    name: settlement.fromUserName,
                    gradient: settlement.fromIsVirtual
                        ? LinearGradient(colors: [Colors.orange[400]!, Colors.orange[600]!])
                        : AppTheme.dangerGradient,
                    label: settlement.fromIsVirtual ? '虛擬付款方' : '付款方',
                    isVirtual: settlement.fromIsVirtual,
                  ),
                ),

                // 箭頭和金額
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          gradient: AppTheme.primaryGradient,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.primaryColor.withValues(alpha: 0.3),
                              blurRadius: 8,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Text(
                          CurrencyUtils.formatAmount(settlement.amount, currency),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 40,
                            height: 2,
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  AppTheme.dangerGradient.colors.first,
                                  AppTheme.successGradient.colors.first,
                                ],
                              ),
                              borderRadius: BorderRadius.circular(1),
                            ),
                          ),
                          Icon(
                            Icons.arrow_forward_rounded,
                            size: 16,
                            color: AppTheme.successGradient.colors.first,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                // To 用戶
                Expanded(
                  child: _UserAvatar(
                    name: settlement.toUserName,
                    gradient: settlement.toIsVirtual
                        ? LinearGradient(colors: [Colors.orange[400]!, Colors.orange[600]!])
                        : AppTheme.successGradient,
                    label: settlement.toIsVirtual ? '虛擬收款方' : '收款方',
                    isVirtual: settlement.toIsVirtual,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // 結算按鈕
            SizedBox(
              width: double.infinity,
              child: GradientButton(
                label: '發送結算請求',
                icon: Icons.send_rounded,
                gradient: AppTheme.secondaryGradient,
                onPressed: onSettle,
                height: 44,
              ),
            ),
          ],
        ),
      ),
    )
        .animate(delay: Duration(milliseconds: baseDelay + index * 80))
        .fadeIn(duration: 400.ms)
        .slideY(begin: 0.1, end: 0);
  }
}

class _UserAvatar extends StatelessWidget {
  final String name;
  final LinearGradient gradient;
  final String label;
  final bool isVirtual;

  const _UserAvatar({
    required this.name,
    required this.gradient,
    required this.label,
    this.isVirtual = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            gradient: gradient,
            borderRadius: BorderRadius.circular(16),
            border: isVirtual
                ? Border.all(color: Colors.orange, width: 1.5)
                : null,
            boxShadow: [
              BoxShadow(
                color: gradient.colors.first.withValues(alpha: 0.3),
                blurRadius: 12,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Center(
            child: isVirtual
                ? const Icon(Icons.person_outline, color: Colors.white, size: 24)
                : Text(
                    name.isNotEmpty ? name[0].toUpperCase() : '?',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 22,
                    ),
                  ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          name,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 14,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: isVirtual ? Colors.orange[600] : Colors.grey[500],
          ),
        ),
      ],
    );
  }
}

class _ConfirmSettlementDialog extends StatelessWidget {
  final SuggestedSettlement settlement;
  final Currency currency;

  const _ConfirmSettlementDialog({
    required this.settlement,
    required this.currency,
  });

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
            GradientIconBox(
              icon: Icons.payments_rounded,
              gradient: AppTheme.primaryGradient,
              size: 64,
              iconSize: 32,
            ),
            const SizedBox(height: 20),
            const Text(
              '確認結算',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            RichText(
              textAlign: TextAlign.center,
              text: TextSpan(
                style: TextStyle(
                  fontSize: 15,
                  color: Theme.of(context).textTheme.bodyMedium?.color,
                  height: 1.5,
                ),
                children: [
                  const TextSpan(text: '確定要發送結算請求嗎？\n'),
                  TextSpan(
                    text: settlement.fromUserName,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const TextSpan(text: ' 需要支付 '),
                  TextSpan(
                    text: CurrencyUtils.formatAmount(settlement.amount, currency),
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                  const TextSpan(text: ' 給 '),
                  TextSpan(
                    text: settlement.toUserName,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                ],
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
                    label: '確認',
                    gradient: AppTheme.primaryGradient,
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

/// 待處理結算項目
class _PendingSettlementItem extends StatelessWidget {
  final Settlement settlement;
  final String? currentUserId;
  final int index;
  final VoidCallback onConfirm;
  final VoidCallback onCancel;
  final Currency currency;

  const _PendingSettlementItem({
    required this.settlement,
    required this.currentUserId,
    required this.index,
    required this.onConfirm,
    required this.onCancel,
    required this.currency,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isReceiver = settlement.receiverIsVirtual || currentUserId == settlement.receiverId;
    final isPayer = settlement.payerIsVirtual || currentUserId == settlement.payerId;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppTheme.warmGradient.colors.first.withValues(alpha: 0.3),
          width: 2,
        ),
        boxShadow: isDark ? null : AppTheme.softShadow,
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            // 狀態標籤
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppTheme.warmGradient.colors.first.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.pending_actions_rounded,
                    size: 14,
                    color: AppTheme.warmGradient.colors.first,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '等待確認',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.warmGradient.colors.first,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // 結算資訊
            Row(
              children: [
                // 付款方
                Expanded(
                  child: Column(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          gradient: settlement.payerIsVirtual
                              ? LinearGradient(colors: [Colors.orange[400]!, Colors.orange[600]!])
                              : AppTheme.dangerGradient,
                          borderRadius: BorderRadius.circular(14),
                          border: settlement.payerIsVirtual
                              ? Border.all(color: Colors.orange, width: 1.5)
                              : null,
                        ),
                        child: Center(
                          child: settlement.payerIsVirtual
                              ? const Icon(Icons.person_outline, color: Colors.white, size: 20)
                              : Text(
                                  settlement.payerName.isNotEmpty ? settlement.payerName[0].toUpperCase() : '?',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 18,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        settlement.payerName,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        settlement.payerIsVirtual ? '虛擬付款方' : (isPayer ? '(你)' : '付款方'),
                        style: TextStyle(
                          fontSize: 11,
                          color: settlement.payerIsVirtual
                              ? Colors.orange[600]
                              : (isPayer ? AppTheme.primaryColor : Colors.grey[500]),
                          fontWeight: isPayer ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                    ],
                  ),
                ),

                // 金額和箭頭
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          gradient: AppTheme.warmGradient,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          CurrencyUtils.formatAmount(settlement.amount, currency),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Icon(
                        Icons.arrow_forward_rounded,
                        size: 18,
                        color: Colors.grey[400],
                      ),
                    ],
                  ),
                ),

                // 收款方
                Expanded(
                  child: Column(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          gradient: settlement.receiverIsVirtual
                              ? LinearGradient(colors: [Colors.orange[400]!, Colors.orange[600]!])
                              : AppTheme.successGradient,
                          borderRadius: BorderRadius.circular(14),
                          border: settlement.receiverIsVirtual
                              ? Border.all(color: Colors.orange, width: 1.5)
                              : null,
                        ),
                        child: Center(
                          child: settlement.receiverIsVirtual
                              ? const Icon(Icons.person_outline, color: Colors.white, size: 20)
                              : Text(
                                  settlement.receiverName.isNotEmpty ? settlement.receiverName[0].toUpperCase() : '?',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 18,
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        settlement.receiverName,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        settlement.receiverIsVirtual ? '虛擬收款方' : (isReceiver ? '(你)' : '收款方'),
                        style: TextStyle(
                          fontSize: 11,
                          color: settlement.receiverIsVirtual
                              ? Colors.orange[600]
                              : (isReceiver ? AppTheme.primaryColor : Colors.grey[500]),
                          fontWeight: isReceiver ? FontWeight.bold : FontWeight.normal,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // 操作按鈕
            if (isReceiver)
              // 收款方可以確認收款
              SizedBox(
                width: double.infinity,
                child: GradientButton(
                  label: '確認已收款',
                  icon: Icons.check_circle_rounded,
                  gradient: AppTheme.successGradient,
                  onPressed: onConfirm,
                  height: 44,
                ),
              )
            else if (isPayer)
              // 付款方可以取消
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: onCancel,
                  icon: const Icon(Icons.close_rounded, size: 18),
                  label: const Text('取消請求'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFEF4444),
                    side: const BorderSide(color: Color(0xFFEF4444)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              )
            else
              // 其他成員只能查看
              Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Text(
                  '等待 ${settlement.receiverName} 確認',
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey[500],
                  ),
                ),
              ),
          ],
        ),
      ),
    )
        .animate(delay: Duration(milliseconds: 300 + index * 80))
        .fadeIn(duration: 400.ms)
        .slideY(begin: 0.1, end: 0);
  }
}
