import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/config/theme.dart';
import '../../core/config/animations.dart';
import '../../core/utils/currency_utils.dart';
import 'animated_widgets.dart';

// 引入 animations.dart 以使用 AppAnimations 擴展方法

// ============================================================================
// 統一 Bottom Sheet 元件
// ============================================================================

/// 統一的 Bottom Sheet 基礎元件
///
/// 使用方式：
/// ```dart
/// showModalBottomSheet(
///   context: context,
///   backgroundColor: Colors.transparent,
///   isScrollControlled: true,
///   builder: (context) => AppBottomSheet(
///     title: '標題',
///     icon: Icons.add_rounded,
///     children: [...],
///   ),
/// );
/// ```
class AppBottomSheet extends StatelessWidget {
  final String title;
  final IconData? icon;
  final LinearGradient? gradient;
  final List<Widget> children;
  final EdgeInsets? padding;
  final bool showDragHandle;
  final bool animate;

  const AppBottomSheet({
    super.key,
    required this.title,
    required this.children,
    this.icon,
    this.gradient,
    this.padding,
    this.showDragHandle = true,
    this.animate = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    Widget content = Container(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(AppTheme.radiusLg),
        ),
        boxShadow: isDark ? null : [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Padding(
        padding: padding ?? const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 拖曳指示器
            if (showDragHandle)
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.2)
                        : Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
            if (showDragHandle) const SizedBox(height: 24),

            // 標題區域
            Row(
              children: [
                if (icon != null) ...[
                  GradientIconBox(
                    icon: icon!,
                    gradient: gradient ?? AppTheme.primaryGradient,
                    size: 40,
                    iconSize: 20,
                  ),
                  const SizedBox(width: 12),
                ],
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -0.5,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // 子內容
            ...children,
            const SizedBox(height: 8),
          ],
        ),
      ),
    );

    if (animate) {
      return content.animateSlideUp();
    }

    return content;
  }
}

/// 顯示統一樣式的 Bottom Sheet 的便捷方法
Future<T?> showAppBottomSheet<T>({
  required BuildContext context,
  required String title,
  required List<Widget> children,
  IconData? icon,
  LinearGradient? gradient,
  bool isDismissible = true,
  bool enableDrag = true,
}) {
  HapticFeedback.lightImpact();

  return showModalBottomSheet<T>(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    isDismissible: isDismissible,
    enableDrag: enableDrag,
    builder: (context) => AppBottomSheet(
      title: title,
      icon: icon,
      gradient: gradient,
      children: children,
    ),
  );
}

// ============================================================================
// 統一 Alert Dialog 元件
// ============================================================================

/// 統一的 Alert Dialog 元件
class AppAlertDialog extends StatelessWidget {
  final String title;
  final String? content;
  final IconData? icon;
  final LinearGradient? gradient;
  final List<Widget> actions;
  final bool animate;

  const AppAlertDialog({
    super.key,
    required this.title,
    this.content,
    this.icon,
    this.gradient,
    required this.actions,
    this.animate = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    Widget dialog = Dialog(
      backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 圖示
            if (icon != null) ...[
              GradientIconBox(
                icon: icon!,
                gradient: gradient ?? AppTheme.primaryGradient,
                size: 56,
                iconSize: 28,
              ),
              const SizedBox(height: 20),
            ],

            // 標題
            Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                letterSpacing: -0.3,
              ),
              textAlign: TextAlign.center,
            ),

            // 內容
            if (content != null) ...[
              const SizedBox(height: 12),
              Text(
                content!,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey[600],
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
            ],

            const SizedBox(height: 24),

            // 操作按鈕
            ...actions,
          ],
        ),
      ),
    );

    if (animate) {
      return dialog.animateScale();
    }

    return dialog;
  }
}

/// 顯示確認對話框的便捷方法
Future<bool?> showAppConfirmDialog({
  required BuildContext context,
  required String title,
  String? content,
  IconData? icon,
  LinearGradient? gradient,
  String confirmText = '確認',
  String cancelText = '取消',
  bool isDanger = false,
}) {
  HapticFeedback.lightImpact();

  return showDialog<bool>(
    context: context,
    builder: (context) => AppAlertDialog(
      title: title,
      content: content,
      icon: icon,
      gradient: isDanger ? AppTheme.dangerGradient : gradient,
      actions: [
        Row(
          children: [
            Expanded(
              child: SecondaryButton(
                label: cancelText,
                onPressed: () => Navigator.of(context).pop(false),
                size: ButtonSize.medium,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: isDanger
                  ? DangerButton(
                      label: confirmText,
                      onPressed: () => Navigator.of(context).pop(true),
                      size: ButtonSize.medium,
                    )
                  : GradientButton(
                      label: confirmText,
                      gradient: gradient ?? AppTheme.primaryGradient,
                      onPressed: () => Navigator.of(context).pop(true),
                      size: ButtonSize.medium,
                    ),
            ),
          ],
        ),
      ],
    ),
  );
}

/// 顯示訊息對話框的便捷方法
Future<void> showAppMessageDialog({
  required BuildContext context,
  required String title,
  String? content,
  IconData? icon,
  LinearGradient? gradient,
  String buttonText = '確定',
}) {
  return showDialog(
    context: context,
    builder: (context) => AppAlertDialog(
      title: title,
      content: content,
      icon: icon,
      gradient: gradient,
      actions: [
        GradientButton(
          label: buttonText,
          gradient: gradient ?? AppTheme.primaryGradient,
          onPressed: () => Navigator.of(context).pop(),
        ),
      ],
    ),
  );
}

// ============================================================================
// 統一表單輸入元件
// ============================================================================

/// 統一的表單輸入欄位
class AppTextField extends StatelessWidget {
  final TextEditingController? controller;
  final String? label;
  final String? hint;
  final IconData? prefixIcon;
  final Widget? suffix;
  final bool obscureText;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final TextCapitalization textCapitalization;
  final int? maxLines;
  final int? maxLength;
  final bool autofocus;
  final bool readOnly;
  final VoidCallback? onTap;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final String? Function(String?)? validator;
  final FocusNode? focusNode;

  const AppTextField({
    super.key,
    this.controller,
    this.label,
    this.hint,
    this.prefixIcon,
    this.suffix,
    this.obscureText = false,
    this.keyboardType,
    this.textInputAction,
    this.textCapitalization = TextCapitalization.none,
    this.maxLines = 1,
    this.maxLength,
    this.autofocus = false,
    this.readOnly = false,
    this.onTap,
    this.onChanged,
    this.onSubmitted,
    this.validator,
    this.focusNode,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      focusNode: focusNode,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: prefixIcon != null ? Icon(prefixIcon) : null,
        suffix: suffix,
      ),
      obscureText: obscureText,
      keyboardType: keyboardType,
      textInputAction: textInputAction,
      textCapitalization: textCapitalization,
      maxLines: maxLines,
      maxLength: maxLength,
      autofocus: autofocus,
      readOnly: readOnly,
      onTap: onTap,
      onChanged: onChanged,
      onFieldSubmitted: onSubmitted,
      validator: validator,
    );
  }
}

/// 金額輸入欄位
class AppAmountField extends StatelessWidget {
  final TextEditingController? controller;
  final String? label;
  final String? hint;
  final ValueChanged<String>? onChanged;
  final String? Function(String?)? validator;
  final bool autofocus;
  final Currency currency;

  const AppAmountField({
    super.key,
    this.controller,
    this.label,
    this.hint,
    this.onChanged,
    this.validator,
    this.autofocus = false,
    this.currency = Currency.TWD,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label ?? '金額',
        hintText: hint ?? '輸入金額',
        prefixIcon: const Icon(Icons.attach_money_rounded),
        prefixText: '${CurrencyUtils.getSymbol(currency)} ',
      ),
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      textInputAction: TextInputAction.next,
      autofocus: autofocus,
      onChanged: onChanged,
      validator: validator,
    );
  }
}

// ============================================================================
// 選項列表元件
// ============================================================================

/// 統一的選項列表項目（用於 Bottom Sheet 選單）
class OptionTile extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String? subtitle;
  final VoidCallback onTap;

  const OptionTile({
    super.key,
    required this.icon,
    required this.iconColor,
    required this.title,
    this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: iconColor.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: iconColor, size: 22),
      ),
      title: Text(
        title,
        style: const TextStyle(fontWeight: FontWeight.w600),
      ),
      subtitle: subtitle != null
          ? Text(
              subtitle!,
              style: TextStyle(fontSize: 13, color: Colors.grey[500]),
            )
          : null,
      onTap: onTap,
    );
  }
}
