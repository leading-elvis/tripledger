import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../core/config/theme.dart';
import '../../core/utils/currency_utils.dart';

// ============================================================================
// 按鈕系統 - 參考 Revolut/Monzo 設計
// ============================================================================

/// 按鈕尺寸
enum ButtonSize { small, medium, large }

/// 漸層背景按鈕（主要操作）
class GradientButton extends StatefulWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final LinearGradient gradient;
  final bool isLoading;
  final double? width;
  final ButtonSize size;
  final double? _customHeight;

  const GradientButton({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.gradient = AppTheme.primaryGradient,
    this.isLoading = false,
    this.width,
    this.size = ButtonSize.large,
    double? height,
  }) : _customHeight = height;

  // 如果有指定 height 則使用，否則根據 size 決定
  double get height {
    if (_customHeight != null) return _customHeight;
    switch (size) {
      case ButtonSize.small:
        return 40;
      case ButtonSize.medium:
        return 46;
      case ButtonSize.large:
        return 52;
    }
  }

  @override
  State<GradientButton> createState() => _GradientButtonState();
}

class _GradientButtonState extends State<GradientButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.96).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  double get _fontSize {
    switch (widget.size) {
      case ButtonSize.small:
        return 14;
      case ButtonSize.medium:
        return 15;
      case ButtonSize.large:
        return 16;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDisabled = widget.onPressed == null || widget.isLoading;

    return AnimatedBuilder(
      animation: _scaleAnimation,
      builder: (context, child) {
        return Transform.scale(
          scale: _scaleAnimation.value,
          child: child,
        );
      },
      child: GestureDetector(
        onTapDown: (_) {
          if (!isDisabled) {
            setState(() => _isPressed = true);
            _controller.forward();
            HapticFeedback.lightImpact();
          }
        },
        onTapUp: (_) {
          if (_isPressed) {
            setState(() => _isPressed = false);
            _controller.reverse();
          }
        },
        onTap: () {
          if (!isDisabled) {
            widget.onPressed?.call();
          }
        },
        onTapCancel: () {
          if (_isPressed) {
            setState(() => _isPressed = false);
            _controller.reverse();
          }
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            gradient: isDisabled
                ? LinearGradient(
                    colors: widget.gradient.colors
                        .map((c) => c.withValues(alpha: 0.4))
                        .toList(),
                  )
                : widget.gradient,
            borderRadius: BorderRadius.circular(AppTheme.radiusSm),
            boxShadow: isDisabled
                ? null
                : [
                    BoxShadow(
                      color: widget.gradient.colors.first.withValues(alpha: _isPressed ? 0.2 : 0.35),
                      blurRadius: _isPressed ? 8 : 16,
                      offset: Offset(0, _isPressed ? 2 : 6),
                    ),
                  ],
          ),
          child: Center(
            child: widget.isLoading
                ? SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        Colors.white.withValues(alpha: 0.9),
                      ),
                    ),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (widget.icon != null) ...[
                        Icon(widget.icon, color: Colors.white, size: _fontSize + 4),
                        const SizedBox(width: 8),
                      ],
                      Text(
                        widget.label,
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: _fontSize,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.3,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }
}

/// 次要按鈕（Secondary - 有邊框）- 參考 N26 設計
class SecondaryButton extends StatefulWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final Color? color;
  final bool isLoading;
  final double? width;
  final ButtonSize size;

  const SecondaryButton({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.color,
    this.isLoading = false,
    this.width,
    this.size = ButtonSize.large,
  });

  double get height {
    switch (size) {
      case ButtonSize.small:
        return 40;
      case ButtonSize.medium:
        return 46;
      case ButtonSize.large:
        return 52;
    }
  }

  @override
  State<SecondaryButton> createState() => _SecondaryButtonState();
}

class _SecondaryButtonState extends State<SecondaryButton> {
  bool _isPressed = false;

  double get _fontSize {
    switch (widget.size) {
      case ButtonSize.small:
        return 14;
      case ButtonSize.medium:
        return 15;
      case ButtonSize.large:
        return 16;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final buttonColor = widget.color ?? AppTheme.primaryColor;
    final isDisabled = widget.onPressed == null || widget.isLoading;

    return GestureDetector(
      onTapDown: (_) {
        if (!isDisabled) {
          setState(() => _isPressed = true);
          HapticFeedback.lightImpact();
        }
      },
      onTapUp: (_) {
        if (_isPressed) {
          setState(() => _isPressed = false);
        }
      },
      onTapCancel: () => setState(() => _isPressed = false),
      onTap: () {
        if (!isDisabled) {
          widget.onPressed?.call();
        }
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: widget.width,
        height: widget.height,
        decoration: BoxDecoration(
          color: _isPressed
              ? buttonColor.withValues(alpha: 0.1)
              : (isDark ? const Color(0xFF1E293B) : Colors.white),
          borderRadius: BorderRadius.circular(AppTheme.radiusSm),
          border: Border.all(
            color: isDisabled
                ? buttonColor.withValues(alpha: 0.2)
                : buttonColor.withValues(alpha: _isPressed ? 0.6 : 0.35),
            width: 1.5,
          ),
          boxShadow: isDark || isDisabled ? null : AppTheme.softShadow,
        ),
        child: Center(
          child: widget.isLoading
              ? SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    valueColor: AlwaysStoppedAnimation<Color>(buttonColor),
                  ),
                )
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (widget.icon != null) ...[
                      Icon(
                        widget.icon,
                        color: isDisabled ? buttonColor.withValues(alpha: 0.4) : buttonColor,
                        size: _fontSize + 4,
                      ),
                      const SizedBox(width: 8),
                    ],
                    Text(
                      widget.label,
                      style: TextStyle(
                        color: isDisabled ? buttonColor.withValues(alpha: 0.4) : buttonColor,
                        fontSize: _fontSize,
                        fontWeight: FontWeight.w600,
                        letterSpacing: -0.3,
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}

/// 三級按鈕（Tertiary - 純文字/淡背景）- 參考 Monzo 設計
class TertiaryButton extends StatefulWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final Color? color;
  final ButtonSize size;

  const TertiaryButton({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.color,
    this.size = ButtonSize.medium,
  });

  @override
  State<TertiaryButton> createState() => _TertiaryButtonState();
}

class _TertiaryButtonState extends State<TertiaryButton> {
  bool _isPressed = false;

  double get _fontSize {
    switch (widget.size) {
      case ButtonSize.small:
        return 13;
      case ButtonSize.medium:
        return 14;
      case ButtonSize.large:
        return 15;
    }
  }

  double get _height {
    switch (widget.size) {
      case ButtonSize.small:
        return 36;
      case ButtonSize.medium:
        return 40;
      case ButtonSize.large:
        return 44;
    }
  }

  @override
  Widget build(BuildContext context) {
    final buttonColor = widget.color ?? AppTheme.primaryColor;
    final isDisabled = widget.onPressed == null;

    return GestureDetector(
      onTapDown: (_) {
        if (!isDisabled) {
          setState(() => _isPressed = true);
          HapticFeedback.selectionClick();
        }
      },
      onTapUp: (_) {
        if (_isPressed) {
          setState(() => _isPressed = false);
          widget.onPressed?.call();
        }
      },
      onTapCancel: () => setState(() => _isPressed = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 100),
        height: _height,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: _isPressed ? buttonColor.withValues(alpha: 0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(AppTheme.radiusSm),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (widget.icon != null) ...[
              Icon(
                widget.icon,
                color: isDisabled ? buttonColor.withValues(alpha: 0.4) : buttonColor,
                size: _fontSize + 2,
              ),
              const SizedBox(width: 6),
            ],
            Text(
              widget.label,
              style: TextStyle(
                color: isDisabled ? buttonColor.withValues(alpha: 0.4) : buttonColor,
                fontSize: _fontSize,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 危險操作按鈕
class DangerButton extends StatefulWidget {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool isLoading;
  final double? width;
  final ButtonSize size;
  final bool outlined;

  const DangerButton({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.isLoading = false,
    this.width,
    this.size = ButtonSize.large,
    this.outlined = false,
  });

  @override
  State<DangerButton> createState() => _DangerButtonState();
}

class _DangerButtonState extends State<DangerButton> {
  bool _isPressed = false;

  double get _height {
    switch (widget.size) {
      case ButtonSize.small:
        return 40;
      case ButtonSize.medium:
        return 46;
      case ButtonSize.large:
        return 52;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    const dangerColor = Color(0xFFEF4444);
    final isDisabled = widget.onPressed == null || widget.isLoading;

    return GestureDetector(
      onTapDown: (_) {
        if (!isDisabled) {
          setState(() => _isPressed = true);
          HapticFeedback.mediumImpact();
        }
      },
      onTapUp: (_) {
        if (_isPressed) {
          setState(() => _isPressed = false);
        }
      },
      onTapCancel: () => setState(() => _isPressed = false),
      onTap: () {
        if (!isDisabled) {
          widget.onPressed?.call();
        }
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        width: widget.width,
        height: _height,
        decoration: BoxDecoration(
          gradient: widget.outlined ? null : AppTheme.dangerGradient,
          color: widget.outlined
              ? (_isPressed ? dangerColor.withValues(alpha: 0.1) : (isDark ? const Color(0xFF1E293B) : Colors.white))
              : null,
          borderRadius: BorderRadius.circular(AppTheme.radiusSm),
          border: widget.outlined ? Border.all(
            color: dangerColor.withValues(alpha: _isPressed ? 0.8 : 0.5),
            width: 1.5,
          ) : null,
          boxShadow: widget.outlined || isDisabled ? null : [
            BoxShadow(
              color: dangerColor.withValues(alpha: _isPressed ? 0.2 : 0.35),
              blurRadius: _isPressed ? 8 : 12,
              offset: Offset(0, _isPressed ? 2 : 4),
            ),
          ],
        ),
        child: Center(
          child: widget.isLoading
              ? SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      widget.outlined ? dangerColor : Colors.white,
                    ),
                  ),
                )
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (widget.icon != null) ...[
                      Icon(
                        widget.icon,
                        color: widget.outlined ? dangerColor : Colors.white,
                        size: 20,
                      ),
                      const SizedBox(width: 8),
                    ],
                    Text(
                      widget.label,
                      style: TextStyle(
                        color: widget.outlined ? dangerColor : Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.3,
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}

// ============================================================================
// 卡片系統 - 參考 Splitwise/Revolut 設計
// ============================================================================

/// 帶動畫效果的精緻卡片
class AnimatedCard extends StatefulWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final LinearGradient? gradient;
  final int delayMs;
  final bool enableTapFeedback;

  const AnimatedCard({
    super.key,
    required this.child,
    this.padding,
    this.margin,
    this.onTap,
    this.onLongPress,
    this.gradient,
    this.delayMs = 0,
    this.enableTapFeedback = true,
  });

  @override
  State<AnimatedCard> createState() => _AnimatedCardState();
}

class _AnimatedCardState extends State<AnimatedCard> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    Widget card = GestureDetector(
      onTapDown: widget.enableTapFeedback && widget.onTap != null
          ? (_) => setState(() => _isPressed = true)
          : null,
      onTapUp: widget.enableTapFeedback && widget.onTap != null
          ? (_) {
              setState(() => _isPressed = false);
              widget.onTap?.call();
            }
          : null,
      onTapCancel: widget.enableTapFeedback
          ? () => setState(() => _isPressed = false)
          : null,
      onLongPress: widget.onLongPress != null
          ? () {
              HapticFeedback.mediumImpact();
              widget.onLongPress?.call();
            }
          : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        margin: widget.margin ?? const EdgeInsets.only(bottom: 12),
        transform: _isPressed
            ? (Matrix4.identity()..scale(0.98, 0.98, 1.0))
            : Matrix4.identity(),
        transformAlignment: Alignment.center,
        decoration: BoxDecoration(
          gradient: widget.gradient,
          color: widget.gradient == null
              ? (isDark ? const Color(0xFF1E293B) : Colors.white)
              : null,
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          border: Border.all(
            color: isDark
                ? Colors.white.withValues(alpha: 0.05)
                : Colors.black.withValues(alpha: 0.04),
            width: 1,
          ),
          boxShadow: isDark
              ? null
              : _isPressed
                  ? AppTheme.softShadow
                  : AppTheme.mediumShadow,
        ),
        child: Material(
          color: Colors.transparent,
          child: widget.onTap != null && !widget.enableTapFeedback
              ? InkWell(
                  onTap: widget.onTap,
                  onLongPress: widget.onLongPress,
                  borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                  child: Padding(
                    padding: widget.padding ?? const EdgeInsets.all(16),
                    child: widget.child,
                  ),
                )
              : Padding(
                  padding: widget.padding ?? const EdgeInsets.all(16),
                  child: widget.child,
                ),
        ),
      ),
    );

    return card
        .animate(delay: Duration(milliseconds: widget.delayMs))
        .fadeIn(duration: 350.ms, curve: Curves.easeOut)
        .slideY(begin: 0.08, end: 0, duration: 350.ms, curve: Curves.easeOut);
  }
}

/// 漸層圖示容器
class GradientIconBox extends StatelessWidget {
  final IconData icon;
  final LinearGradient gradient;
  final double size;
  final double iconSize;

  const GradientIconBox({
    super.key,
    required this.icon,
    required this.gradient,
    this.size = 48,
    this.iconSize = 24,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(size * 0.28),
        boxShadow: [
          BoxShadow(
            color: gradient.colors.first.withValues(alpha: 0.35),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Icon(
        icon,
        color: Colors.white,
        size: iconSize,
      ),
    );
  }
}

// ============================================================================
// 統計與數據展示 - 參考 Splitwise 設計
// ============================================================================

/// 統計數值卡片（帶動畫）
class StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final LinearGradient gradient;
  final int delayMs;
  final VoidCallback? onTap;

  const StatCard({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    required this.gradient,
    this.delayMs = 0,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : Colors.white,
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          border: Border.all(
            color: isDark
                ? Colors.white.withValues(alpha: 0.05)
                : Colors.black.withValues(alpha: 0.04),
            width: 1,
          ),
          boxShadow: isDark ? null : AppTheme.softShadow,
        ),
        child: Column(
          children: [
            GradientIconBox(
              icon: icon,
              gradient: gradient,
              size: 44,
              iconSize: 22,
            ),
            const SizedBox(height: 12),
            Text(
              value,
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                color: Colors.grey[500],
              ),
            ),
          ],
        ),
      ),
    )
        .animate(delay: Duration(milliseconds: delayMs))
        .fadeIn(duration: 350.ms)
        .slideY(begin: 0.15, end: 0, duration: 350.ms, curve: Curves.easeOut);
  }
}

/// 金額顯示（帶顏色和動畫）- 參考 Splitwise 紅綠色系
class AmountText extends StatelessWidget {
  final double amount;
  final bool showSign;
  final double fontSize;
  final FontWeight fontWeight;
  final bool animate;
  final Currency currency;

  const AmountText({
    super.key,
    required this.amount,
    this.showSign = true,
    this.fontSize = 16,
    this.fontWeight = FontWeight.bold,
    this.animate = true,
    this.currency = Currency.TWD,
  });

  @override
  Widget build(BuildContext context) {
    final isPositive = amount >= 0;
    final color = isPositive ? const Color(0xFF10B981) : const Color(0xFFEF4444);
    final symbol = CurrencyUtils.getSymbol(currency);

    if (!animate) {
      final sign = showSign ? (isPositive ? '+' : '-') : '';
      return Text(
        '$sign$symbol ${CurrencyUtils.formatAmountNumber(amount.abs(), currency)}',
        style: TextStyle(
          color: color,
          fontSize: fontSize,
          fontWeight: fontWeight,
          letterSpacing: -0.5,
        ),
      );
    }

    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: amount.abs()),
      duration: const Duration(milliseconds: 600),
      curve: Curves.easeOut,
      builder: (context, value, child) {
        final sign = showSign ? (isPositive ? '+' : '-') : '';
        return Text(
          '$sign$symbol ${CurrencyUtils.formatAmountNumber(value, currency)}',
          style: TextStyle(
            color: color,
            fontSize: fontSize,
            fontWeight: fontWeight,
            letterSpacing: -0.5,
          ),
        );
      },
    );
  }
}

/// 大金額顯示（用於詳情頁）
class LargeAmountDisplay extends StatelessWidget {
  final double amount;
  final String? label;
  final Color? color;
  final Currency currency;

  const LargeAmountDisplay({
    super.key,
    required this.amount,
    this.label,
    this.color,
    this.currency = Currency.TWD,
  });

  @override
  Widget build(BuildContext context) {
    final displayColor = color ?? AppTheme.primaryColor;
    final symbol = CurrencyUtils.getSymbol(currency);

    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                symbol,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                  color: displayColor,
                ),
              ),
            ),
            const SizedBox(width: 4),
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: amount),
              duration: const Duration(milliseconds: 800),
              curve: Curves.easeOut,
              builder: (context, value, child) {
                return Text(
                  CurrencyUtils.formatAmountNumber(value, currency),
                  style: TextStyle(
                    fontSize: 44,
                    fontWeight: FontWeight.bold,
                    color: displayColor,
                    letterSpacing: -2,
                    height: 1,
                  ),
                );
              },
            ),
          ],
        ),
        if (label != null) ...[
          const SizedBox(height: 8),
          Text(
            label!,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[500],
            ),
          ),
        ],
      ],
    );
  }
}

// ============================================================================
// 狀態元件 - 參考 Monzo 設計
// ============================================================================

/// 空狀態元件（帶動畫）
class EmptyStateWidget extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? action;

  const EmptyStateWidget({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.action,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                size: 48,
                color: AppTheme.primaryColor.withValues(alpha: 0.6),
              ),
            )
                .animate()
                .fadeIn(duration: 400.ms)
                .scale(begin: const Offset(0.8, 0.8), duration: 400.ms, curve: Curves.easeOut),
            const SizedBox(height: 24),
            Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                letterSpacing: -0.3,
              ),
              textAlign: TextAlign.center,
            )
                .animate(delay: 150.ms)
                .fadeIn(duration: 300.ms)
                .slideY(begin: 0.15, end: 0),
            if (subtitle != null) ...[
              const SizedBox(height: 8),
              Text(
                subtitle!,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[500],
                ),
                textAlign: TextAlign.center,
              )
                  .animate(delay: 250.ms)
                  .fadeIn(duration: 300.ms)
                  .slideY(begin: 0.15, end: 0),
            ],
            if (action != null) ...[
              const SizedBox(height: 24),
              action!
                  .animate(delay: 350.ms)
                  .fadeIn(duration: 300.ms)
                  .slideY(begin: 0.15, end: 0),
            ],
          ],
        ),
      ),
    );
  }
}

/// 線性進度指示器（帶漸層）
class GradientProgressBar extends StatelessWidget {
  final double progress;
  final LinearGradient? gradient;
  final double height;
  final bool animate;

  const GradientProgressBar({
    super.key,
    required this.progress,
    this.gradient,
    this.height = 8,
    this.animate = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final progressGradient = gradient ?? AppTheme.primaryGradient;

    return Container(
      height: height,
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF334155) : Colors.grey[200],
        borderRadius: BorderRadius.circular(height / 2),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          return Stack(
            children: [
              AnimatedContainer(
                duration: animate ? const Duration(milliseconds: 500) : Duration.zero,
                curve: Curves.easeOut,
                width: constraints.maxWidth * progress.clamp(0, 1),
                height: height,
                decoration: BoxDecoration(
                  gradient: progressGradient,
                  borderRadius: BorderRadius.circular(height / 2),
                  boxShadow: [
                    BoxShadow(
                      color: progressGradient.colors.first.withValues(alpha: 0.4),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

// ============================================================================
// 其他元件
// ============================================================================

/// Shimmer 載入效果
class ShimmerLoading extends StatelessWidget {
  final double width;
  final double height;
  final double borderRadius;

  const ShimmerLoading({
    super.key,
    required this.width,
    required this.height,
    this.borderRadius = 8,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: isDark ? Colors.grey[800] : Colors.grey[200],
        borderRadius: BorderRadius.circular(borderRadius),
      ),
    )
        .animate(onPlay: (controller) => controller.repeat())
        .shimmer(
          duration: 1200.ms,
          color: isDark
              ? Colors.grey[700]!.withValues(alpha: 0.5)
              : Colors.grey[100]!.withValues(alpha: 0.8),
        );
  }
}

/// 分類標籤
class CategoryChip extends StatefulWidget {
  final String category;
  final String label;
  final bool selected;
  final VoidCallback? onTap;

  const CategoryChip({
    super.key,
    required this.category,
    required this.label,
    this.selected = false,
    this.onTap,
  });

  @override
  State<CategoryChip> createState() => _CategoryChipState();
}

class _CategoryChipState extends State<CategoryChip> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.categoryColors[widget.category] ?? Colors.grey;
    final gradient = AppTheme.categoryGradients[widget.category];

    return GestureDetector(
      onTapDown: (_) => setState(() => _isPressed = true),
      onTapUp: (_) {
        setState(() => _isPressed = false);
        widget.onTap?.call();
      },
      onTapCancel: () => setState(() => _isPressed = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        transform: _isPressed ? (Matrix4.identity()..scale(0.95, 0.95, 1.0)) : Matrix4.identity(),
        transformAlignment: Alignment.center,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          gradient: widget.selected ? gradient : null,
          color: widget.selected ? null : color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(AppTheme.radiusFull),
          border: widget.selected ? null : Border.all(color: color.withValues(alpha: 0.3)),
          boxShadow: widget.selected ? [
            BoxShadow(
              color: color.withValues(alpha: 0.3),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ] : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                color: widget.selected ? Colors.white : color,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 8),
            Text(
              widget.label,
              style: TextStyle(
                color: widget.selected ? Colors.white : color,
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// 成員頭像（獨立色系）
class MemberAvatar extends StatelessWidget {
  final String name;
  final double size;
  final int? colorIndex;
  final String? imageUrl;

  const MemberAvatar({
    super.key,
    required this.name,
    this.size = 40,
    this.colorIndex,
    this.imageUrl,
  });

  // 為成員名稱生成一致的顏色
  static final List<LinearGradient> _avatarGradients = [
    const LinearGradient(colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)]),
    const LinearGradient(colors: [Color(0xFF06B6D4), Color(0xFF10B981)]),
    const LinearGradient(colors: [Color(0xFFF59E0B), Color(0xFFEF4444)]),
    const LinearGradient(colors: [Color(0xFFEC4899), Color(0xFF8B5CF6)]),
    const LinearGradient(colors: [Color(0xFF10B981), Color(0xFF06B6D4)]),
    const LinearGradient(colors: [Color(0xFFEF4444), Color(0xFFF59E0B)]),
  ];

  @override
  Widget build(BuildContext context) {
    final index = colorIndex ?? name.hashCode.abs() % _avatarGradients.length;
    final gradient = _avatarGradients[index];
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(size * 0.28),
        boxShadow: [
          BoxShadow(
            color: gradient.colors.first.withValues(alpha: 0.3),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Center(
        child: Text(
          initial,
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: size * 0.4,
          ),
        ),
      ),
    );
  }
}

/// 操作提示標籤
class ActionHint extends StatelessWidget {
  final String text;
  final IconData? icon;

  const ActionHint({
    super.key,
    required this.text,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.primaryColor.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: AppTheme.primaryColor),
            const SizedBox(width: 6),
          ],
          Text(
            text,
            style: TextStyle(
              fontSize: 12,
              color: AppTheme.primaryColor,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
