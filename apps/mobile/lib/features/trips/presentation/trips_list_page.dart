import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../data/trips_repository.dart';
import '../../../shared/models/trip_model.dart';
import '../../../core/config/theme.dart';
import '../../../core/config/animations.dart';
import '../../../core/utils/currency_utils.dart';
import '../../../shared/widgets/animated_widgets.dart';
import '../../../shared/widgets/app_dialogs.dart';
import '../../../shared/widgets/currency_picker.dart';
import '../../../shared/widgets/skeleton_loading.dart';
import '../../../shared/utils/error_handler.dart';

class TripsListPage extends ConsumerStatefulWidget {
  const TripsListPage({super.key});

  @override
  ConsumerState<TripsListPage> createState() => _TripsListPageState();
}

class _TripsListPageState extends ConsumerState<TripsListPage> {
  List<Trip> _trips = [];
  List<Trip> _filteredTrips = [];
  bool _isLoading = true;
  bool _isSearching = false;
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadTrips();
    _searchController.addListener(_filterTrips);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _filterTrips() {
    final query = _searchController.text.toLowerCase().trim();
    setState(() {
      if (query.isEmpty) {
        _filteredTrips = _trips;
      } else {
        _filteredTrips = _trips.where((trip) {
          return trip.name.toLowerCase().contains(query) ||
              (trip.description?.toLowerCase().contains(query) ?? false);
        }).toList();
      }
    });
  }

  Future<void> _loadTrips() async {
    try {
      final trips = await ref.read(tripsRepositoryProvider).getTrips();
      setState(() {
        _trips = trips;
        _filteredTrips = trips;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ErrorHandler.showErrorSnackBar(context, e, prefix: '載入失敗');
      }
    }
  }

  Future<void> _refreshTrips() async {
    final trips = await ref.read(tripsRepositoryProvider).getTrips();
    setState(() {
      _trips = trips;
      _filterTrips();
    });
  }

  Future<void> _showCreateTripDialog() async {
    final nameController = TextEditingController();
    final descController = TextEditingController();
    Currency selectedCurrency = Currency.TWD;

    try {
      await showAppBottomSheet(
        context: context,
        title: '建立新旅程',
        icon: Icons.add_rounded,
        gradient: AppTheme.primaryGradient,
        children: [
          AppTextField(
            controller: nameController,
            label: '旅程名稱',
            hint: '例如：2024 日本東京自由行',
            prefixIcon: Icons.edit_rounded,
            autofocus: true,
            textInputAction: TextInputAction.next,
          ),
          const SizedBox(height: 16),
          AppTextField(
            controller: descController,
            label: '描述（選填）',
            hint: '新增旅程的簡短描述',
            prefixIcon: Icons.notes_rounded,
            maxLines: 2,
          ),
          const SizedBox(height: 16),
          StatefulBuilder(
            builder: (context, setDialogState) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '預設貨幣',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 8),
                  CurrencyPicker(
                    selectedCurrency: selectedCurrency,
                    onCurrencyChanged: (currency) {
                      setDialogState(() => selectedCurrency = currency);
                    },
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 24),
          GradientButton(
            label: '建立旅程',
            icon: Icons.check_rounded,
            gradient: AppTheme.primaryGradient,
            onPressed: () async {
              if (nameController.text.trim().isEmpty) return;
              Navigator.pop(context);
              await _createTrip(
                nameController.text.trim(),
                descController.text.trim(),
                selectedCurrency,
              );
            },
          ),
        ],
      );
    } finally {
      // 確保對話框關閉後釋放控制器資源
      nameController.dispose();
      descController.dispose();
    }
  }

  Future<void> _createTrip(String name, String? description, Currency currency) async {
    try {
      await ref.read(tripsRepositoryProvider).createTrip(
        name: name,
        description: description?.isEmpty == true ? null : description,
        defaultCurrency: currency,
      );
      _loadTrips();
      if (mounted) {
        ErrorHandler.showSuccessSnackBar(context, '旅程建立成功！');
      }
    } catch (e) {
      if (mounted) {
        ErrorHandler.showErrorSnackBar(context, e, prefix: '建立失敗');
      }
    }
  }

  Future<void> _showJoinTripDialog() async {
    final codeController = TextEditingController();

    try {
      await showAppBottomSheet(
        context: context,
        title: '加入旅程',
        icon: Icons.group_add_rounded,
        gradient: AppTheme.secondaryGradient,
        children: [
          AppTextField(
            controller: codeController,
            label: '邀請碼',
            hint: '輸入旅程邀請碼',
            prefixIcon: Icons.vpn_key_rounded,
            autofocus: true,
            textCapitalization: TextCapitalization.characters,
          ),
          const SizedBox(height: 24),
          GradientButton(
            label: '加入旅程',
            icon: Icons.login_rounded,
            gradient: AppTheme.secondaryGradient,
            onPressed: () async {
              if (codeController.text.trim().isEmpty) return;
              Navigator.pop(context);
              await _joinTrip(codeController.text.trim());
            },
          ),
        ],
      );
    } finally {
      // 確保對話框關閉後釋放控制器資源
      codeController.dispose();
    }
  }

  Future<void> _joinTrip(String inviteCode) async {
    try {
      await ref.read(tripsRepositoryProvider).joinTrip(inviteCode);
      _loadTrips();
      if (mounted) {
        ErrorHandler.showSuccessSnackBar(context, '成功加入旅程！');
      }
    } catch (e) {
      if (mounted) {
        ErrorHandler.showErrorSnackBar(context, e, prefix: '加入失敗');
      }
    }
  }

  void _toggleSearch() {
    setState(() {
      _isSearching = !_isSearching;
      if (!_isSearching) {
        _searchController.clear();
      }
    });
  }

  /// 關閉鍵盤
  void _dismissKeyboard() {
    FocusScope.of(context).unfocus();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: _dismissKeyboard,
      child: Scaffold(
        body: RefreshIndicator(
        onRefresh: _refreshTrips,
        color: AppTheme.primaryColor,
        child: CustomScrollView(
          slivers: [
            // 精緻的 App Bar
            SliverAppBar(
              expandedHeight: _isSearching ? 70 : 100,
              floating: false,
              pinned: true,
              stretch: true,
              backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
              flexibleSpace: FlexibleSpaceBar(
                titlePadding: const EdgeInsets.only(left: 20, bottom: 16),
                title: _isSearching
                    ? null
                    : const Text(
                        '我的旅程',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          letterSpacing: -0.5,
                        ),
                      ),
                background: _isSearching
                    ? null
                    : Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: isDark
                                ? [
                                    const Color(0xFF1E293B),
                                    const Color(0xFF0F172A),
                                  ]
                                : [
                                    AppTheme.primaryColor.withValues(alpha: 0.1),
                                    const Color(0xFFF8FAFC),
                                  ],
                          ),
                        ),
                        child: Stack(
                          children: [
                            Positioned(
                              right: -30,
                              top: -20,
                              child: Container(
                                width: 120,
                                height: 120,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: AppTheme.primaryColor.withValues(alpha: 0.1),
                                ),
                              ),
                            ),
                            Positioned(
                              right: 50,
                              top: 40,
                              child: Container(
                                width: 60,
                                height: 60,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: AppTheme.secondaryColor.withValues(alpha: 0.1),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
              ),
              actions: [
                // 搜尋按鈕
                IconButton(
                  icon: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: _isSearching
                          ? AppTheme.primaryColor
                          : (isDark
                              ? Colors.white.withValues(alpha: 0.1)
                              : AppTheme.primaryColor.withValues(alpha: 0.1)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      _isSearching ? Icons.close_rounded : Icons.search_rounded,
                      color: _isSearching ? Colors.white : AppTheme.primaryColor,
                    ),
                  ),
                  onPressed: _toggleSearch,
                  tooltip: _isSearching ? '關閉搜尋' : '搜尋',
                ),
                // 掃描 QR Code
                IconButton(
                  icon: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.1)
                          : AppTheme.primaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.qr_code_scanner_rounded,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                  onPressed: () => context.push('/scan'),
                  tooltip: '掃描 QR Code',
                ),
                // 加入旅程
                IconButton(
                  icon: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: isDark
                          ? Colors.white.withValues(alpha: 0.1)
                          : AppTheme.primaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.group_add_rounded,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                  onPressed: _showJoinTripDialog,
                  tooltip: '加入旅程',
                ),
                const SizedBox(width: 8),
              ],
            ),

            // 搜尋欄
            if (_isSearching)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                  child: TextField(
                    controller: _searchController,
                    autofocus: true,
                    decoration: InputDecoration(
                      hintText: '搜尋旅程名稱或描述...',
                      prefixIcon: Icon(Icons.search_rounded, color: Colors.grey[400]),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: Icon(Icons.clear_rounded, color: Colors.grey[400]),
                              onPressed: () {
                                _searchController.clear();
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
                  ),
                ).animateSlideDown(),
              ),

            // 內容區域
            if (_isLoading)
              SliverFillRemaining(
                child: TripsListSkeleton(itemCount: 5),
              )
            else if (_trips.isEmpty)
              SliverFillRemaining(
                child: EmptyStateWidget(
                  icon: Icons.flight_takeoff_rounded,
                  title: '還沒有任何旅程',
                  subtitle: '點擊下方按鈕建立你的第一個旅程吧！',
                  action: GradientButton(
                    label: '建立旅程',
                    icon: Icons.add_rounded,
                    gradient: AppTheme.primaryGradient,
                    onPressed: _showCreateTripDialog,
                    width: 160,
                  ),
                ),
              )
            else if (_filteredTrips.isEmpty)
              SliverFillRemaining(
                child: EmptyStateWidget(
                  icon: Icons.search_off_rounded,
                  title: '找不到符合的旅程',
                  subtitle: '試試其他關鍵字吧',
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      return _TripCard(
                        trip: _filteredTrips[index],
                        index: index,
                        onTap: () async {
                          final result = await context.push('/trips/${_filteredTrips[index].id}');
                          if (result == true && mounted) {
                            _loadTrips(); // 旅程資料有變更，刷新列表
                          }
                        },
                      );
                    },
                    childCount: _filteredTrips.length,
                  ),
                ),
              ),
          ],
        ),
      ),
      floatingActionButton: _trips.isNotEmpty
          ? Container(
              decoration: BoxDecoration(
                gradient: AppTheme.primaryGradient,
                borderRadius: BorderRadius.circular(16),
                boxShadow: AppTheme.coloredShadow,
              ),
              child: FloatingActionButton.extended(
                onPressed: _showCreateTripDialog,
                backgroundColor: Colors.transparent,
                elevation: 0,
                highlightElevation: 0,
                icon: const Icon(Icons.add_rounded, color: Colors.white),
                label: const Text(
                  '建立旅程',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ).animateEnter(delay: 500)
          : null,
      ),
    );
  }
}

class _TripCard extends StatelessWidget {
  final Trip trip;
  final int index;
  final VoidCallback onTap;

  const _TripCard({
    required this.trip,
    required this.index,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // 隨機選擇漸層色（基於 trip id 的 hash）
    final gradients = [
      AppTheme.primaryGradient,
      AppTheme.secondaryGradient,
      AppTheme.warmGradient,
      const LinearGradient(
        colors: [Color(0xFFEC4899), Color(0xFFF472B6)],
      ),
    ];
    final gradient = gradients[trip.id.hashCode.abs() % gradients.length];

    return AnimatedCard(
      delayMs: index * 80,
      onTap: onTap,
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 頂部漸層裝飾條
          Container(
            height: 6,
            decoration: BoxDecoration(
              gradient: gradient,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(16),
              ),
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    // 圖示
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        gradient: gradient,
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [
                          BoxShadow(
                            color: gradient.colors.first.withValues(alpha: 0.3),
                            blurRadius: 8,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: const Icon(
                        Icons.flight_rounded,
                        color: Colors.white,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 14),

                    // 標題和描述
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            trip.name,
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.bold,
                              letterSpacing: -0.3,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (trip.description != null &&
                              trip.description!.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(
                              trip.description!,
                              style: TextStyle(
                                fontSize: 14,
                                color: Colors.grey[500],
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ],
                      ),
                    ),

                    // 箭頭
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.1)
                            : Colors.grey.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        Icons.chevron_right_rounded,
                        color: Colors.grey[400],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                // 統計資訊
                Row(
                  children: [
                    _StatChip(
                      icon: Icons.people_rounded,
                      label: '${trip.memberCount} 人',
                      color: AppTheme.primaryColor,
                    ),
                    const SizedBox(width: 12),
                    _StatChip(
                      icon: Icons.receipt_long_rounded,
                      label: '${trip.billCount} 筆帳單',
                      color: AppTheme.secondaryColor,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _StatChip({
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

