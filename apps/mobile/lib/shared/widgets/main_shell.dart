import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/config/theme.dart';
import '../../core/config/animations.dart';
import '../../core/services/ad_service.dart';
import '../../features/trips/presentation/trips_list_page.dart';
import '../../features/notifications/presentation/notifications_page.dart';
import '../../features/settings/presentation/settings_page.dart';
import '../../features/notifications/data/notifications_repository.dart';
import '../../features/purchase/providers/purchase_providers.dart';
import 'banner_ad_widget.dart';

/// 目前選中的底部導航索引 Provider
final bottomNavIndexProvider = StateProvider<int>((ref) => 0);

/// 主要框架頁面 - 包含底部導航欄
/// 參考 Revolut/Monzo 的現代化底部導航設計
class MainShell extends ConsumerStatefulWidget {
  const MainShell({super.key});

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell> {
  // 頁面列表
  final List<Widget> _pages = const [
    TripsListPage(),
    NotificationsPage(),
    SettingsPage(),
  ];

  @override
  Widget build(BuildContext context) {
    final currentIndex = ref.watch(bottomNavIndexProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final unreadCount = ref.watch(unreadCountProvider);
    final isAdInitialized = ref.watch(adInitializedProvider);
    final isAdFree = ref.watch(isAdFreeProvider);

    // 只有當廣告已初始化且用戶未購買去廣告時才顯示廣告
    final shouldShowAd = isAdInitialized && !isAdFree;

    return Scaffold(
      body: IndexedStack(
        index: currentIndex,
        children: _pages,
      ),
      bottomNavigationBar: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 橫幅廣告（去廣告用戶不顯示）
          if (shouldShowAd) const BannerAdWidget(),
          // 底部導航
          _ModernBottomNav(
            currentIndex: currentIndex,
            isDark: isDark,
            unreadCount: unreadCount,
            onTap: _onItemTapped,
          ),
        ],
      ),
    );
  }

  void _onItemTapped(int index) {
    HapticFeedback.selectionClick();
    ref.read(bottomNavIndexProvider.notifier).state = index;
  }
}

/// 現代化底部導航欄 - 參考 Revolut 設計
class _ModernBottomNav extends StatelessWidget {
  final int currentIndex;
  final bool isDark;
  final int unreadCount;
  final ValueChanged<int> onTap;

  const _ModernBottomNav({
    required this.currentIndex,
    required this.isDark,
    required this.unreadCount,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        border: Border(
          top: BorderSide(
            color: isDark
                ? Colors.white.withValues(alpha: 0.05)
                : Colors.black.withValues(alpha: 0.04),
            width: 1,
          ),
        ),
        boxShadow: isDark ? null : [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 20,
            offset: const Offset(0, -8),
          ),
        ],
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _ModernNavItem(
                index: 0,
                currentIndex: currentIndex,
                icon: Icons.luggage_rounded,
                activeIcon: Icons.luggage_rounded,
                label: '旅程',
                onTap: () => onTap(0),
              ),
              _ModernNavItem(
                index: 1,
                currentIndex: currentIndex,
                icon: Icons.notifications_outlined,
                activeIcon: Icons.notifications_rounded,
                label: '通知',
                badgeCount: unreadCount,
                onTap: () => onTap(1),
              ),
              _ModernNavItem(
                index: 2,
                currentIndex: currentIndex,
                icon: Icons.settings_outlined,
                activeIcon: Icons.settings_rounded,
                label: '設定',
                onTap: () => onTap(2),
              ),
            ],
          ),
        ),
      ),
    ).animateSlideUp();
  }
}

/// 現代化導航項目
class _ModernNavItem extends StatefulWidget {
  final int index;
  final int currentIndex;
  final IconData icon;
  final IconData activeIcon;
  final String label;
  final VoidCallback onTap;
  final int? badgeCount;

  const _ModernNavItem({
    required this.index,
    required this.currentIndex,
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.onTap,
    this.badgeCount,
  });

  bool get isSelected => index == currentIndex;

  @override
  State<_ModernNavItem> createState() => _ModernNavItemState();
}

class _ModernNavItemState extends State<_ModernNavItem>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.9).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTapDown: (_) => _controller.forward(),
      onTapUp: (_) {
        _controller.reverse();
        widget.onTap();
      },
      onTapCancel: () => _controller.reverse(),
      behavior: HitTestBehavior.opaque,
      child: AnimatedBuilder(
        animation: _scaleAnimation,
        builder: (context, child) {
          return Transform.scale(
            scale: _scaleAnimation.value,
            child: child,
          );
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOutCubic,
          padding: EdgeInsets.symmetric(
            horizontal: widget.isSelected ? 20 : 16,
            vertical: 10,
          ),
          decoration: BoxDecoration(
            gradient: widget.isSelected ? AppTheme.primaryGradient : null,
            color: widget.isSelected
                ? null
                : (isDark ? Colors.transparent : Colors.transparent),
            borderRadius: BorderRadius.circular(14),
            boxShadow: widget.isSelected ? [
              BoxShadow(
                color: AppTheme.primaryColor.withValues(alpha: 0.3),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ] : null,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 200),
                    child: Icon(
                      widget.isSelected ? widget.activeIcon : widget.icon,
                      key: ValueKey(widget.isSelected),
                      size: 24,
                      color: widget.isSelected
                          ? Colors.white
                          : (isDark ? Colors.grey[400] : Colors.grey[600]),
                    ),
                  ),
                  // 未讀徽章
                  if (widget.badgeCount != null && widget.badgeCount! > 0)
                    Positioned(
                      right: -8,
                      top: -6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                        decoration: BoxDecoration(
                          gradient: AppTheme.dangerGradient,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: isDark ? const Color(0xFF1E293B) : Colors.white,
                            width: 2,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFEF4444).withValues(alpha: 0.4),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        constraints: const BoxConstraints(
                          minWidth: 18,
                          minHeight: 18,
                        ),
                        child: Center(
                          child: Text(
                            widget.badgeCount! > 99 ? '99+' : widget.badgeCount.toString(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              height: 1,
                            ),
                          ),
                        ),
                      ).animatePulse(),
                    ),
                ],
              ),
              // 選中時顯示文字標籤
              AnimatedSize(
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeOutCubic,
                child: widget.isSelected
                    ? Padding(
                        padding: const EdgeInsets.only(left: 10),
                        child: Text(
                          widget.label,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize: 14,
                            letterSpacing: -0.3,
                          ),
                        ),
                      )
                    : const SizedBox.shrink(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
