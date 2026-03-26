import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'theme.dart';

/// 統一動畫擴展方法
///
/// 使用方式：
/// ```dart
/// Widget().animateEnter()           // 標準入場動畫
/// Widget().animateEnter(delay: 100) // 帶延遲的入場動畫
/// Widget().animateCard(index: 2)    // 卡片列表動畫（帶索引延遲）
/// Widget().animateScale()           // 縮放入場
/// ```
extension AppAnimations on Widget {
  /// 標準入場動畫 - fadeIn + slideY
  Widget animateEnter({int delay = 0}) {
    return animate(delay: Duration(milliseconds: delay))
        .fadeIn(duration: AppTheme.animNormal, curve: AppTheme.curveDefault)
        .slideY(
          begin: AppTheme.slideOffset,
          end: 0,
          duration: AppTheme.animNormal,
          curve: AppTheme.curveEnter,
        );
  }

  /// 快速入場動畫
  Widget animateEnterFast({int delay = 0}) {
    return animate(delay: Duration(milliseconds: delay))
        .fadeIn(duration: AppTheme.animFast, curve: AppTheme.curveDefault)
        .slideY(
          begin: AppTheme.slideOffset * 0.5,
          end: 0,
          duration: AppTheme.animFast,
          curve: AppTheme.curveEnter,
        );
  }

  /// 卡片列表動畫 - 帶索引延遲
  Widget animateCard({int index = 0, int baseDelay = 0}) {
    final delay = baseDelay + (index * 50);
    return animate(delay: Duration(milliseconds: delay))
        .fadeIn(duration: AppTheme.animNormal, curve: AppTheme.curveDefault)
        .slideY(
          begin: AppTheme.slideOffset,
          end: 0,
          duration: AppTheme.animNormal,
          curve: AppTheme.curveEnter,
        );
  }

  /// 縮放入場動畫
  Widget animateScale({int delay = 0}) {
    return animate(delay: Duration(milliseconds: delay))
        .fadeIn(duration: AppTheme.animFast, curve: AppTheme.curveDefault)
        .scale(
          begin: Offset(AppTheme.scaleStart, AppTheme.scaleStart),
          end: const Offset(1, 1),
          duration: AppTheme.animFast,
          curve: AppTheme.curveEnter,
        );
  }

  /// 彈性縮放動畫
  Widget animateScaleBounce({int delay = 0}) {
    return animate(delay: Duration(milliseconds: delay))
        .fadeIn(duration: AppTheme.animNormal, curve: AppTheme.curveDefault)
        .scale(
          begin: const Offset(0.8, 0.8),
          end: const Offset(1, 1),
          duration: AppTheme.animNormal,
          curve: AppTheme.curveBounce,
        );
  }

  /// 底部滑入動畫（用於 Bottom Sheet）
  Widget animateSlideUp({int delay = 0}) {
    return animate(delay: Duration(milliseconds: delay))
        .fadeIn(duration: AppTheme.animNormal, curve: AppTheme.curveDefault)
        .slideY(
          begin: 0.15,
          end: 0,
          duration: AppTheme.animNormal,
          curve: AppTheme.curveEnter,
        );
  }

  /// 頂部滑入動畫（用於搜尋欄等）
  Widget animateSlideDown({int delay = 0}) {
    return animate(delay: Duration(milliseconds: delay))
        .fadeIn(duration: AppTheme.animFast, curve: AppTheme.curveDefault)
        .slideY(
          begin: -0.15,
          end: 0,
          duration: AppTheme.animFast,
          curve: AppTheme.curveEnter,
        );
  }

  /// 淡入動畫
  Widget animateFadeIn({int delay = 0, Duration? duration}) {
    return animate(delay: Duration(milliseconds: delay))
        .fadeIn(
          duration: duration ?? AppTheme.animNormal,
          curve: AppTheme.curveDefault,
        );
  }

  /// 脈動動畫（用於提醒、徽章等）
  Widget animatePulse() {
    return animate(onPlay: (controller) => controller.repeat(reverse: true))
        .scale(
          begin: const Offset(1, 1),
          end: const Offset(1.05, 1.05),
          duration: const Duration(milliseconds: 800),
          curve: Curves.easeInOut,
        );
  }

  /// Shimmer 載入動畫
  Widget animateShimmer() {
    return animate(onPlay: (controller) => controller.repeat())
        .shimmer(
          duration: const Duration(milliseconds: 1200),
          color: Colors.white.withValues(alpha: 0.3),
        );
  }
}

/// 頁面轉場動畫
class AppPageTransitions {
  /// 標準頁面轉場
  static PageRouteBuilder<T> slideUp<T>({
    required Widget child,
    RouteSettings? settings,
  }) {
    return PageRouteBuilder<T>(
      settings: settings,
      pageBuilder: (context, animation, secondaryAnimation) => child,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        final tween = Tween(begin: const Offset(0, 0.1), end: Offset.zero);
        final curvedAnimation = CurvedAnimation(
          parent: animation,
          curve: AppTheme.curveEnter,
        );
        return SlideTransition(
          position: tween.animate(curvedAnimation),
          child: FadeTransition(
            opacity: animation,
            child: child,
          ),
        );
      },
      transitionDuration: AppTheme.animNormal,
    );
  }

  /// 縮放轉場
  static PageRouteBuilder<T> scale<T>({
    required Widget child,
    RouteSettings? settings,
  }) {
    return PageRouteBuilder<T>(
      settings: settings,
      pageBuilder: (context, animation, secondaryAnimation) => child,
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        final curvedAnimation = CurvedAnimation(
          parent: animation,
          curve: AppTheme.curveEnter,
        );
        return ScaleTransition(
          scale: Tween(begin: 0.95, end: 1.0).animate(curvedAnimation),
          child: FadeTransition(
            opacity: animation,
            child: child,
          ),
        );
      },
      transitionDuration: AppTheme.animFast,
    );
  }
}
