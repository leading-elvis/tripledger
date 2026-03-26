import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../data/trips_repository.dart';
import '../../../shared/models/trip_model.dart';
import '../../../shared/models/bill_model.dart';
import '../../../core/config/theme.dart';
import '../../../core/storage/auth_storage.dart';
import '../../../shared/widgets/animated_widgets.dart';
import '../../../shared/widgets/app_dialogs.dart';
import '../../../shared/widgets/skeleton_loading.dart';
import '../../../shared/utils/error_handler.dart';
import '../../../shared/utils/category_utils.dart';
import '../../../core/utils/currency_utils.dart';
import '../../../shared/widgets/qr_code_share_sheet.dart';
import '../../purchase/presentation/premium_comparison_sheet.dart';
import '../../purchase/presentation/paywall_dialog.dart';
import '../../purchase/providers/purchase_providers.dart';
import '../../purchase/presentation/widgets/premium_badge.dart';
import '../../../core/services/ad_service.dart';
import '../../../shared/widgets/banner_ad_widget.dart';

class TripDetailPage extends ConsumerStatefulWidget {
  final String tripId;

  const TripDetailPage({super.key, required this.tripId});

  @override
  ConsumerState<TripDetailPage> createState() => _TripDetailPageState();
}

class _TripDetailPageState extends ConsumerState<TripDetailPage> {
  TripDetail? _trip;
  bool _isLoading = true;
  bool _hasChanges = false; // 追蹤是否有資料變更
  String? _currentUserId;

  // 篩選相關
  String? _selectedCategoryFilter;
  String _searchQuery = '';
  final _searchController = TextEditingController();
  bool _isFilterExpanded = false;

  /// 檢查當前用戶是否為旅程擁有者
  bool get _isOwner {
    if (_trip == null || _currentUserId == null) return false;
    final currentMember = _trip!.members.where((m) => m.userId == _currentUserId).firstOrNull;
    return currentMember?.role == 'OWNER';
  }

  @override
  void initState() {
    super.initState();
    _loadCurrentUser();
    _loadTrip();
  }

  Future<void> _loadCurrentUser() async {
    final userId = await ref.read(authStorageProvider).getUserId();
    setState(() => _currentUserId = userId);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<Bill> get _filteredBills {
    if (_trip == null) return [];

    return _trip!.bills.where((bill) {
      // 分類篩選
      if (_selectedCategoryFilter != null && bill.category != _selectedCategoryFilter) {
        return false;
      }
      // 搜尋篩選
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        return bill.title.toLowerCase().contains(query) ||
            bill.payerName.toLowerCase().contains(query);
      }
      return true;
    }).toList();
  }

  Future<void> _loadTrip() async {
    try {
      final trip =
          await ref.read(tripsRepositoryProvider).getTripDetail(widget.tripId);
      setState(() {
        _trip = trip;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ErrorHandler.showErrorSnackBar(context, e, prefix: '載入失敗');
      }
    }
  }

  void _copyInviteCode() {
    if (_trip == null) return;
    Clipboard.setData(ClipboardData(text: _trip!.inviteCode));
    ErrorHandler.showSuccessSnackBar(context, '邀請碼已複製到剪貼簿');
  }

  /// 顯示邀請碼選項對話框
  void _showInviteCodeOptions() {
    if (_trip == null) return;

    showAppBottomSheet(
      context: context,
      title: '邀請碼: ${_trip!.inviteCode}',
      icon: Icons.share_rounded,
      gradient: AppTheme.primaryGradient,
      children: [
        OptionTile(
          icon: Icons.qr_code_rounded,
          iconColor: AppTheme.secondaryColor,
          title: '顯示 QR Code',
          subtitle: '讓朋友掃描加入旅程',
          onTap: () {
            Navigator.pop(context);
            QrCodeShareSheet.show(
              context,
              tripName: _trip!.name,
              inviteCode: _trip!.inviteCode,
            );
          },
        ),
        const SizedBox(height: 8),
        OptionTile(
          icon: Icons.copy_rounded,
          iconColor: AppTheme.primaryColor,
          title: '複製邀請碼',
          subtitle: '分享給朋友加入旅程',
          onTap: () {
            Navigator.pop(context);
            _copyInviteCode();
          },
        ),
        const SizedBox(height: 8),
        OptionTile(
          icon: Icons.refresh_rounded,
          iconColor: Colors.orange,
          title: '重新產生邀請碼',
          subtitle: '舊的邀請碼將失效',
          onTap: () {
            Navigator.pop(context);
            _regenerateInviteCode();
          },
        ),
      ],
    );
  }

  /// 離開旅程
  Future<void> _leaveTrip() async {
    final confirm = await showAppConfirmDialog(
      context: context,
      title: '離開旅程',
      content: '確定要離開「${_trip!.name}」嗎？\n\n離開後將無法查看此旅程的帳單和結算記錄。',
      icon: Icons.exit_to_app_rounded,
      confirmText: '離開',
      cancelText: '取消',
      isDanger: true,
    );

    if (confirm != true) return;

    try {
      await ref.read(tripsRepositoryProvider).leaveTrip(widget.tripId);

      if (mounted) {
        ErrorHandler.showSuccessSnackBar(context, '已離開旅程');
        context.go('/trips'); // 返回旅程列表
      }
    } catch (e) {
      if (mounted) {
        ErrorHandler.showErrorSnackBar(context, e, prefix: '離開失敗');
      }
    }
  }

  /// 刪除旅程
  Future<void> _deleteTrip() async {
    final confirm = await showAppConfirmDialog(
      context: context,
      title: '刪除旅程',
      content: '確定要刪除「${_trip!.name}」嗎？\n\n此操作無法復原，所有帳單和結算記錄都將被永久刪除。',
      icon: Icons.delete_forever_rounded,
      confirmText: '刪除',
      cancelText: '取消',
      isDanger: true,
    );

    if (confirm != true) return;

    try {
      await ref.read(tripsRepositoryProvider).deleteTrip(widget.tripId);

      if (mounted) {
        ErrorHandler.showSuccessSnackBar(context, '已刪除旅程');
        context.go('/trips'); // 返回旅程列表
      }
    } catch (e) {
      if (mounted) {
        ErrorHandler.showErrorSnackBar(context, e, prefix: '刪除失敗');
      }
    }
  }

  /// 重新產生邀請碼
  Future<void> _regenerateInviteCode() async {
    final confirm = await showAppConfirmDialog(
      context: context,
      title: '重新產生邀請碼',
      content: '確定要重新產生邀請碼嗎？\n\n舊的邀請碼將會失效，已使用舊邀請碼的成員不受影響。',
      icon: Icons.refresh_rounded,
      gradient: AppTheme.warmGradient,
      confirmText: '確定',
      cancelText: '取消',
    );

    if (confirm != true) return;

    try {
      final newCode = await ref
          .read(tripsRepositoryProvider)
          .regenerateInviteCode(widget.tripId);

      // 重新載入旅程資料以更新邀請碼
      await _loadTrip();

      if (mounted) {
        ErrorHandler.showSuccessSnackBar(context, '邀請碼已更新: $newCode');
      }
    } catch (e) {
      if (mounted) {
        ErrorHandler.showErrorSnackBar(context, e, prefix: '重新產生失敗');
      }
    }
  }

  /// 顯示升級對話框（比較畫面）
  Future<void> _showUpgradeDialog() async {
    final result = await PremiumComparisonSheet.show(
      context,
      tripId: widget.tripId,
    );
    if (result == true && mounted) {
      // 刷新進階狀態
      refreshPremiumStatus(ref, widget.tripId);
      ErrorHandler.showSuccessSnackBar(context, '升級成功！');
    }
  }

  /// 建立進階狀態卡片
  Widget _buildPremiumStatusCard(bool isDark) {
    final premiumStatus = ref.watch(tripPremiumStatusProvider(widget.tripId));

    return premiumStatus.when(
      data: (status) {
        if (!status.isPremium) {
          // 非進階版：顯示升級提示卡片
          return Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: GestureDetector(
              onTap: _showUpgradeDialog,
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.amber.withValues(alpha: 0.12),
                      Colors.orange.withValues(alpha: 0.06),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: Colors.amber.withValues(alpha: 0.3),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        gradient: AppTheme.warmGradient,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(
                        Icons.workspace_premium_rounded,
                        color: Colors.white,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '升級進階版',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: isDark ? Colors.white : Colors.grey[800],
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '解鎖智慧掃描、無限成員、統計圖表等',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[500],
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        gradient: AppTheme.warmGradient,
                        borderRadius: BorderRadius.circular(20),
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
                  ],
                ),
              ),
            ).animate(delay: 250.ms).fadeIn(duration: 400.ms).slideY(begin: 0.1, end: 0),
          );
        }

        // 進階版：顯示剩餘天數和續費選項
        final remainingDays = status.remainingDays ?? 0;
        final isExpiringSoon = remainingDays <= 3;

        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: isExpiringSoon
                  ? LinearGradient(
                      colors: [
                        Colors.orange.withValues(alpha: 0.1),
                        Colors.amber.withValues(alpha: 0.05),
                      ],
                    )
                  : LinearGradient(
                      colors: [
                        AppTheme.primaryColor.withValues(alpha: 0.1),
                        AppTheme.secondaryColor.withValues(alpha: 0.05),
                      ],
                    ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isExpiringSoon
                    ? Colors.orange.withValues(alpha: 0.3)
                    : AppTheme.primaryColor.withValues(alpha: 0.2),
              ),
            ),
            child: Row(
              children: [
                // 進階版圖標
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    gradient: AppTheme.warmGradient,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.workspace_premium_rounded,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 14),
                // 狀態資訊
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const PremiumBadge(size: 14),
                          const SizedBox(width: 8),
                          if (isExpiringSoon)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.orange,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                '即將到期',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '剩餘 $remainingDays 天',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: isExpiringSoon
                              ? Colors.orange[700]
                              : (isDark ? Colors.white70 : Colors.grey[700]),
                        ),
                      ),
                    ],
                  ),
                ),
                // 續費按鈕
                GestureDetector(
                  onTap: _showUpgradeDialog,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      gradient: isExpiringSoon
                          ? const LinearGradient(
                              colors: [Color(0xFFF97316), Color(0xFFFB923C)],
                            )
                          : AppTheme.primaryGradient,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.add_rounded,
                          color: Colors.white,
                          size: 16,
                        ),
                        SizedBox(width: 4),
                        Text(
                          '續費',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ).animate(delay: 250.ms).fadeIn(duration: 400.ms).slideY(begin: 0.1, end: 0),
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(
          title: const SkeletonText(width: 100, height: 20),
          backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 標題骨架
              const SkeletonCard(
                height: 100,
                margin: EdgeInsets.zero,
              ),
              const SizedBox(height: 16),
              // 操作按鈕骨架
              Row(
                children: [
                  Expanded(child: SkeletonLoading(height: 52, borderRadius: 12)),
                  const SizedBox(width: 12),
                  Expanded(child: SkeletonLoading(height: 52, borderRadius: 12)),
                ],
              ),
              const SizedBox(height: 24),
              // 帳單列表骨架
              const SkeletonText(width: 80, height: 18),
              const SizedBox(height: 12),
              const BillsListSkeleton(itemCount: 4),
            ],
          ),
        ),
      );
    }

    if (_trip == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('錯誤')),
        body: EmptyStateWidget(
          icon: Icons.error_outline_rounded,
          title: '無法載入旅程資訊',
          subtitle: '請檢查網路連線後重試',
          action: GradientButton(
            label: '返回',
            icon: Icons.arrow_back_rounded,
            gradient: AppTheme.primaryGradient,
            onPressed: () => context.pop(_hasChanges),
            width: 120,
          ),
        ),
      );
    }

    // 使用 baseAmount（已換算成旅程預設貨幣）來計算總花費
    final totalAmount = _trip!.bills.fold<double>(
      0,
      (sum, bill) => sum + (bill.baseAmount ?? bill.amount),
    );

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        context.pop(_hasChanges);
      },
      child: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        child: Scaffold(
          body: RefreshIndicator(
          onRefresh: _loadTrip,
          child: CustomScrollView(
            slivers: [
              // 精緻的 App Bar
              SliverAppBar(
                expandedHeight: 200,
                floating: false,
                pinned: true,
                stretch: true,
                leading: IconButton(
                  icon: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.arrow_back_rounded,
                      color: Colors.white,
                    ),
                  ),
                  onPressed: () => context.pop(_hasChanges),
                ),
                backgroundColor:
                  isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
              flexibleSpace: FlexibleSpaceBar(
                titlePadding: const EdgeInsets.only(left: 56, bottom: 16, right: 56),
                title: Text(
                  _trip!.name,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    letterSpacing: -0.5,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                background: _buildHeaderBackground(isDark),
              ),
              actions: [
                IconButton(
                  icon: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.share_rounded,
                      color: Colors.white,
                    ),
                  ),
                  onPressed: _copyInviteCode,
                  tooltip: '分享邀請碼',
                ),
                PopupMenuButton(
                  icon: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(
                      Icons.more_vert_rounded,
                      color: Colors.white,
                    ),
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  itemBuilder: (context) => <PopupMenuEntry<String>>[
                    PopupMenuItem(
                      value: 'members',
                      child: Row(
                        children: [
                          Icon(Icons.people_rounded,
                              color: AppTheme.primaryColor),
                          const SizedBox(width: 12),
                          const Text('成員管理'),
                        ],
                      ),
                    ),
                    PopupMenuItem(
                      value: 'edit',
                      child: Row(
                        children: [
                          Icon(Icons.edit_rounded,
                              color: AppTheme.secondaryColor),
                          const SizedBox(width: 12),
                          const Text('編輯旅程'),
                        ],
                      ),
                    ),
                    PopupMenuItem(
                      value: 'upgrade',
                      child: Row(
                        children: [
                          Icon(Icons.workspace_premium_rounded,
                              color: Colors.amber[700]),
                          const SizedBox(width: 12),
                          const Text('升級進階版'),
                        ],
                      ),
                    ),
                    const PopupMenuDivider(),
                    // 非擁有者顯示「離開旅程」
                    if (!_isOwner)
                      PopupMenuItem(
                        value: 'leave',
                        child: Row(
                          children: [
                            Icon(Icons.exit_to_app_rounded,
                                color: Colors.orange[700]),
                            const SizedBox(width: 12),
                            const Text('離開旅程'),
                          ],
                        ),
                      ),
                    // 擁有者顯示「刪除旅程」
                    if (_isOwner)
                      PopupMenuItem(
                        value: 'delete',
                        child: Row(
                          children: [
                            Icon(Icons.delete_forever_rounded,
                                color: Colors.red[600]),
                            const SizedBox(width: 12),
                            Text('刪除旅程',
                                style: TextStyle(color: Colors.red[600])),
                          ],
                        ),
                      ),
                  ],
                  onSelected: (value) async {
                    if (value == 'members') {
                      final result = await context.push('/trips/${widget.tripId}/members');
                      if (result == true && mounted) {
                        _hasChanges = true;
                        _loadTrip(); // 成員變更，重新載入旅程資料
                      }
                    } else if (value == 'edit') {
                      final result = await context.push('/trips/${widget.tripId}/edit');
                      if (result == true && mounted) {
                        _hasChanges = true;
                        _loadTrip(); // 重新載入旅程資料
                      }
                    } else if (value == 'upgrade') {
                      _showUpgradeDialog();
                    } else if (value == 'leave') {
                      _leaveTrip();
                    } else if (value == 'delete') {
                      _deleteTrip();
                    }
                  },
                ),
                const SizedBox(width: 8),
              ],
            ),

            // 統計卡片區域
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Row(
                  children: [
                    Expanded(
                      child: StatCard(
                        icon: Icons.attach_money_rounded,
                        label: '總花費',
                        value: CurrencyUtils.formatAmount(totalAmount, _trip!.defaultCurrency),
                        gradient: AppTheme.primaryGradient,
                        delayMs: 0,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: StatCard(
                        icon: Icons.people_rounded,
                        label: '成員',
                        value: _trip!.virtualMembers.isEmpty
                            ? '${_trip!.members.length} 人'
                            : '${_trip!.members.length}+${_trip!.virtualMembers.length} 人',
                        gradient: AppTheme.secondaryGradient,
                        delayMs: 100,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: StatCard(
                        icon: Icons.receipt_rounded,
                        label: '帳單',
                        value: '${_trip!.bills.length} 筆',
                        gradient: AppTheme.warmGradient,
                        delayMs: 200,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // 進階狀態卡片
            SliverToBoxAdapter(
              child: _buildPremiumStatusCard(isDark),
            ),

            // 操作按鈕
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: GradientButton(
                            label: '新增帳單',
                            icon: Icons.add_rounded,
                            gradient: AppTheme.primaryGradient,
                            onPressed: () async {
                              final result = await context.push('/trips/${widget.tripId}/add-bill');
                              if (result == true && mounted) {
                                _hasChanges = true;
                                _loadTrip(); // 刷新資料
                              }
                            },
                          ),
                        ),
                        const SizedBox(width: 8),
                        // 掃描收據按鈕（進階版功能）
                        _ScanReceiptButton(
                          isPremium: ref.watch(isTripPremiumProvider(widget.tripId)),
                          onPressed: () async {
                            final isPremium = ref.read(isTripPremiumProvider(widget.tripId));
                            if (!isPremium) {
                              final result = await PaywallDialog.show(
                                context,
                                tripId: widget.tripId,
                                featureName: '收據掃描',
                              );
                              if (result == true && mounted) {
                                refreshPremiumStatus(ref, widget.tripId);
                              }
                              return;
                            }
                            final result = await context.push('/trips/${widget.tripId}/scan-receipt');
                            if (result == true && mounted) {
                              _hasChanges = true;
                              _loadTrip();
                            }
                          },
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _OutlinedActionButton(
                            label: '結算',
                            icon: Icons.payments_rounded,
                            onPressed: () {
                              context.go('/trips/${widget.tripId}/settlement');
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _OutlinedActionButton(
                      label: '查看統計圖表',
                      icon: Icons.bar_chart_rounded,
                      onPressed: () {
                        context.go('/trips/${widget.tripId}/stats');
                      },
                    ),
                  ],
                )
                    .animate(delay: 300.ms)
                    .fadeIn(duration: 400.ms)
                    .slideY(begin: 0.1, end: 0),
              ),
            ),

            // 帳單列表標題和篩選
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          '帳單記錄',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            letterSpacing: -0.3,
                          ),
                        ),
                        Row(
                          children: [
                            // 篩選按鈕
                            GestureDetector(
                              onTap: () {
                                setState(() {
                                  _isFilterExpanded = !_isFilterExpanded;
                                });
                              },
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(
                                  color: _isFilterExpanded || _selectedCategoryFilter != null
                                      ? AppTheme.primaryColor
                                      : AppTheme.primaryColor.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(
                                      Icons.filter_list_rounded,
                                      size: 16,
                                      color: _isFilterExpanded || _selectedCategoryFilter != null
                                          ? Colors.white
                                          : AppTheme.primaryColor,
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      _selectedCategoryFilter != null
                                          ? CategoryUtils.getLabel(_selectedCategoryFilter!)
                                          : '篩選',
                                      style: TextStyle(
                                        color: _isFilterExpanded || _selectedCategoryFilter != null
                                            ? Colors.white
                                            : AppTheme.primaryColor,
                                        fontWeight: FontWeight.w600,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: AppTheme.secondaryColor.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                '${_filteredBills.length}/${_trip!.bills.length} 筆',
                                style: TextStyle(
                                  color: AppTheme.secondaryColor,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    // 展開的篩選區域
                    if (_isFilterExpanded) ...[
                      const SizedBox(height: 12),
                      // 搜尋欄
                      TextField(
                        controller: _searchController,
                        decoration: InputDecoration(
                          hintText: '搜尋帳單標題或付款人...',
                          prefixIcon: Icon(Icons.search_rounded, color: Colors.grey[400]),
                          suffixIcon: _searchQuery.isNotEmpty
                              ? IconButton(
                                  icon: Icon(Icons.clear_rounded, color: Colors.grey[400]),
                                  onPressed: () {
                                    _searchController.clear();
                                    setState(() => _searchQuery = '');
                                  },
                                )
                              : null,
                          filled: true,
                          fillColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide.none,
                          ),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        ),
                        onChanged: (value) {
                          setState(() => _searchQuery = value);
                        },
                      ),
                      const SizedBox(height: 12),
                      // 分類篩選
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            _FilterChip(
                              label: '全部',
                              isSelected: _selectedCategoryFilter == null,
                              onTap: () {
                                setState(() => _selectedCategoryFilter = null);
                              },
                            ),
                            const SizedBox(width: 8),
                            ...['FOOD', 'TRANSPORT', 'ACCOMMODATION', 'ATTRACTION', 'SHOPPING', 'OTHER']
                                .map((category) => Padding(
                                      padding: const EdgeInsets.only(right: 8),
                                      child: _FilterChip(
                                        label: CategoryUtils.getLabel(category),
                                        icon: CategoryUtils.getIcon(category),
                                        color: AppTheme.categoryColors[category],
                                        isSelected: _selectedCategoryFilter == category,
                                        onTap: () {
                                          setState(() => _selectedCategoryFilter = category);
                                        },
                                      ),
                                    )),
                          ],
                        ),
                      ),
                    ],
                  ],
                )
                    .animate(delay: 400.ms)
                    .fadeIn(duration: 400.ms)
                    .slideX(begin: -0.1, end: 0),
              ),
            ),

            // 帳單列表
            if (_trip!.bills.isEmpty)
              SliverFillRemaining(
                child: EmptyStateWidget(
                  icon: Icons.receipt_long_rounded,
                  title: '還沒有任何帳單',
                  subtitle: '點擊上方按鈕新增第一筆帳單',
                ),
              )
            else if (_filteredBills.isEmpty)
              SliverFillRemaining(
                child: EmptyStateWidget(
                  icon: Icons.search_off_rounded,
                  title: '找不到符合的帳單',
                  subtitle: '試試其他篩選條件',
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                sliver: _buildBillListWithAds(),
              ),
            ],
          ),
        ),
      ),
    ),
    );
  }

  /// 帳單列表（含 inline 廣告）
  Widget _buildBillListWithAds() {
    final isAdFree = ref.watch(isAdFreeProvider);
    final isAdInitialized = ref.watch(adInitializedProvider);
    final shouldShowInlineAds =
        !isAdFree && isAdInitialized && _filteredBills.length >= 6;

    // 每 5 筆帳單插入 1 個 banner，最多 2 個
    int maxAds = shouldShowInlineAds
        ? (_filteredBills.length ~/ 5).clamp(0, 2)
        : 0;
    int totalCount = _filteredBills.length + maxAds;

    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          // 計算此 index 之前有幾個廣告
          // 廣告位置在 index 5, 11（即第 5 筆帳單後、第 10 筆帳單後）
          if (shouldShowInlineAds) {
            // 第一個廣告在 index 5
            if (index == 5 && maxAds >= 1) {
              return const InlineBannerAd(
                margin: EdgeInsets.symmetric(vertical: 8),
              );
            }
            // 第二個廣告在 index 11（5 bills + 1 ad + 5 bills）
            if (index == 11 && maxAds >= 2) {
              return const InlineBannerAd(
                margin: EdgeInsets.symmetric(vertical: 8),
              );
            }
          }

          // 計算實際帳單 index
          int billIndex = index;
          if (shouldShowInlineAds) {
            if (index > 5 && maxAds >= 1) billIndex--;
            if (index > 11 && maxAds >= 2) billIndex--;
          }

          if (billIndex >= _filteredBills.length) return const SizedBox.shrink();
          final bill = _filteredBills[billIndex];
          return _BillItem(
            bill: bill,
            index: billIndex,
            onTap: () async {
              final result = await context
                  .push('/trips/${widget.tripId}/bill/${bill.id}');
              if (result == true && mounted) {
                _hasChanges = true;
                _loadTrip();
              }
            },
          );
        },
        childCount: totalCount,
      ),
    );
  }

  Widget _buildHeaderBackground(bool isDark) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppTheme.primaryColor,
            AppTheme.secondaryColor,
          ],
        ),
      ),
      child: Stack(
        children: [
          // 裝飾圓形
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
            bottom: 40,
            child: Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.05),
              ),
            ),
          ),
          // 邀請碼提示（可點擊）
          Positioned(
            left: 20,
            bottom: 60,
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: _showInviteCodeOptions,
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.vpn_key_rounded,
                        color: Colors.white,
                        size: 14,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        '邀請碼: ${_trip!.inviteCode}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(
                        Icons.touch_app_rounded,
                        color: Colors.white70,
                        size: 12,
                      ),
                    ],
                  ),
                ),
              ),
            )
                .animate(delay: 500.ms)
                .fadeIn(duration: 400.ms)
                .slideX(begin: -0.2, end: 0),
          ),
        ],
      ),
    );
  }
}

class _OutlinedActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onPressed;

  const _OutlinedActionButton({
    required this.label,
    required this.icon,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(AppTheme.radiusSm),
        child: Container(
          height: 52,
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.white,
            borderRadius: BorderRadius.circular(AppTheme.radiusSm),
            border: Border.all(
              color: AppTheme.primaryColor.withValues(alpha: 0.3),
              width: 1.5,
            ),
            boxShadow: isDark ? null : AppTheme.softShadow,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: AppTheme.primaryColor, size: 20),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  color: AppTheme.primaryColor,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BillItem extends StatelessWidget {
  final Bill bill;
  final int index;
  final VoidCallback? onTap;

  const _BillItem({
    required this.bill,
    required this.index,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final categoryColor =
        AppTheme.categoryColors[bill.category] ?? Colors.grey;
    final categoryGradient = AppTheme.categoryGradients[bill.category] ??
        const LinearGradient(colors: [Colors.grey, Colors.grey]);

    return AnimatedCard(
      delayMs: 400 + index * 60,
      onTap: onTap,
      child: Row(
        children: [
          // 分類圖示
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              gradient: categoryGradient,
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: categoryColor.withValues(alpha: 0.3),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Icon(
              CategoryUtils.getIcon(bill.category),
              color: Colors.white,
              size: 24,
            ),
          ),
          const SizedBox(width: 14),

          // 標題和付款者
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  bill.title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    letterSpacing: -0.3,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: categoryColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        CategoryUtils.getLabel(bill.category),
                        style: TextStyle(
                          fontSize: 11,
                          color: categoryColor,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Icon(
                      Icons.person_rounded,
                      size: 14,
                      color: Colors.grey[400],
                    ),
                    const SizedBox(width: 4),
                    Flexible(
                      child: Text(
                        bill.payerName,
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey[500],
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // 金額
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                CurrencyUtils.formatAmount(bill.amount, bill.currency),
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 4),
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.1)
                      : Colors.grey.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  Icons.chevron_right_rounded,
                  color: Colors.grey[400],
                  size: 20,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

}

class _FilterChip extends StatelessWidget {
  final String label;
  final IconData? icon;
  final Color? color;
  final bool isSelected;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    this.icon,
    this.color,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final chipColor = color ?? AppTheme.primaryColor;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: AppTheme.animFast,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? chipColor : chipColor.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(20),
          border: isSelected ? null : Border.all(color: chipColor.withValues(alpha: 0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(
                icon,
                size: 14,
                color: isSelected ? Colors.white : chipColor,
              ),
              const SizedBox(width: 4),
            ],
            Text(
              label,
              style: TextStyle(
                color: isSelected ? Colors.white : chipColor,
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 掃描收據按鈕
class _ScanReceiptButton extends StatelessWidget {
  final VoidCallback onPressed;
  final bool isPremium;

  const _ScanReceiptButton({required this.onPressed, this.isPremium = false});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(AppTheme.radiusSm),
        child: Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                gradient: AppTheme.warmGradient,
                borderRadius: BorderRadius.circular(AppTheme.radiusSm),
                boxShadow: [
                  BoxShadow(
                    color: Colors.orange.withValues(alpha: 0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: const Icon(
                Icons.document_scanner_rounded,
                color: Colors.white,
                size: 24,
              ),
            ),
            if (!isPremium)
              Positioned(
                top: -4,
                right: -4,
                child: Container(
                  padding: const EdgeInsets.all(2),
                  decoration: BoxDecoration(
                    color: Colors.amber[700],
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 1.5),
                  ),
                  child: const Icon(
                    Icons.lock_rounded,
                    color: Colors.white,
                    size: 10,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
