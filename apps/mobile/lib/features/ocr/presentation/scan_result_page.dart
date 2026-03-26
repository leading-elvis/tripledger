import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/utils/currency_utils.dart';
import '../domain/image_quality_service.dart';
import '../domain/ocr_result_model.dart';
import '../providers/ocr_provider.dart';
import 'widgets/brand_suggestion_chip.dart';

/// 掃描結果頁面
///
/// 顯示 OCR 辨識結果，讓用戶確認或修改後建立帳單
class ScanResultPage extends ConsumerStatefulWidget {
  final String tripId;

  const ScanResultPage({
    super.key,
    required this.tripId,
  });

  @override
  ConsumerState<ScanResultPage> createState() => _ScanResultPageState();
}

class _ScanResultPageState extends ConsumerState<ScanResultPage> {
  late TextEditingController _titleController;
  late TextEditingController _amountController;
  DateTime _selectedDate = DateTime.now();
  String _selectedCategory = 'FOOD';
  bool _useItemizedSplit = false;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController();
    _amountController = TextEditingController();

    // 從 OCR 結果初始化
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _initFromOcrResult();
    });
  }

  @override
  void dispose() {
    _titleController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  void _initFromOcrResult() {
    final state = ref.read(ocrScanProvider);
    final result = state.serverResult;

    if (result != null) {
      setState(() {
        _titleController.text = result.brandName ?? result.companyName ?? '';
        if (result.amount != null) {
          _amountController.text = result.amount.toString();
        }
        if (result.date != null) {
          _selectedDate = result.date!;
        }
        if (result.suggestedCategory != null) {
          _selectedCategory = result.suggestedCategory!;
        }
        // 有品項明細時預設啟用細項分攤
        if (result.lineItems != null && result.lineItems!.items.isNotEmpty) {
          _useItemizedSplit = true;
        }
      });
    }
  }

  /// 建立帳單
  void _createBill() {
    final title = _titleController.text.trim();
    final amountText = _amountController.text.trim();

    if (title.isEmpty) {
      _showError('請輸入帳單名稱');
      return;
    }

    final amount = int.tryParse(amountText);
    if (amount == null || amount <= 0) {
      _showError('請輸入有效金額');
      return;
    }

    final extra = <String, dynamic>{
      'title': title,
      'amount': amount,
      'date': _selectedDate.toIso8601String(),
      'category': _selectedCategory,
    };

    // 啟用細項分攤時，傳遞品項明細
    final state = ref.read(ocrScanProvider);
    final lineItems = state.serverResult?.lineItems;
    if (_useItemizedSplit && lineItems != null && lineItems.items.isNotEmpty) {
      extra['splitType'] = 'ITEMIZED';
      extra['lineItems'] = lineItems.items
          .map((item) => {
                'name': item.name,
                'amount': item.subtotal.toDouble(),
              })
          .toList();
    }

    // 導航到新增帳單頁面，帶入預填資料
    context.push(
      '/trips/${widget.tripId}/add-bill',
      extra: extra,
    );
  }

  /// 修改品牌名稱
  Future<void> _editBrandName() async {
    final result = await showDialog<String>(
      context: context,
      builder: (context) => _EditBrandDialog(
        currentName: _titleController.text,
      ),
    );

    if (result != null && result.isNotEmpty) {
      setState(() {
        _titleController.text = result;
      });

      // 學習用戶的品牌修正
      final state = ref.read(ocrScanProvider);
      final companyName = state.serverResult?.companyName;
      if (companyName != null && companyName.isNotEmpty) {
        ref.read(ocrScanProvider.notifier).learnBrandMapping(
              companyName,
              result,
            );
      }
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  /// 關閉鍵盤
  void _dismissKeyboard() {
    FocusScope.of(context).unfocus();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(ocrScanProvider);
    final result = state.serverResult;
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: _dismissKeyboard,
      child: Scaffold(
        appBar: AppBar(
        title: const Text('辨識結果'),
        actions: [
          TextButton(
            onPressed: _createBill,
            child: const Text('建立帳單'),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 語言標籤 + 降級提示
            if (result != null) ...[
              if (result.detectedLanguage != null)
                _buildLanguageBadge(result.detectedLanguage!, theme),
              if (state.status == OcrScanStatus.error)
                _buildDegradeBanner(theme),
            ],

            // 信心度指示器
            if (result != null) _buildConfidenceCard(result, state.qualityResult, theme),

            const SizedBox(height: 24),

            // 品牌名稱
            _buildSectionTitle('商家 / 品牌'),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: BrandSuggestionChip(
                    brandName: _titleController.text.isEmpty
                        ? '未辨識到商家'
                        : _titleController.text,
                    source: result?.brandSource,
                    onTap: _editBrandName,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // 金額
            _buildSectionTitle('金額'),
            const SizedBox(height: 8),
            TextField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                prefixText: '${CurrencyUtils.getSymbol(Currency.TWD)} ',
                hintText: '請輸入金額',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                filled: true,
              ),
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 24),

            // 日期
            _buildSectionTitle('日期'),
            const SizedBox(height: 8),
            _buildDateSelector(theme),

            const SizedBox(height: 24),

            // 分類
            _buildSectionTitle('分類'),
            const SizedBox(height: 8),
            _buildCategorySelector(),

            const SizedBox(height: 24),

            // 品項明細
            if (result?.lineItems != null &&
                result!.lineItems!.items.isNotEmpty)
              _buildLineItemsSection(result.lineItems!, theme),

            // 原始文字（可摺疊）
            if (result?.rawText.isNotEmpty == true)
              _buildRawTextSection(result!.rawText, theme),

            const SizedBox(height: 32),

            // 建立帳單按鈕
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _createBill,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text(
                  '確認並建立帳單',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
            ),

            const SizedBox(height: 16),
          ],
        ),
      ),
    ),
    );
  }

  /// 語言偵測標籤
  Widget _buildLanguageBadge(String language, ThemeData theme) {
    final langNames = {
      'ja': '日文', 'ko': '韓文', 'th': '泰文', 'vi': '越南文',
      'en': '英文', 'zh': '中文', 'zh-TW': '繁體中文', 'zh-Hant': '繁體中文',
    };
    final name = langNames[language] ?? language;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Text(
              '偵測語言：$name',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: theme.colorScheme.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// 降級提示 banner
  Widget _buildDegradeBanner(ThemeData theme) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.amber.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.amber.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Icon(Icons.cloud_off, size: 18, color: Colors.amber[700]),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              '離線模式，結果可能不完整',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: Colors.amber[800],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildConfidenceCard(
    OcrResult result,
    ImageQualityResult? qualityResult,
    ThemeData theme,
  ) {
    final confidence = result.confidence;
    final color = confidence > 0.7
        ? Colors.green
        : confidence > 0.4
            ? Colors.orange
            : Colors.red;

    // 取得品質提示
    final qualityHint = qualityResult?.hint;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withAlpha((0.1 * 255).toInt()),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withAlpha((0.3 * 255).toInt())),
      ),
      child: Row(
        children: [
          Icon(
            confidence > 0.7
                ? Icons.check_circle
                : confidence > 0.4
                    ? Icons.info
                    : Icons.warning,
            color: color,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  confidence > 0.7
                      ? '辨識成功'
                      : confidence > 0.4
                          ? '部分辨識'
                          : '辨識困難',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: color,
                  ),
                ),
                Text(
                  '信心度: ${(confidence * 100).toStringAsFixed(0)}%',
                  style: TextStyle(
                    fontSize: 12,
                    color: theme.textTheme.bodySmall?.color,
                  ),
                ),
                // 顯示品質提示
                if (qualityHint != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    qualityHint,
                    style: TextStyle(
                      fontSize: 11,
                      color: color,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: Colors.grey,
      ),
    );
  }

  Widget _buildDateSelector(ThemeData theme) {
    return GestureDetector(
      onTap: () async {
        final date = await showDatePicker(
          context: context,
          initialDate: _selectedDate,
          firstDate: DateTime(2020),
          lastDate: DateTime.now(),
        );
        if (date != null) {
          setState(() {
            _selectedDate = date;
          });
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          border: Border.all(color: theme.dividerColor),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(Icons.calendar_today, color: theme.hintColor),
            const SizedBox(width: 12),
            Text(
              DateFormat('yyyy/MM/dd').format(_selectedDate),
              style: const TextStyle(fontSize: 16),
            ),
            const Spacer(),
            Icon(Icons.arrow_drop_down, color: theme.hintColor),
          ],
        ),
      ),
    );
  }

  Widget _buildCategorySelector() {
    final categories = [
      'FOOD',
      'TRANSPORT',
      'ACCOMMODATION',
      'ATTRACTION',
      'SHOPPING',
      'OTHER',
    ];

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: categories.map((category) {
        return CategoryChip(
          category: category,
          isSelected: _selectedCategory == category,
          onTap: () {
            setState(() {
              _selectedCategory = category;
            });
          },
        );
      }).toList(),
    );
  }

  Widget _buildLineItemsSection(
    LineItemParseResult lineItems,
    ThemeData theme,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 標題 + 細項分攤開關
        Row(
          children: [
            Expanded(child: _buildSectionTitle('品項明細')),
            Text(
              '細項分攤',
              style: TextStyle(
                fontSize: 13,
                color: theme.textTheme.bodySmall?.color,
              ),
            ),
            const SizedBox(width: 4),
            Switch(
              value: _useItemizedSplit,
              onChanged: (value) {
                setState(() {
                  _useItemizedSplit = value;
                });
              },
            ),
          ],
        ),
        const SizedBox(height: 8),

        // 品項列表
        Container(
          decoration: BoxDecoration(
            border: Border.all(color: theme.dividerColor),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              for (int i = 0; i < lineItems.items.length; i++) ...[
                if (i > 0) Divider(height: 1, color: theme.dividerColor),
                _buildLineItemRow(lineItems.items[i], theme),
              ],
              // 合計
              Divider(height: 1, color: theme.dividerColor),
              Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                child: Row(
                  children: [
                    Text(
                      '品項合計',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: theme.textTheme.bodyMedium?.color,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      '\$${lineItems.itemsTotal}',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: theme.textTheme.bodyMedium?.color,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildLineItemRow(ReceiptLineItem item, ThemeData theme) {
    final isDiscount = item.isDiscount;
    final textColor = isDiscount ? Colors.red : theme.textTheme.bodyMedium?.color;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          // 品名
          Expanded(
            child: Text(
              item.name,
              style: TextStyle(fontSize: 14, color: textColor),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 8),
          // 數量 × 單價（非折扣項目）
          if (!isDiscount && item.unitPrice != null && item.quantity > 1)
            Text(
              '${item.quantity}×\$${item.unitPrice}',
              style: TextStyle(
                fontSize: 12,
                color: theme.textTheme.bodySmall?.color,
              ),
            ),
          const SizedBox(width: 12),
          // 小計
          Text(
            isDiscount ? '-\$${item.subtotal.abs()}' : '\$${item.subtotal}',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: textColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRawTextSection(String rawText, ThemeData theme) {
    return ExpansionTile(
      title: const Text('原始辨識文字'),
      tilePadding: EdgeInsets.zero,
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            rawText,
            style: TextStyle(
              fontSize: 12,
              fontFamily: 'monospace',
              color: theme.textTheme.bodySmall?.color,
            ),
          ),
        ),
      ],
    );
  }
}

/// 編輯品牌名稱對話框
class _EditBrandDialog extends StatefulWidget {
  final String currentName;

  const _EditBrandDialog({required this.currentName});

  @override
  State<_EditBrandDialog> createState() => _EditBrandDialogState();
}

class _EditBrandDialogState extends State<_EditBrandDialog> {
  late TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.currentName);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('修改商家名稱'),
      content: TextField(
        controller: _controller,
        autofocus: true,
        decoration: const InputDecoration(
          hintText: '輸入商家或品牌名稱',
          border: OutlineInputBorder(),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('取消'),
        ),
        ElevatedButton(
          onPressed: () => Navigator.of(context).pop(_controller.text),
          child: const Text('確認'),
        ),
      ],
    );
  }
}
