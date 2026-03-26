import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/config/theme.dart';
import '../../core/config/animations.dart';
import '../../core/utils/currency_utils.dart';

/// 貨幣選擇器
///
/// 用於選擇帳單或旅程的貨幣
class CurrencyPicker extends StatelessWidget {
  final Currency selectedCurrency;
  final ValueChanged<Currency> onCurrencyChanged;
  final String? label;
  final bool enabled;

  const CurrencyPicker({
    super.key,
    required this.selectedCurrency,
    required this.onCurrencyChanged,
    this.label,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final info = CurrencyUtils.getInfo(selectedCurrency);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          Text(
            label!,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: isDark ? Colors.grey[400] : Colors.grey[700],
            ),
          ),
          const SizedBox(height: 8),
        ],
        InkWell(
          onTap: enabled
              ? () => _showCurrencyPickerSheet(context)
              : null,
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.05)
                  : Colors.grey[100],
              borderRadius: BorderRadius.circular(AppTheme.radiusMd),
              border: Border.all(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.1)
                    : Colors.grey[300]!,
              ),
            ),
            child: Row(
              children: [
                Text(
                  info.flag,
                  style: const TextStyle(fontSize: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        selectedCurrency.name,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        info.name,
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
                if (enabled)
                  Icon(
                    Icons.keyboard_arrow_down_rounded,
                    color: isDark ? Colors.grey[400] : Colors.grey[600],
                  ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _showCurrencyPickerSheet(BuildContext context) {
    HapticFeedback.lightImpact();

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => _CurrencyPickerSheet(
        selectedCurrency: selectedCurrency,
        onCurrencySelected: (currency) {
          onCurrencyChanged(currency);
          Navigator.pop(context);
        },
      ),
    );
  }
}

/// 貨幣選擇器 Bottom Sheet
class _CurrencyPickerSheet extends StatefulWidget {
  final Currency selectedCurrency;
  final ValueChanged<Currency> onCurrencySelected;

  const _CurrencyPickerSheet({
    required this.selectedCurrency,
    required this.onCurrencySelected,
  });

  @override
  State<_CurrencyPickerSheet> createState() => _CurrencyPickerSheetState();
}

class _CurrencyPickerSheetState extends State<_CurrencyPickerSheet> {
  final TextEditingController _searchController = TextEditingController();
  List<CurrencyInfo> _filteredCurrencies = [];

  @override
  void initState() {
    super.initState();
    _filteredCurrencies = CurrencyUtils.getAllCurrencies();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _filterCurrencies(String query) {
    setState(() {
      if (query.isEmpty) {
        _filteredCurrencies = CurrencyUtils.getAllCurrencies();
      } else {
        final lowerQuery = query.toLowerCase();
        _filteredCurrencies = CurrencyUtils.getAllCurrencies().where((info) {
          return info.code.name.toLowerCase().contains(lowerQuery) ||
              info.name.toLowerCase().contains(lowerQuery);
        }).toList();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      height: MediaQuery.of(context).size.height * 0.7,
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(AppTheme.radiusLg),
        ),
      ),
      child: Column(
        children: [
          // 拖曳指示器
          Padding(
            padding: const EdgeInsets.only(top: 12),
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

          // 標題
          Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    gradient: AppTheme.primaryGradient,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.currency_exchange_rounded,
                    color: Colors.white,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text(
                    '選擇貨幣',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -0.5,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // 搜尋欄
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: TextField(
              controller: _searchController,
              onChanged: _filterCurrencies,
              decoration: InputDecoration(
                hintText: '搜尋貨幣...',
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded),
                        onPressed: () {
                          _searchController.clear();
                          _filterCurrencies('');
                        },
                      )
                    : null,
                filled: true,
                fillColor: isDark
                    ? Colors.white.withValues(alpha: 0.05)
                    : Colors.grey[100],
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppTheme.radiusMd),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // 貨幣列表
          Expanded(
            child: _filteredCurrencies.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.search_off_rounded,
                          size: 48,
                          color: Colors.grey[400],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          '找不到符合的貨幣',
                          style: TextStyle(
                            color: Colors.grey[500],
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    itemCount: _filteredCurrencies.length,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    itemBuilder: (context, index) {
                      final info = _filteredCurrencies[index];
                      final isSelected = info.code == widget.selectedCurrency;

                      return _CurrencyTile(
                        info: info,
                        isSelected: isSelected,
                        onTap: () {
                          HapticFeedback.selectionClick();
                          widget.onCurrencySelected(info.code);
                        },
                      );
                    },
                  ),
          ),
        ],
      ),
    ).animateSlideUp();
  }
}

/// 貨幣列表項目
class _CurrencyTile extends StatelessWidget {
  final CurrencyInfo info;
  final bool isSelected;
  final VoidCallback onTap;

  const _CurrencyTile({
    required this.info,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: Material(
        color: isSelected
            ? (isDark
                ? AppTheme.primaryColor.withValues(alpha: 0.2)
                : AppTheme.primaryColor.withValues(alpha: 0.1))
            : Colors.transparent,
        borderRadius: BorderRadius.circular(AppTheme.radiusMd),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppTheme.radiusMd),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                Text(
                  info.flag,
                  style: const TextStyle(fontSize: 28),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            info.code.name,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: isSelected
                                  ? FontWeight.bold
                                  : FontWeight.w600,
                              color: isSelected
                                  ? AppTheme.primaryColor
                                  : null,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            info.symbol,
                            style: TextStyle(
                              fontSize: 14,
                              color: isDark
                                  ? Colors.grey[400]
                                  : Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                      Text(
                        info.name,
                        style: TextStyle(
                          fontSize: 13,
                          color: isDark ? Colors.grey[400] : Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
                if (isSelected)
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      gradient: AppTheme.primaryGradient,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.check_rounded,
                      color: Colors.white,
                      size: 16,
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

/// 顯示貨幣選擇器的便捷方法
Future<Currency?> showCurrencyPicker({
  required BuildContext context,
  required Currency initialCurrency,
}) {
  HapticFeedback.lightImpact();

  return showModalBottomSheet<Currency>(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    builder: (context) => _CurrencyPickerSheet(
      selectedCurrency: initialCurrency,
      onCurrencySelected: (currency) {
        Navigator.pop(context, currency);
      },
    ),
  );
}
