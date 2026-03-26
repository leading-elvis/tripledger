import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../data/bills_repository.dart';
import '../../../shared/models/bill_model.dart';
import '../../trips/data/trips_repository.dart';
import '../../../shared/models/trip_model.dart';
import '../../../core/config/theme.dart';
import '../../../core/utils/currency_utils.dart';
import '../../../shared/widgets/animated_widgets.dart';
import '../../../shared/widgets/app_dialogs.dart';
import '../../../shared/widgets/currency_picker.dart';
import '../../../shared/utils/error_handler.dart';
import '../../../shared/utils/validators.dart';
import '../../../shared/utils/category_utils.dart';
import '../../../core/services/ad_frequency_service.dart';
import '../../../core/services/interstitial_ad_service.dart';
import '../../purchase/providers/purchase_providers.dart';

class AddBillPage extends ConsumerStatefulWidget {
  final String tripId;
  final Map<String, dynamic>? prefillData;

  const AddBillPage({super.key, required this.tripId, this.prefillData});

  @override
  ConsumerState<AddBillPage> createState() => _AddBillPageState();
}

class _AddBillPageState extends ConsumerState<AddBillPage> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();

  BillCategory _selectedCategory = BillCategory.food;
  SplitType _selectedSplitType = SplitType.equal;
  List<Participant> _allParticipants = [];
  Set<String> _selectedMemberIds = {}; // 使用 participantKey
  bool _isLoading = true;
  bool _isSaving = false;
  bool _isPremium = false;

  // 付款者選擇（null = 當前用戶）
  String? _selectedPayerKey;

  // 收據圖片
  File? _receiptImage;
  final ImagePicker _imagePicker = ImagePicker();

  // 進階分攤模式的資料（key 為 participantKey）
  Map<String, double> _exactAmounts = {};      // EXACT 模式：每人指定金額
  Map<String, double> _percentages = {};        // PERCENTAGE 模式：每人百分比
  Map<String, int> _shares = {};                // SHARES 模式：每人份數

  // 細項分攤模式的資料 (ITEMIZED)
  List<BillItemInput> _items = [];

  // 貨幣選擇
  Currency _selectedCurrency = Currency.TWD;
  Currency? _tripDefaultCurrency;

  /// 安全地查找參與者，找不到時返回 null
  Participant? _findParticipant(String key) {
    for (final p in _allParticipants) {
      if (p.participantKey == key) return p;
    }
    return null;
  }

  @override
  void initState() {
    super.initState();
    _applyPrefillData();
    _loadMembers();
    // 預載入插頁廣告
    ref.read(interstitialAdServiceProvider).loadAd();
  }

  /// 套用預填資料（來自 OCR 掃描等來源）
  void _applyPrefillData() {
    final data = widget.prefillData;
    if (data == null) return;

    // 預填標題
    if (data['title'] != null) {
      _titleController.text = data['title'] as String;
    }

    // 預填金額
    if (data['amount'] != null) {
      _amountController.text = data['amount'].toString();
    }

    // 預填分類
    if (data['category'] != null) {
      final categoryStr = data['category'] as String;
      try {
        _selectedCategory = BillCategory.values.firstWhere(
          (c) => c.value == categoryStr,
          orElse: () => BillCategory.food,
        );
      } catch (_) {
        _selectedCategory = BillCategory.food;
      }
    }

    // 預填分攤類型
    if (data['splitType'] != null) {
      final splitTypeStr = data['splitType'] as String;
      try {
        _selectedSplitType = SplitType.values.firstWhere(
          (s) => s.value == splitTypeStr,
          orElse: () => SplitType.equal,
        );
      } catch (_) {
        // 忽略
      }
    }

    // 預填品項明細（來自 OCR 掃描）
    if (data['lineItems'] != null) {
      final lineItemsList = data['lineItems'] as List;
      _items = lineItemsList.map((item) {
        final map = item as Map<String, dynamic>;
        return BillItemInput(
          name: map['name'] as String? ?? '',
          amount: (map['amount'] as num?)?.toDouble() ?? 0,
        );
      }).toList();
      _selectedSplitType = SplitType.itemized;
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _amountController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _loadMembers() async {
    try {
      final trip =
          await ref.read(tripsRepositoryProvider).getTripDetail(widget.tripId);
      if (!mounted) return;
      setState(() {
        _isPremium = trip.isPremium;

        // 建立統一參與者列表
        _allParticipants = [
          ...trip.members.map((m) => Participant.fromTripMember(m)),
          ...trip.virtualMembers.map((vm) => Participant.fromVirtualMember(vm)),
        ];

        _selectedMemberIds = _allParticipants.map((p) => p.participantKey).toSet();

        // 初始化進階分攤資料
        final totalCount = _allParticipants.length;
        for (final p in _allParticipants) {
          _exactAmounts[p.participantKey] = 0;
          _percentages[p.participantKey] = totalCount > 0 ? 100.0 / totalCount : 0;
          _shares[p.participantKey] = 1;
        }
        // 為 OCR 預填品項設定預設參與者（全選）
        if (_items.isNotEmpty) {
          final allKeys = _allParticipants.map((p) => p.participantKey).toSet();
          for (final item in _items) {
            if (item.participantIds.isEmpty) {
              item.participantIds = Set.from(allKeys);
            }
          }
        }

        // 載入旅程預設貨幣
        _tripDefaultCurrency = trip.defaultCurrency;
        _selectedCurrency = trip.defaultCurrency;
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ErrorHandler.showErrorSnackBar(context, e, prefix: '載入成員失敗');
      }
    }
  }

  /// 選擇收據圖片
  Future<void> _pickReceiptImage() async {
    showAppBottomSheet(
      context: context,
      title: '選擇收據圖片',
      icon: Icons.receipt_long_rounded,
      gradient: AppTheme.primaryGradient,
      children: [
        OptionTile(
          icon: Icons.camera_alt_rounded,
          iconColor: AppTheme.primaryColor,
          title: '拍照',
          subtitle: '使用相機拍攝收據',
          onTap: () {
            Navigator.pop(context);
            _getImage(ImageSource.camera);
          },
        ),
        const SizedBox(height: 8),
        OptionTile(
          icon: Icons.photo_library_rounded,
          iconColor: AppTheme.secondaryColor,
          title: '從相簿選擇',
          subtitle: '選擇已有的圖片',
          onTap: () {
            Navigator.pop(context);
            _getImage(ImageSource.gallery);
          },
        ),
        if (_receiptImage != null) ...[
          const SizedBox(height: 8),
          OptionTile(
            icon: Icons.delete_rounded,
            iconColor: Colors.red,
            title: '移除圖片',
            subtitle: '刪除已選擇的收據圖片',
            onTap: () {
              Navigator.pop(context);
              setState(() => _receiptImage = null);
            },
          ),
        ],
      ],
    );
  }

  Future<void> _getImage(ImageSource source) async {
    try {
      final pickedFile = await _imagePicker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 80,
      );

      if (pickedFile != null) {
        setState(() {
          _receiptImage = File(pickedFile.path);
        });
      }
    } catch (e) {
      if (mounted) {
        ErrorHandler.showErrorSnackBar(context, e, prefix: '無法選擇圖片');
      }
    }
  }

  Future<void> _saveBill() async {
    if (!_formKey.currentState!.validate()) return;

    final amount = double.parse(_amountController.text);

    // 驗證細項分攤模式
    if (_selectedSplitType == SplitType.itemized) {
      if (_items.isEmpty) {
        ErrorHandler.showWarningSnackBar(context, '請至少新增一個品項');
        return;
      }
      // 檢查每個品項
      for (int i = 0; i < _items.length; i++) {
        final item = _items[i];
        if (item.name.trim().isEmpty) {
          ErrorHandler.showWarningSnackBar(context, '品項 ${i + 1} 的名稱不能為空');
          return;
        }
        if (item.amount <= 0) {
          ErrorHandler.showWarningSnackBar(context, '品項「${item.name}」的金額必須大於 0');
          return;
        }
        if (item.participantIds.isEmpty) {
          ErrorHandler.showWarningSnackBar(context, '品項「${item.name}」至少要選擇一位參與者');
          return;
        }
      }
      // 檢查品項金額總和
      final itemsTotal = _items.fold<double>(0, (sum, item) => sum + item.amount);
      if ((itemsTotal - amount).abs() > 0.01) {
        ErrorHandler.showWarningSnackBar(
          context,
          '品項金額總和 (${CurrencyUtils.formatAmount(itemsTotal, _selectedCurrency)}) 不等於帳單總額 (${CurrencyUtils.formatAmount(amount, _selectedCurrency)})',
        );
        return;
      }
    } else {
      // 非細項模式需要選擇成員
      if (_selectedMemberIds.isEmpty) {
        ErrorHandler.showWarningSnackBar(context, '請選擇至少一位參與分攤的成員');
        return;
      }
    }

    // 驗證其他進階分攤模式
    if (_selectedSplitType == SplitType.exact) {
      final error = BillValidators.exactAmountTotal(
        totalAmount: amount,
        exactAmounts: _exactAmounts,
        selectedMemberIds: _selectedMemberIds,
        currency: _selectedCurrency,
      );
      if (error != null) {
        ErrorHandler.showWarningSnackBar(context, error);
        return;
      }
    } else if (_selectedSplitType == SplitType.percentage) {
      final error = BillValidators.percentageTotal(
        percentages: _percentages,
        selectedMemberIds: _selectedMemberIds,
      );
      if (error != null) {
        ErrorHandler.showWarningSnackBar(context, error);
        return;
      }
    }

    setState(() => _isSaving = true);

    try {
      // 解析付款者
      String? payerId;
      String? virtualPayerId;
      if (_selectedPayerKey != null) {
        if (_selectedPayerKey!.startsWith('vm_')) {
          virtualPayerId = _selectedPayerKey!.substring(3);
        } else {
          payerId = _selectedPayerKey;
        }
      }

      if (_selectedSplitType == SplitType.itemized) {
        // 細項分攤模式：收集所有參與者
        final allParticipantKeys = <String>{};
        for (final item in _items) {
          allParticipantKeys.addAll(item.participantIds);
        }
        final participants = allParticipantKeys.map((key) {
          if (key.startsWith('vm_')) {
            return <String, dynamic>{'virtualMemberId': key.substring(3)};
          }
          return <String, dynamic>{'userId': key};
        }).toList();

        await ref.read(billsRepositoryProvider).createBill(
              tripId: widget.tripId,
              title: _titleController.text.trim(),
              amount: amount,
              category: _selectedCategory.value,
              splitType: _selectedSplitType.value,
              note: _noteController.text.trim().isEmpty
                  ? null
                  : _noteController.text.trim(),
              receiptImageFile: _receiptImage,
              participants: participants,
              items: _items.map((item) => item.toJson()).toList(),
              currency: _selectedCurrency,
              payerId: payerId,
              virtualPayerId: virtualPayerId,
            );
      } else {
        // 其他分攤模式
        final participants = _selectedMemberIds.map((key) {
          final participant = key.startsWith('vm_')
              ? <String, dynamic>{'virtualMemberId': key.substring(3)}
              : <String, dynamic>{'userId': key};
          switch (_selectedSplitType) {
            case SplitType.exact:
              participant['amount'] = _exactAmounts[key] ?? 0;
              break;
            case SplitType.percentage:
              participant['percentage'] = _percentages[key] ?? 0;
              break;
            case SplitType.shares:
              participant['shares'] = _shares[key] ?? 1;
              break;
            case SplitType.equal:
            case SplitType.itemized:
              // 平均分攤不需要額外資料
              break;
          }
          return participant;
        }).toList();

        await ref.read(billsRepositoryProvider).createBill(
              tripId: widget.tripId,
              title: _titleController.text.trim(),
              amount: amount,
              category: _selectedCategory.value,
              splitType: _selectedSplitType.value,
              note: _noteController.text.trim().isEmpty
                  ? null
                  : _noteController.text.trim(),
              receiptImageFile: _receiptImage,
              participants: participants,
              currency: _selectedCurrency,
              payerId: payerId,
              virtualPayerId: virtualPayerId,
            );
      }

      if (mounted) {
        ErrorHandler.showSuccessSnackBar(context, '帳單新增成功！');
        // 每 2 次新增帳單顯示一次插頁廣告
        final isAdFree = ref.read(isAdFreeProvider);
        final adFrequency = ref.read(adFrequencyServiceProvider);
        if (!isAdFree &&
            adFrequency.canShowInterstitial(
                actionKey: 'bill_create', showEveryN: 2)) {
          final shown =
              await ref.read(interstitialAdServiceProvider).showAd();
          if (shown) adFrequency.recordInterstitialShown();
        }
        if (mounted) context.pop(true); // 返回 true 表示有新增資料，需要刷新
      }
    } catch (e) {
      if (mounted) {
        // 檢查是否為升級相關錯誤
        if (ErrorHandler.isUpgradeRequired(e)) {
          await ErrorHandler.showUpgradeDialog(context, e, tripId: widget.tripId);
        } else {
          ErrorHandler.showErrorSnackBar(context, e, prefix: '新增失敗');
        }
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  /// 關閉鍵盤
  void _dismissKeyboard() {
    FocusScope.of(context).unfocus();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return GestureDetector(
      onTap: _dismissKeyboard,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('新增帳單'),
          backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
        ),
        body: _isLoading
            ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const CircularProgressIndicator()
                      .animate(onPlay: (c) => c.repeat())
                      .rotate(duration: 1000.ms),
                  const SizedBox(height: 16),
                  Text(
                    '載入中...',
                    style: TextStyle(color: Colors.grey[500]),
                  ),
                ],
              ),
            )
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // 標題輸入
                  _buildSectionTitle('帳單資訊', Icons.info_rounded, 0),
                  const SizedBox(height: 12),
                  _AnimatedFormField(
                    delay: 100,
                    child: TextFormField(
                      controller: _titleController,
                      decoration: InputDecoration(
                        labelText: '帳單標題',
                        hintText: '例如：午餐 - 一蘭拉麵',
                        prefixIcon: Icon(Icons.title_rounded,
                            color: AppTheme.primaryColor),
                      ),
                      validator: BillValidators.title,
                      maxLength: 100,
                      buildCounter: (context, {required currentLength, required isFocused, maxLength}) => null,
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 金額輸入
                  _AnimatedFormField(
                    delay: 150,
                    child: TextFormField(
                      controller: _amountController,
                      decoration: InputDecoration(
                        labelText: '金額',
                        hintText: '輸入金額',
                        prefixIcon: Icon(Icons.attach_money_rounded,
                            color: AppTheme.primaryColor),
                        prefixText: '${CurrencyUtils.getInfo(_selectedCurrency).symbol} ',
                      ),
                      keyboardType: TextInputType.number,
                      validator: BillValidators.amount,
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 貨幣選擇
                  _AnimatedFormField(
                    delay: 175,
                    child: CurrencyPicker(
                      selectedCurrency: _selectedCurrency,
                      onCurrencyChanged: (currency) {
                        setState(() => _selectedCurrency = currency);
                      },
                    ),
                  ),
                  const SizedBox(height: 24),

                  // 分類選擇
                  _buildSectionTitle('消費分類', Icons.category_rounded, 200),
                  const SizedBox(height: 12),
                  _buildCategorySelector(),
                  const SizedBox(height: 24),

                  // 分攤方式
                  _buildSectionTitle('分攤方式', Icons.pie_chart_rounded, 300),
                  const SizedBox(height: 12),
                  _buildSplitTypeSelector(),
                  const SizedBox(height: 24),

                  // 備註
                  _AnimatedFormField(
                    delay: 400,
                    child: TextFormField(
                      controller: _noteController,
                      decoration: InputDecoration(
                        labelText: '備註（選填）',
                        hintText: '添加備註說明',
                        prefixIcon: Icon(Icons.note_rounded,
                            color: AppTheme.secondaryColor),
                      ),
                      maxLines: 2,
                      maxLength: 500,
                      validator: BillValidators.note,
                      buildCounter: (context, {required currentLength, required isFocused, maxLength}) => null,
                    ),
                  ),
                  const SizedBox(height: 24),

                  // 收據圖片
                  _buildSectionTitle('收據圖片', Icons.receipt_long_rounded, 420),
                  const SizedBox(height: 12),
                  _buildReceiptImagePicker(),
                  const SizedBox(height: 24),

                  // 細項分攤模式 - 顯示品項輸入
                  if (_selectedSplitType == SplitType.itemized) ...[
                    _buildSectionTitle('品項列表', Icons.list_alt_rounded, 450),
                    const SizedBox(height: 12),
                    _buildItemizedInput(),
                    const SizedBox(height: 24),
                  ] else ...[
                    // 非細項模式 - 顯示成員選擇器
                    _buildSectionTitle(
                        '參與分攤的成員', Icons.people_rounded, 450),
                    const SizedBox(height: 12),
                    _buildMemberSelector(),
                    const SizedBox(height: 24),

                    // 進階分攤設定（非平均分攤時顯示）
                    if (_selectedSplitType != SplitType.equal &&
                        _selectedMemberIds.isNotEmpty) ...[
                      _buildAdvancedSplitSettings(),
                      const SizedBox(height: 24),
                    ],
                  ],

                  // 預覽分攤金額
                  if (_amountController.text.isNotEmpty &&
                      (_selectedMemberIds.isNotEmpty ||
                       (_selectedSplitType == SplitType.itemized && _items.isNotEmpty))) ...[
                    _buildSplitPreview(),
                    const SizedBox(height: 24),
                  ],

                  // 儲存按鈕
                  GradientButton(
                    label: '新增帳單',
                    icon: Icons.check_rounded,
                    gradient: AppTheme.primaryGradient,
                    onPressed: _isSaving ? null : _saveBill,
                    isLoading: _isSaving,
                  )
                      .animate(delay: 600.ms)
                      .fadeIn(duration: 400.ms)
                      .slideY(begin: 0.2, end: 0),

                  const SizedBox(height: 32),
                ],
              ),
            ),
      ),
    );
  }

  Widget _buildSectionTitle(String title, IconData icon, int delayMs) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppTheme.primaryColor),
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

  Widget _buildReceiptImagePicker() {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return _AnimatedFormField(
      delay: 420,
      child: GestureDetector(
        onTap: _pickReceiptImage,
        child: Container(
          height: _receiptImage != null ? 200 : 120,
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E293B) : Colors.grey[100],
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: _receiptImage != null
                  ? AppTheme.primaryColor.withValues(alpha: 0.5)
                  : Colors.grey.withValues(alpha: 0.3),
              width: _receiptImage != null ? 2 : 1,
              strokeAlign: BorderSide.strokeAlignInside,
            ),
          ),
          child: _receiptImage != null
              ? Stack(
                  children: [
                    // 圖片預覽
                    ClipRRect(
                      borderRadius: BorderRadius.circular(11),
                      child: Image.file(
                        _receiptImage!,
                        width: double.infinity,
                        height: double.infinity,
                        fit: BoxFit.cover,
                      ),
                    ),
                    // 半透明遮罩
                    Positioned.fill(
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(11),
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              Colors.black.withValues(alpha: 0.5),
                            ],
                          ),
                        ),
                      ),
                    ),
                    // 編輯按鈕
                    Positioned(
                      right: 8,
                      top: 8,
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(
                          Icons.edit_rounded,
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                    ),
                    // 提示文字
                    Positioned(
                      left: 12,
                      bottom: 12,
                      child: Row(
                        children: [
                          const Icon(
                            Icons.check_circle_rounded,
                            color: Colors.white,
                            size: 16,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            '已選擇收據圖片（點擊更換）',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.9),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                )
              : Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.add_photo_alternate_rounded,
                      size: 40,
                      color: Colors.grey[400],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '點擊上傳收據圖片（選填）',
                      style: TextStyle(
                        color: Colors.grey[500],
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '支援拍照或從相簿選擇',
                      style: TextStyle(
                        color: Colors.grey[400],
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _buildCategorySelector() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: BillCategory.values.asMap().entries.map((entry) {
          final index = entry.key;
          final category = entry.value;
          final isSelected = _selectedCategory == category;
          final color = AppTheme.categoryColors[category.value] ?? Colors.grey;
          final gradient = AppTheme.categoryGradients[category.value];

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => setState(() => _selectedCategory = category),
              child: AnimatedContainer(
                duration: AppTheme.animFast,
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  gradient: isSelected ? gradient : null,
                  color: isSelected ? null : color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: isSelected
                      ? null
                      : Border.all(color: color.withValues(alpha: 0.3)),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: color.withValues(alpha: 0.3),
                            blurRadius: 8,
                            offset: const Offset(0, 4),
                          ),
                        ]
                      : null,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      CategoryUtils.getIcon(category.value),
                      size: 18,
                      color: isSelected ? Colors.white : color,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      category.label,
                      style: TextStyle(
                        color: isSelected ? Colors.white : color,
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          )
              .animate(delay: Duration(milliseconds: 250 + index * 50))
              .fadeIn(duration: 300.ms)
              .slideX(begin: 0.2, end: 0);
        }).toList(),
      ),
    );
  }

  Widget _buildSplitTypeSelector() {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: SplitType.values.asMap().entries.map((entry) {
        final index = entry.key;
        final type = entry.value;
        final isSelected = _selectedSplitType == type;

        return GestureDetector(
          onTap: () => setState(() => _selectedSplitType = type),
          child: AnimatedContainer(
            duration: AppTheme.animFast,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              gradient: isSelected ? AppTheme.secondaryGradient : null,
              color: isSelected
                  ? null
                  : AppTheme.secondaryColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: isSelected
                  ? null
                  : Border.all(
                      color: AppTheme.secondaryColor.withValues(alpha: 0.3)),
              boxShadow: isSelected
                  ? [
                      BoxShadow(
                        color: AppTheme.secondaryColor.withValues(alpha: 0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 4),
                      ),
                    ]
                  : null,
            ),
            child: Text(
              type.label,
              style: TextStyle(
                color: isSelected ? Colors.white : AppTheme.secondaryColor,
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
            ),
          ),
        )
            .animate(delay: Duration(milliseconds: 350 + index * 50))
            .fadeIn(duration: 300.ms)
            .scale(begin: const Offset(0.9, 0.9), end: const Offset(1, 1));
      }).toList(),
    );
  }

  Widget _buildMemberSelector() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final allSelected = _selectedMemberIds.length == _allParticipants.length;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: isDark ? null : AppTheme.softShadow,
      ),
      child: Column(
        children: [
          // 全選按鈕
          InkWell(
            onTap: () {
              setState(() {
                if (allSelected) {
                  _selectedMemberIds.clear();
                } else {
                  _selectedMemberIds = _allParticipants.map((p) => p.participantKey).toSet();
                }
              });
            },
            borderRadius:
                const BorderRadius.vertical(top: Radius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  AnimatedContainer(
                    duration: AppTheme.animFast,
                    width: 24,
                    height: 24,
                    decoration: BoxDecoration(
                      gradient:
                          allSelected ? AppTheme.primaryGradient : null,
                      color: allSelected
                          ? null
                          : Colors.grey.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: allSelected
                        ? const Icon(Icons.check_rounded,
                            color: Colors.white, size: 16)
                        : null,
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    '全選',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                    ),
                  ),
                  const Spacer(),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${_selectedMemberIds.length}/${_allParticipants.length}',
                      style: TextStyle(
                        color: AppTheme.primaryColor,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          )
              .animate(delay: 500.ms)
              .fadeIn(duration: 300.ms),
          Divider(height: 1, color: Colors.grey.withValues(alpha: 0.1)),

          // 參與者列表（真實成員 + 虛擬人員）
          ..._allParticipants.asMap().entries.map((entry) {
            final index = entry.key;
            final participant = entry.value;
            final isSelected = _selectedMemberIds.contains(participant.participantKey);

            return InkWell(
              onTap: () {
                setState(() {
                  if (isSelected) {
                    _selectedMemberIds.remove(participant.participantKey);
                  } else {
                    _selectedMemberIds.add(participant.participantKey);
                  }
                });
              },
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    AnimatedContainer(
                      duration: AppTheme.animFast,
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        gradient:
                            isSelected ? AppTheme.primaryGradient : null,
                        color: isSelected
                            ? null
                            : Colors.grey.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: isSelected
                          ? const Icon(Icons.check_rounded,
                              color: Colors.white, size: 16)
                          : null,
                    ),
                    const SizedBox(width: 12),
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        gradient: participant.isVirtual
                            ? null
                            : AppTheme.categoryGradients.values
                                .elementAt(index % 6),
                        border: participant.isVirtual
                            ? Border.all(color: Colors.orange.withValues(alpha: 0.5), width: 2)
                            : null,
                        color: participant.isVirtual
                            ? Colors.orange.withValues(alpha: 0.05)
                            : null,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Center(
                        child: participant.isVirtual
                            ? Icon(Icons.person_outline_rounded,
                                color: Colors.orange[600], size: 20)
                            : Text(
                                participant.displayName[0].toUpperCase(),
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Row(
                        children: [
                          Flexible(
                            child: Text(
                              participant.displayName,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 15,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (participant.isVirtual) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.orange.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                '虛擬',
                                style: TextStyle(
                                  color: Colors.orange[600],
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            )
                .animate(delay: Duration(milliseconds: 520 + index * 40))
                .fadeIn(duration: 300.ms)
                .slideX(begin: 0.05, end: 0);
          }),
        ],
      ),
    );
  }

  Widget _buildAdvancedSplitSettings() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final amount = double.tryParse(_amountController.text) ?? 0;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: isDark ? null : AppTheme.softShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                GradientIconBox(
                  icon: _getSplitTypeIcon(),
                  gradient: AppTheme.secondaryGradient,
                  size: 36,
                  iconSize: 18,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _getSplitTypeTitle(),
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _getSplitTypeHint(),
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[500],
                        ),
                      ),
                    ],
                  ),
                ),
                // 顯示總計狀態
                _buildSplitStatusBadge(amount),
              ],
            ),
          ),
          Divider(height: 1, color: Colors.grey.withValues(alpha: 0.1)),
          // 每位成員的輸入
          ..._selectedMemberIds.toList().asMap().entries.map((entry) {
            final index = entry.key;
            final memberId = entry.value;
            final participant = _findParticipant(memberId);
            if (participant == null) return const SizedBox.shrink();
            return _buildMemberSplitInput(participant, index, amount);
          }),
        ],
      ),
    )
        .animate(delay: 500.ms)
        .fadeIn(duration: 400.ms)
        .slideY(begin: 0.1, end: 0);
  }

  /// 細項分攤輸入區塊
  Widget _buildItemizedInput() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final totalAmount = double.tryParse(_amountController.text) ?? 0;
    final itemsTotal = _items.fold<double>(0, (sum, item) => sum + item.amount);
    final isAmountMatch = totalAmount > 0 && (itemsTotal - totalAmount).abs() < 0.01;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: isDark ? null : AppTheme.softShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 標題列
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                GradientIconBox(
                  icon: Icons.receipt_long_rounded,
                  gradient: AppTheme.warmGradient,
                  size: 36,
                  iconSize: 18,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '細項分攤',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '每個品項可指定不同的分攤對象',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey[500],
                        ),
                      ),
                    ],
                  ),
                ),
                // 金額狀態
                if (totalAmount > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: isAmountMatch
                          ? const Color(0xFF10B981).withValues(alpha: 0.1)
                          : const Color(0xFFEF4444).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          isAmountMatch ? Icons.check_circle_rounded : Icons.warning_rounded,
                          size: 14,
                          color: isAmountMatch ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          CurrencyUtils.formatAmount(itemsTotal, _selectedCurrency),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: isAmountMatch ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          Divider(height: 1, color: Colors.grey.withValues(alpha: 0.1)),

          // 品項列表
          if (_items.isEmpty)
            Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.shopping_basket_outlined,
                      size: 48,
                      color: Colors.grey[300],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      '尚未新增任何品項',
                      style: TextStyle(
                        color: Colors.grey[500],
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '點擊下方按鈕新增品項',
                      style: TextStyle(
                        color: Colors.grey[400],
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            ..._items.asMap().entries.map((entry) {
              final index = entry.key;
              final item = entry.value;
              return _buildItemCard(index, item);
            }),

          // 新增品項按鈕
          Padding(
            padding: const EdgeInsets.all(16),
            child: OutlinedButton.icon(
              onPressed: _addNewItem,
              icon: const Icon(Icons.add_rounded),
              label: const Text('新增品項'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.warmGradient.colors.first,
                side: BorderSide(
                  color: AppTheme.warmGradient.colors.first.withValues(alpha: 0.5),
                ),
                padding: const EdgeInsets.symmetric(vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    )
        .animate(delay: 500.ms)
        .fadeIn(duration: 400.ms)
        .slideY(begin: 0.1, end: 0);
  }

  /// 新增品項
  void _addNewItem() {
    setState(() {
      _items.add(BillItemInput(
        participantIds: _allParticipants.map((p) => p.participantKey).toSet(), // 預設全選
      ));
    });
  }

  /// 刪除品項
  void _removeItem(int index) {
    setState(() {
      _items.removeAt(index);
    });
  }

  /// 品項卡片
  Widget _buildItemCard(int index, BillItemInput item) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0F172A) : Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppTheme.warmGradient.colors.first.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 品項標題列
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 8, 8),
            child: Row(
              children: [
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    gradient: AppTheme.warmGradient,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Center(
                    child: Text(
                      '${index + 1}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    initialValue: item.name,
                    decoration: InputDecoration(
                      hintText: '品項名稱（例如：零食）',
                      hintStyle: TextStyle(
                        color: Colors.grey[400],
                        fontSize: 14,
                      ),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.zero,
                      isDense: true,
                    ),
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 15,
                    ),
                    onChanged: (value) {
                      item.name = value;
                    },
                  ),
                ),
                IconButton(
                  onPressed: () => _removeItem(index),
                  icon: Icon(
                    Icons.delete_outline_rounded,
                    color: Colors.red[400],
                    size: 20,
                  ),
                  tooltip: '刪除品項',
                ),
              ],
            ),
          ),

          // 金額輸入
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Icon(
                  Icons.attach_money_rounded,
                  size: 18,
                  color: Colors.grey[400],
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextFormField(
                    initialValue: item.amount > 0 ? item.amount.toStringAsFixed(0) : '',
                    decoration: InputDecoration(
                      hintText: '金額',
                      hintStyle: TextStyle(
                        color: Colors.grey[400],
                        fontSize: 14,
                      ),
                      prefixText: '${CurrencyUtils.getSymbol(_selectedCurrency)} ',
                      prefixStyle: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 14,
                      ),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.zero,
                      isDense: true,
                    ),
                    keyboardType: TextInputType.number,
                    onChanged: (value) {
                      setState(() {
                        item.amount = double.tryParse(value) ?? 0;
                      });
                    },
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),
          Divider(height: 1, color: Colors.grey.withValues(alpha: 0.1)),

          // 參與者選擇
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.people_outline_rounded,
                      size: 16,
                      color: Colors.grey[500],
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '參與分攤',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[500],
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const Spacer(),
                    // 全選按鈕
                    GestureDetector(
                      onTap: () {
                        setState(() {
                          if (item.participantIds.length == _allParticipants.length) {
                            item.participantIds.clear();
                          } else {
                            item.participantIds = _allParticipants.map((p) => p.participantKey).toSet();
                          }
                        });
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: item.participantIds.length == _allParticipants.length
                              ? AppTheme.primaryColor.withValues(alpha: 0.1)
                              : Colors.grey.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          item.participantIds.length == _allParticipants.length ? '取消全選' : '全選',
                          style: TextStyle(
                            fontSize: 11,
                            color: item.participantIds.length == _allParticipants.length
                                ? AppTheme.primaryColor
                                : Colors.grey[600],
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _allParticipants.map((participant) {
                    final isSelected = item.participantIds.contains(participant.participantKey);
                    final isDisabledVirtual = participant.isVirtual && !_isPremium;
                    return GestureDetector(
                      onTap: isDisabledVirtual ? null : () {
                        setState(() {
                          if (isSelected) {
                            item.participantIds.remove(participant.participantKey);
                          } else {
                            item.participantIds.add(participant.participantKey);
                          }
                        });
                      },
                      child: AnimatedContainer(
                        duration: AppTheme.animFast,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          gradient: isSelected
                              ? (participant.isVirtual
                                  ? LinearGradient(colors: [Colors.orange[400]!, Colors.orange[600]!])
                                  : AppTheme.primaryGradient)
                              : null,
                          color: isSelected
                              ? null
                              : isDisabledVirtual
                                  ? Colors.grey.withValues(alpha: 0.05)
                                  : Colors.grey.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (participant.isVirtual) ...[
                              Icon(
                                Icons.person_outline,
                                size: 14,
                                color: isSelected
                                    ? Colors.white
                                    : isDisabledVirtual
                                        ? Colors.grey[400]
                                        : Colors.orange[600],
                              ),
                              const SizedBox(width: 4),
                            ],
                            Text(
                              participant.displayName,
                              style: TextStyle(
                                fontSize: 12,
                                color: isSelected
                                    ? Colors.white
                                    : isDisabledVirtual
                                        ? Colors.grey[400]
                                        : Colors.grey[600],
                                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
                // 顯示每人分攤金額
                if (item.participantIds.isNotEmpty && item.amount > 0) ...[
                  const SizedBox(height: 8),
                  Text(
                    '每人 ${CurrencyUtils.formatAmount(item.amount / item.participantIds.length, _selectedCurrency)}',
                    style: TextStyle(
                      fontSize: 11,
                      color: AppTheme.primaryColor,
                      fontWeight: FontWeight.w500,
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

  IconData _getSplitTypeIcon() {
    switch (_selectedSplitType) {
      case SplitType.exact:
        return Icons.attach_money_rounded;
      case SplitType.percentage:
        return Icons.percent_rounded;
      case SplitType.shares:
        return Icons.grid_view_rounded;
      default:
        return Icons.pie_chart_rounded;
    }
  }

  String _getSplitTypeTitle() {
    switch (_selectedSplitType) {
      case SplitType.exact:
        return '指定金額分攤';
      case SplitType.percentage:
        return '百分比分攤';
      case SplitType.shares:
        return '份數分攤';
      default:
        return '分攤設定';
    }
  }

  String _getSplitTypeHint() {
    switch (_selectedSplitType) {
      case SplitType.exact:
        return '輸入每位成員需支付的確切金額';
      case SplitType.percentage:
        return '輸入每位成員的負擔百分比（總和需為 100%）';
      case SplitType.shares:
        return '輸入每位成員的份數（例如：2 份表示負擔 2 倍）';
      default:
        return '';
    }
  }

  Widget _buildSplitStatusBadge(double totalAmount) {
    bool isValid = false;
    String statusText = '';

    switch (_selectedSplitType) {
      case SplitType.exact:
        final totalExact = _selectedMemberIds.fold<double>(
          0, (sum, id) => sum + (_exactAmounts[id] ?? 0));
        isValid = (totalExact - totalAmount).abs() < 0.01;
        statusText = CurrencyUtils.formatAmount(totalExact, _selectedCurrency);
        break;
      case SplitType.percentage:
        final totalPercentage = _selectedMemberIds.fold<double>(
          0, (sum, id) => sum + (_percentages[id] ?? 0));
        isValid = (totalPercentage - 100).abs() < 0.01;
        statusText = '${totalPercentage.toStringAsFixed(1)}%';
        break;
      case SplitType.shares:
        isValid = true;
        final totalShares = _selectedMemberIds.fold<int>(
          0, (sum, id) => sum + (_shares[id] ?? 1));
        statusText = '$totalShares 份';
        break;
      default:
        return const SizedBox();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: isValid
            ? const Color(0xFF10B981).withValues(alpha: 0.1)
            : const Color(0xFFEF4444).withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isValid ? Icons.check_circle_rounded : Icons.warning_rounded,
            size: 14,
            color: isValid ? const Color(0xFF10B981) : const Color(0xFFEF4444),
          ),
          const SizedBox(width: 4),
          Text(
            statusText,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: isValid ? const Color(0xFF10B981) : const Color(0xFFEF4444),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMemberSplitInput(Participant participant, int index, double totalAmount) {
    final gradients = [
      AppTheme.primaryGradient,
      AppTheme.secondaryGradient,
      AppTheme.warmGradient,
      AppTheme.successGradient,
    ];
    final gradient = participant.isVirtual
        ? LinearGradient(colors: [Colors.orange[400]!, Colors.orange[600]!])
        : gradients[index % gradients.length];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          // 頭像
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              gradient: gradient,
              borderRadius: BorderRadius.circular(10),
              border: participant.isVirtual
                  ? Border.all(color: Colors.orange, width: 1.5)
                  : null,
            ),
            child: Center(
              child: participant.isVirtual
                  ? const Icon(Icons.person_outline, color: Colors.white, size: 18)
                  : Text(
                      participant.displayName[0].toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
            ),
          ),
          const SizedBox(width: 12),
          // 名稱
          Expanded(
            flex: 2,
            child: Row(
              children: [
                Flexible(
                  child: Text(
                    participant.displayName,
                    style: const TextStyle(
                      fontWeight: FontWeight.w500,
                      fontSize: 14,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                if (participant.isVirtual) ...[
                  const SizedBox(width: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                    decoration: BoxDecoration(
                      color: Colors.orange.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      '虛擬',
                      style: TextStyle(fontSize: 9, color: Colors.orange[700], fontWeight: FontWeight.w500),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 12),
          // 輸入欄位
          Expanded(
            flex: 3,
            child: _buildSplitInputField(participant, totalAmount),
          ),
        ],
      ),
    );
  }

  Widget _buildSplitInputField(Participant participant, double totalAmount) {
    final key = participant.participantKey;
    switch (_selectedSplitType) {
      case SplitType.exact:
        return _ExactAmountInput(
          value: _exactAmounts[key] ?? 0,
          currency: _selectedCurrency,
          onChanged: (value) {
            setState(() {
              _exactAmounts[key] = value;
            });
          },
        );
      case SplitType.percentage:
        return _PercentageInput(
          value: _percentages[key] ?? 0,
          totalAmount: totalAmount,
          currency: _selectedCurrency,
          onChanged: (value) {
            setState(() {
              _percentages[key] = value;
            });
          },
        );
      case SplitType.shares:
        return _SharesInput(
          value: _shares[key] ?? 1,
          onChanged: (value) {
            setState(() {
              _shares[key] = value;
            });
          },
        );
      default:
        return const SizedBox();
    }
  }

  Widget _buildSplitPreview() {
    final amount = double.tryParse(_amountController.text) ?? 0;

    // 細項分攤模式的條件不同
    if (_selectedSplitType == SplitType.itemized) {
      if (amount <= 0 || _items.isEmpty) return const SizedBox();
    } else {
      if (amount <= 0 || _selectedMemberIds.isEmpty) return const SizedBox();
    }

    // 根據分攤類型計算每人金額
    Map<String, double> memberAmounts = {};

    switch (_selectedSplitType) {
      case SplitType.equal:
        final perPerson = amount / _selectedMemberIds.length;
        for (final id in _selectedMemberIds) {
          memberAmounts[id] = perPerson;
        }
        break;
      case SplitType.exact:
        for (final id in _selectedMemberIds) {
          memberAmounts[id] = _exactAmounts[id] ?? 0;
        }
        break;
      case SplitType.percentage:
        for (final id in _selectedMemberIds) {
          memberAmounts[id] = amount * (_percentages[id] ?? 0) / 100;
        }
        break;
      case SplitType.shares:
        final totalShares = _selectedMemberIds.fold<int>(
          0, (sum, id) => sum + (_shares[id] ?? 1));
        if (totalShares > 0) {
          final perShare = amount / totalShares;
          for (final id in _selectedMemberIds) {
            memberAmounts[id] = perShare * (_shares[id] ?? 1);
          }
        }
        break;
      case SplitType.itemized:
        // 從品項計算每人總分攤金額
        for (final item in _items) {
          if (item.participantIds.isNotEmpty && item.amount > 0) {
            final perPerson = item.amount / item.participantIds.length;
            for (final userId in item.participantIds) {
              memberAmounts[userId] = (memberAmounts[userId] ?? 0) + perPerson;
            }
          }
        }
        break;
    }

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppTheme.primaryColor.withValues(alpha: 0.15),
            AppTheme.secondaryColor.withValues(alpha: 0.15),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppTheme.primaryColor.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              GradientIconBox(
                icon: Icons.calculate_rounded,
                gradient: AppTheme.primaryGradient,
                size: 36,
                iconSize: 18,
              ),
              const SizedBox(width: 12),
              const Text(
                '分攤預覽',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  letterSpacing: -0.3,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          // 總覽資訊
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _PreviewItem(
                label: '總金額',
                value: CurrencyUtils.formatAmount(amount, _selectedCurrency),
                color: AppTheme.primaryColor,
              ),
              _PreviewItem(
                label: '參與人數',
                value: _selectedSplitType == SplitType.itemized
                    ? '${memberAmounts.length} 人'
                    : '${_selectedMemberIds.length} 人',
                color: AppTheme.secondaryColor,
              ),
              _PreviewItem(
                label: _selectedSplitType == SplitType.equal ? '每人分攤' : '分攤方式',
                value: _selectedSplitType == SplitType.equal
                    ? CurrencyUtils.formatAmount(amount / _selectedMemberIds.length, _selectedCurrency)
                    : _selectedSplitType.label,
                color: AppTheme.accentColor,
              ),
            ],
          ),
          // 細項分攤模式：顯示品項明細
          if (_selectedSplitType == SplitType.itemized && _items.isNotEmpty) ...[
            const SizedBox(height: 16),
            Divider(color: AppTheme.primaryColor.withValues(alpha: 0.2)),
            const SizedBox(height: 12),
            // 品項明細
            ..._items.map((item) {
              final participantNames = item.participantIds
                  .map((id) => _findParticipant(id))
                  .where((p) => p != null)
                  .map((p) => p!.displayName)
                  .join('、');
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            item.name.isEmpty ? '未命名品項' : item.name,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                        Text(
                          CurrencyUtils.formatAmount(item.amount, _selectedCurrency),
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      item.participantIds.isEmpty
                          ? '尚未選擇參與者'
                          : '$participantNames 平分，每人 ${CurrencyUtils.formatAmount(item.amount / item.participantIds.length, _selectedCurrency)}',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[500],
                      ),
                    ),
                  ],
                ),
              );
            }),
            // 分隔線
            const SizedBox(height: 12),
            Divider(color: AppTheme.primaryColor.withValues(alpha: 0.2)),
            const SizedBox(height: 12),
            // 每人總計
            ...memberAmounts.entries.map((entry) {
              final p = _findParticipant(entry.key);
              if (p == null) return const SizedBox.shrink();
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          p.displayName,
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[600],
                          ),
                        ),
                        if (p.isVirtual) ...[
                          const SizedBox(width: 4),
                          Icon(Icons.person_outline, size: 14, color: Colors.orange[600]),
                        ],
                      ],
                    ),
                    Text(
                      CurrencyUtils.formatAmount(entry.value, _selectedCurrency),
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              );
            }),
          ]
          // 非平均分攤（非細項）時顯示每人金額明細
          else if (_selectedSplitType != SplitType.equal) ...[
            const SizedBox(height: 16),
            Divider(color: AppTheme.primaryColor.withValues(alpha: 0.2)),
            const SizedBox(height: 12),
            ...memberAmounts.entries.map((entry) {
              final p = _findParticipant(entry.key);
              if (p == null) return const SizedBox.shrink();
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          p.displayName,
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[600],
                          ),
                        ),
                        if (p.isVirtual) ...[
                          const SizedBox(width: 4),
                          Icon(Icons.person_outline, size: 14, color: Colors.orange[600]),
                        ],
                      ],
                    ),
                    Text(
                      CurrencyUtils.formatAmount(entry.value, _selectedCurrency),
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              );
            }),
          ],
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 300.ms)
        .scale(begin: const Offset(0.95, 0.95), end: const Offset(1, 1));
  }
}

class _AnimatedFormField extends StatelessWidget {
  final Widget child;
  final int delay;

  const _AnimatedFormField({
    required this.child,
    required this.delay,
  });

  @override
  Widget build(BuildContext context) {
    return child
        .animate(delay: Duration(milliseconds: delay))
        .fadeIn(duration: 400.ms)
        .slideY(begin: 0.1, end: 0);
  }
}

class _PreviewItem extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _PreviewItem({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: color,
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
    );
  }
}

/// 指定金額輸入元件
class _ExactAmountInput extends StatelessWidget {
  final double value;
  final ValueChanged<double> onChanged;
  final Currency currency;

  const _ExactAmountInput({
    required this.value,
    required this.onChanged,
    required this.currency,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 44,
      decoration: BoxDecoration(
        color: AppTheme.primaryColor.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: AppTheme.primaryColor.withValues(alpha: 0.2),
        ),
      ),
      child: Row(
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 12),
            child: Text(
              CurrencyUtils.getSymbol(currency),
              style: const TextStyle(
                color: Colors.grey,
                fontWeight: FontWeight.w500,
                fontSize: 13,
              ),
            ),
          ),
          Expanded(
            child: TextFormField(
              initialValue: value > 0 ? value.toStringAsFixed(0) : '',
              keyboardType: TextInputType.number,
              textAlign: TextAlign.right,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 15,
              ),
              decoration: const InputDecoration(
                contentPadding: EdgeInsets.symmetric(horizontal: 12),
                border: InputBorder.none,
                hintText: '0',
              ),
              onChanged: (text) {
                final parsed = double.tryParse(text) ?? 0;
                onChanged(parsed);
              },
            ),
          ),
        ],
      ),
    );
  }
}

/// 百分比輸入元件
class _PercentageInput extends StatelessWidget {
  final double value;
  final double totalAmount;
  final ValueChanged<double> onChanged;
  final Currency currency;

  const _PercentageInput({
    required this.value,
    required this.totalAmount,
    required this.onChanged,
    required this.currency,
  });

  @override
  Widget build(BuildContext context) {
    final calculatedAmount = totalAmount * value / 100;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        Container(
          height: 44,
          decoration: BoxDecoration(
            color: AppTheme.secondaryColor.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: AppTheme.secondaryColor.withValues(alpha: 0.2),
            ),
          ),
          child: Row(
            children: [
              Expanded(
                child: TextFormField(
                  initialValue: value > 0 ? value.toStringAsFixed(1) : '',
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  textAlign: TextAlign.right,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                  ),
                  decoration: const InputDecoration(
                    contentPadding: EdgeInsets.symmetric(horizontal: 12),
                    border: InputBorder.none,
                    hintText: '0',
                  ),
                  onChanged: (text) {
                    final parsed = double.tryParse(text) ?? 0;
                    onChanged(parsed.clamp(0, 100));
                  },
                ),
              ),
              const Padding(
                padding: EdgeInsets.only(right: 12),
                child: Text(
                  '%',
                  style: TextStyle(
                    color: Colors.grey,
                    fontWeight: FontWeight.w500,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
        ),
        if (totalAmount > 0) ...[
          const SizedBox(height: 4),
          Text(
            '≈ ${CurrencyUtils.formatAmount(calculatedAmount, currency)}',
            style: TextStyle(
              fontSize: 11,
              color: Colors.grey[500],
            ),
          ),
        ],
      ],
    );
  }
}

/// 份數輸入元件
class _SharesInput extends StatelessWidget {
  final int value;
  final ValueChanged<int> onChanged;

  const _SharesInput({
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 44,
      decoration: BoxDecoration(
        color: AppTheme.warmGradient.colors.first.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: AppTheme.warmGradient.colors.first.withValues(alpha: 0.2),
        ),
      ),
      child: Row(
        children: [
          // 減少按鈕
          _ShareButton(
            icon: Icons.remove_rounded,
            onTap: value > 1 ? () => onChanged(value - 1) : null,
          ),
          // 份數顯示
          Expanded(
            child: Center(
              child: Text(
                '$value 份',
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 15,
                ),
              ),
            ),
          ),
          // 增加按鈕
          _ShareButton(
            icon: Icons.add_rounded,
            onTap: value < 10 ? () => onChanged(value + 1) : null,
          ),
        ],
      ),
    );
  }
}

class _ShareButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;

  const _ShareButton({
    required this.icon,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isEnabled = onTap != null;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Container(
          width: 44,
          height: 44,
          child: Icon(
            icon,
            size: 20,
            color: isEnabled ? AppTheme.warmGradient.colors.first : Colors.grey[300],
          ),
        ),
      ),
    );
  }
}

/// 細項分攤的輸入資料模型
class BillItemInput {
  String name;
  double amount;
  Set<String> participantIds;

  BillItemInput({
    this.name = '',
    this.amount = 0,
    Set<String>? participantIds,
  }) : participantIds = participantIds ?? {};

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'amount': amount,
      'participantIds': participantIds.toList(),
    };
  }
}
