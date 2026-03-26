import 'package:flutter/material.dart';

import '../../domain/ocr_result_model.dart';

/// 品牌建議標籤
///
/// 顯示辨識出的品牌名稱和來源標識
class BrandSuggestionChip extends StatelessWidget {
  final String brandName;
  final BrandSource? source;
  final VoidCallback? onTap;
  final bool isEditable;

  const BrandSuggestionChip({
    super.key,
    required this.brandName,
    this.source,
    this.onTap,
    this.isEditable = true,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (color, icon, label) = _getSourceInfo();

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: color.withAlpha((0.1 * 255).toInt()),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withAlpha((0.3 * 255).toInt())),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 16, color: color),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                brandName,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: theme.textTheme.bodyLarge?.color,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (label != null) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: color.withAlpha((0.2 * 255).toInt()),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 10,
                    color: color,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
            if (isEditable) ...[
              const SizedBox(width: 4),
              Icon(
                Icons.edit_outlined,
                size: 14,
                color: theme.hintColor,
              ),
            ],
          ],
        ),
      ),
    );
  }

  (Color, IconData, String?) _getSourceInfo() {
    switch (source) {
      case BrandSource.userHistory:
        return (Colors.green, Icons.history, '常用');
      case BrandSource.mappingTable:
        return (Colors.blue, Icons.verified, null);
      case BrandSource.aiSuggest:
        return (Colors.orange, Icons.auto_awesome, 'AI');
      case BrandSource.notFound:
      case null:
        return (Colors.grey, Icons.help_outline, '未知');
    }
  }
}

/// 分類選擇標籤
class CategoryChip extends StatelessWidget {
  final String category;
  final bool isSelected;
  final VoidCallback? onTap;

  const CategoryChip({
    super.key,
    required this.category,
    this.isSelected = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (icon, label) = _getCategoryInfo(category);

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? theme.colorScheme.primary.withAlpha((0.15 * 255).toInt())
              : theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected
                ? theme.colorScheme.primary
                : theme.dividerColor,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 16,
              color: isSelected
                  ? theme.colorScheme.primary
                  : theme.iconTheme.color,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                color: isSelected
                    ? theme.colorScheme.primary
                    : theme.textTheme.bodyMedium?.color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  (IconData, String) _getCategoryInfo(String category) {
    switch (category.toUpperCase()) {
      case 'FOOD':
        return (Icons.restaurant, '餐飲');
      case 'TRANSPORT':
        return (Icons.directions_car, '交通');
      case 'ACCOMMODATION':
        return (Icons.hotel, '住宿');
      case 'ATTRACTION':
        return (Icons.attractions, '景點');
      case 'SHOPPING':
        return (Icons.shopping_bag, '購物');
      case 'OTHER':
      default:
        return (Icons.more_horiz, '其他');
    }
  }
}
