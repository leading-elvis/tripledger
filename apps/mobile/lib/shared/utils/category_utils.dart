import 'package:flutter/material.dart';
import '../../core/config/theme.dart';

// 重新匯出 BillCategory 枚舉，方便使用
export '../models/bill_model.dart' show BillCategory;

/// 帳單分類工具類別
/// 統一管理分類的圖示、標籤和顏色
class CategoryUtils {
  CategoryUtils._();

  /// 取得分類的中文標籤
  static String getLabel(String category) {
    switch (category) {
      case 'FOOD':
        return '餐飲';
      case 'TRANSPORT':
        return '交通';
      case 'ACCOMMODATION':
        return '住宿';
      case 'ATTRACTION':
        return '景點';
      case 'SHOPPING':
        return '購物';
      case 'OTHER':
      default:
        return '其他';
    }
  }

  /// 取得分類的圖示
  static IconData getIcon(String category) {
    switch (category) {
      case 'FOOD':
        return Icons.restaurant_rounded;
      case 'TRANSPORT':
        return Icons.directions_car_rounded;
      case 'ACCOMMODATION':
        return Icons.hotel_rounded;
      case 'ATTRACTION':
        return Icons.attractions_rounded;
      case 'SHOPPING':
        return Icons.shopping_bag_rounded;
      case 'OTHER':
      default:
        return Icons.receipt_rounded;
    }
  }

  /// 取得分類的主色
  static Color getColor(String category) {
    return AppTheme.categoryColors[category] ?? Colors.grey;
  }

  /// 取得分類的漸層色
  static LinearGradient getGradient(String category) {
    return AppTheme.categoryGradients[category] ??
        const LinearGradient(colors: [Colors.grey, Colors.grey]);
  }

  /// 取得所有分類的列表
  static List<String> get allCategories => [
        'FOOD',
        'TRANSPORT',
        'ACCOMMODATION',
        'ATTRACTION',
        'SHOPPING',
        'OTHER',
      ];

  /// 取得分類選項列表（用於下拉選單）
  static List<({String value, String label, IconData icon, Color color})>
      get categoryOptions => allCategories
          .map((c) => (
                value: c,
                label: getLabel(c),
                icon: getIcon(c),
                color: getColor(c),
              ))
          .toList();
}
