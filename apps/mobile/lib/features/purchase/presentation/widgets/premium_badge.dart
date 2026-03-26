import 'package:flutter/material.dart';
import '../../../../core/config/theme.dart';

/// 進階版徽章
class PremiumBadge extends StatelessWidget {
  final bool showText;
  final double size;

  const PremiumBadge({
    super.key,
    this.showText = true,
    this.size = 16,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: showText ? 8 : 4,
        vertical: 4,
      ),
      decoration: BoxDecoration(
        gradient: AppTheme.warmGradient,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFF97316).withValues(alpha: 0.3),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.star_rounded,
            color: Colors.white,
            size: size,
          ),
          if (showText) ...[
            const SizedBox(width: 4),
            Text(
              '進階版',
              style: TextStyle(
                color: Colors.white,
                fontSize: size * 0.75,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// 鎖定覆蓋層（用於顯示功能需要進階版）
class PremiumLockOverlay extends StatelessWidget {
  final Widget child;
  final bool isLocked;
  final VoidCallback? onTap;
  final String? message;

  const PremiumLockOverlay({
    super.key,
    required this.child,
    required this.isLocked,
    this.onTap,
    this.message,
  });

  @override
  Widget build(BuildContext context) {
    if (!isLocked) return child;

    return Stack(
      children: [
        // 原始內容（模糊）
        Opacity(
          opacity: 0.5,
          child: IgnorePointer(child: child),
        ),

        // 鎖定覆蓋
        Positioned.fill(
          child: GestureDetector(
            onTap: onTap,
            child: Container(
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.9),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.lock_rounded,
                      color: AppTheme.primaryColor,
                      size: 32,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    message ?? '升級進階版解鎖',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      gradient: AppTheme.primaryGradient,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.arrow_upward_rounded,
                          color: Colors.white,
                          size: 16,
                        ),
                        SizedBox(width: 4),
                        Text(
                          '立即升級',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

/// 剩餘天數標籤
class RemainingDaysBadge extends StatelessWidget {
  final int? remainingDays;

  const RemainingDaysBadge({
    super.key,
    this.remainingDays,
  });

  @override
  Widget build(BuildContext context) {
    if (remainingDays == null) return const SizedBox.shrink();

    final isExpiringSoon = remainingDays! <= 3;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isExpiringSoon
            ? Colors.orange.withValues(alpha: 0.1)
            : AppTheme.primaryColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: isExpiringSoon
              ? Colors.orange.withValues(alpha: 0.3)
              : AppTheme.primaryColor.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isExpiringSoon ? Icons.warning_rounded : Icons.schedule_rounded,
            color: isExpiringSoon ? Colors.orange : AppTheme.primaryColor,
            size: 14,
          ),
          const SizedBox(width: 4),
          Text(
            '剩餘 $remainingDays 天',
            style: TextStyle(
              color: isExpiringSoon ? Colors.orange : AppTheme.primaryColor,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
