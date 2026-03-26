import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../data/notifications_repository.dart';
import '../../../shared/models/notification_model.dart';
import '../../../core/config/theme.dart';
import '../../../core/utils/currency_utils.dart';
import '../../../shared/widgets/animated_widgets.dart';

class NotificationsPage extends ConsumerWidget {
  const NotificationsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(notificationsProvider);
    final notifier = ref.read(notificationsProvider.notifier);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('通知'),
        automaticallyImplyLeading: false, // 移除返回按鈕（從底部導航進入）
        backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
        actions: [
          if (state.notifications.any((n) => !n.isRead))
            TextButton.icon(
              onPressed: () => notifier.markAllAsRead(),
              icon: Icon(Icons.done_all_rounded, size: 18, color: AppTheme.primaryColor),
              label: Text(
                '全部已讀',
                style: TextStyle(color: AppTheme.primaryColor),
              ),
            ),
        ],
      ),
      body: state.isLoading
          ? _buildLoadingState()
          : state.error != null
              ? _buildErrorState(state.error!, () => notifier.loadNotifications())
              : state.notifications.isEmpty
                  ? _buildEmptyState()
                  : _buildNotificationsList(context, ref, state.notifications),
    );
  }

  Widget _buildLoadingState() {
    return Center(
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
    );
  }

  Widget _buildErrorState(String error, VoidCallback onRetry) {
    return EmptyStateWidget(
      icon: Icons.error_outline_rounded,
      title: '載入失敗',
      subtitle: error,
      action: GradientButton(
        label: '重試',
        icon: Icons.refresh_rounded,
        gradient: AppTheme.primaryGradient,
        onPressed: onRetry,
        width: 120,
      ),
    );
  }

  Widget _buildEmptyState() {
    return EmptyStateWidget(
      icon: Icons.notifications_off_rounded,
      title: '沒有通知',
      subtitle: '當有新的活動時，你會在這裡收到通知',
    );
  }

  Widget _buildNotificationsList(
    BuildContext context,
    WidgetRef ref,
    List<AppNotification> notifications,
  ) {
    // 將通知分組：今天、昨天、更早
    final today = DateTime.now();
    final yesterday = today.subtract(const Duration(days: 1));

    final todayNotifications = notifications.where((n) =>
        n.createdAt.year == today.year &&
        n.createdAt.month == today.month &&
        n.createdAt.day == today.day).toList();

    final yesterdayNotifications = notifications.where((n) =>
        n.createdAt.year == yesterday.year &&
        n.createdAt.month == yesterday.month &&
        n.createdAt.day == yesterday.day).toList();

    final olderNotifications = notifications.where((n) =>
        n.createdAt.isBefore(yesterday.subtract(const Duration(days: 1)))).toList();

    return RefreshIndicator(
      onRefresh: () => ref.read(notificationsProvider.notifier).loadNotifications(),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (todayNotifications.isNotEmpty) ...[
            _buildSectionHeader('今天', Icons.today_rounded, 0),
            const SizedBox(height: 12),
            ...todayNotifications.asMap().entries.map((entry) => _NotificationCard(
                  notification: entry.value,
                  index: entry.key,
                  onTap: () => _handleNotificationTap(context, ref, entry.value),
                  onDismiss: () => ref
                      .read(notificationsProvider.notifier)
                      .deleteNotification(entry.value.id),
                )),
            const SizedBox(height: 24),
          ],
          if (yesterdayNotifications.isNotEmpty) ...[
            _buildSectionHeader('昨天', Icons.history_rounded, 200),
            const SizedBox(height: 12),
            ...yesterdayNotifications.asMap().entries.map((entry) => _NotificationCard(
                  notification: entry.value,
                  index: entry.key + todayNotifications.length,
                  onTap: () => _handleNotificationTap(context, ref, entry.value),
                  onDismiss: () => ref
                      .read(notificationsProvider.notifier)
                      .deleteNotification(entry.value.id),
                )),
            const SizedBox(height: 24),
          ],
          if (olderNotifications.isNotEmpty) ...[
            _buildSectionHeader('更早', Icons.schedule_rounded, 400),
            const SizedBox(height: 12),
            ...olderNotifications.asMap().entries.map((entry) => _NotificationCard(
                  notification: entry.value,
                  index: entry.key + todayNotifications.length + yesterdayNotifications.length,
                  onTap: () => _handleNotificationTap(context, ref, entry.value),
                  onDismiss: () => ref
                      .read(notificationsProvider.notifier)
                      .deleteNotification(entry.value.id),
                )),
          ],
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon, int delayMs) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppTheme.primaryColor),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            letterSpacing: -0.3,
          ),
        ),
      ],
    )
        .animate(delay: Duration(milliseconds: delayMs))
        .fadeIn(duration: 400.ms)
        .slideX(begin: -0.1, end: 0);
  }

  void _handleNotificationTap(BuildContext context, WidgetRef ref, AppNotification notification) {
    // 標記為已讀
    if (!notification.isRead) {
      ref.read(notificationsProvider.notifier).markAsRead(notification.id);
    }

    // 根據通知類型導航
    switch (notification.type) {
      case NotificationType.newBill:
      case NotificationType.billUpdated:
        if (notification.tripId != null && notification.billId != null) {
          context.go('/trips/${notification.tripId}/bill/${notification.billId}');
        }
        break;
      case NotificationType.settlementRequest:
      case NotificationType.settlementConfirmed:
        if (notification.tripId != null) {
          context.go('/trips/${notification.tripId}/settlement');
        }
        break;
      case NotificationType.memberJoined:
      case NotificationType.memberLeft:
        if (notification.tripId != null) {
          context.go('/trips/${notification.tripId}/members');
        }
        break;
      case NotificationType.tripInvite:
      case NotificationType.reminder:
        if (notification.tripId != null) {
          context.go('/trips/${notification.tripId}');
        }
        break;
      case NotificationType.billDeleted:
        if (notification.tripId != null) {
          context.go('/trips/${notification.tripId}');
        }
        break;
    }
  }
}

class _NotificationCard extends StatelessWidget {
  final AppNotification notification;
  final int index;
  final VoidCallback onTap;
  final VoidCallback onDismiss;

  const _NotificationCard({
    required this.notification,
    required this.index,
    required this.onTap,
    required this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final (icon, gradient) = _getNotificationStyle();

    return Dismissible(
      key: Key(notification.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => onDismiss(),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          gradient: AppTheme.dangerGradient,
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Icon(
          Icons.delete_rounded,
          color: Colors.white,
        ),
      ),
      child: AnimatedCard(
        delayMs: 100 + index * 50,
        onTap: onTap,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 圖示
            Stack(
              children: [
                GradientIconBox(
                  icon: icon,
                  gradient: gradient,
                  size: 48,
                  iconSize: 24,
                ),
                // 未讀指示點
                if (!notification.isRead)
                  Positioned(
                    right: 0,
                    top: 0,
                    child: Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: isDark ? const Color(0xFF1E293B) : Colors.white,
                          width: 2,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 14),

            // 內容
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          notification.title,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: notification.isRead ? FontWeight.w500 : FontWeight.bold,
                            letterSpacing: -0.3,
                          ),
                        ),
                      ),
                      Text(
                        _formatTime(notification.createdAt),
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[500],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    notification.message,
                    style: TextStyle(
                      fontSize: 14,
                      color: notification.isRead ? Colors.grey[500] : Colors.grey[700],
                      height: 1.4,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (notification.tripName != null) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.flight_takeoff_rounded,
                            size: 12,
                            color: AppTheme.primaryColor,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            notification.tripName!,
                            style: TextStyle(
                              fontSize: 12,
                              color: AppTheme.primaryColor,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  if (notification.amount != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      CurrencyUtils.formatAmount(
                        notification.amount!,
                        notification.currency ?? Currency.TWD,
                      ),
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: gradient.colors.first,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  (IconData, LinearGradient) _getNotificationStyle() {
    switch (notification.type) {
      case NotificationType.newBill:
        return (Icons.receipt_long_rounded, AppTheme.primaryGradient);
      case NotificationType.billUpdated:
        return (Icons.edit_rounded, AppTheme.secondaryGradient);
      case NotificationType.billDeleted:
        return (Icons.delete_rounded, AppTheme.dangerGradient);
      case NotificationType.settlementRequest:
        return (Icons.payments_rounded, AppTheme.warmGradient);
      case NotificationType.settlementConfirmed:
        return (Icons.check_circle_rounded, AppTheme.successGradient);
      case NotificationType.memberJoined:
        return (Icons.person_add_rounded, AppTheme.successGradient);
      case NotificationType.memberLeft:
        return (Icons.person_remove_rounded, AppTheme.dangerGradient);
      case NotificationType.tripInvite:
        return (Icons.card_giftcard_rounded, AppTheme.primaryGradient);
      case NotificationType.reminder:
        return (Icons.notifications_active_rounded, AppTheme.secondaryGradient);
    }
  }

  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inMinutes < 1) {
      return '剛剛';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes} 分鐘前';
    } else if (difference.inHours < 24) {
      return '${difference.inHours} 小時前';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} 天前';
    } else {
      return '${dateTime.month}/${dateTime.day}';
    }
  }
}
