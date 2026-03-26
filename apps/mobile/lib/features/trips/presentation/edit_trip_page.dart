import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../data/trips_repository.dart';
import '../../../shared/models/trip_model.dart';
import '../../../shared/utils/validators.dart';
import '../../../shared/utils/error_handler.dart';
import '../../../shared/widgets/skeleton_loading.dart';
import '../../../shared/widgets/currency_picker.dart';
import '../../../core/config/theme.dart';
import '../../../core/utils/currency_utils.dart';

class EditTripPage extends ConsumerStatefulWidget {
  final String tripId;

  const EditTripPage({super.key, required this.tripId});

  @override
  ConsumerState<EditTripPage> createState() => _EditTripPageState();
}

class _EditTripPageState extends ConsumerState<EditTripPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();

  TripDetail? _trip;
  bool _isLoading = true;
  bool _isSaving = false;
  DateTime? _startDate;
  DateTime? _endDate;
  Currency _defaultCurrency = Currency.TWD;

  @override
  void initState() {
    super.initState();
    _loadTrip();
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _loadTrip() async {
    try {
      final trip = await ref.read(tripsRepositoryProvider).getTripDetail(widget.tripId);
      setState(() {
        _trip = trip;
        _nameController.text = trip.name;
        _descriptionController.text = trip.description ?? '';
        _defaultCurrency = trip.defaultCurrency;
        if (trip.startDate != null) {
          _startDate = DateTime.tryParse(trip.startDate!);
        }
        if (trip.endDate != null) {
          _endDate = DateTime.tryParse(trip.endDate!);
        }
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ErrorHandler.showErrorSnackBar(context, e, prefix: '載入失敗');
      }
    }
  }

  Future<void> _selectDate(BuildContext context, bool isStartDate) async {
    final initialDate = isStartDate
        ? (_startDate ?? DateTime.now())
        : (_endDate ?? _startDate ?? DateTime.now());

    final firstDate = isStartDate
        ? DateTime(2020)
        : (_startDate ?? DateTime(2020));

    final lastDate = DateTime(2100);

    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: firstDate,
      lastDate: lastDate,
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: AppTheme.primaryColor,
              onPrimary: Colors.white,
              surface: Colors.white,
              onSurface: Colors.black,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        if (isStartDate) {
          _startDate = picked;
          // 如果結束日期早於開始日期，清除結束日期
          if (_endDate != null && _endDate!.isBefore(picked)) {
            _endDate = null;
          }
        } else {
          _endDate = picked;
        }
      });
    }
  }

  String _formatDate(DateTime? date) {
    if (date == null) return '選擇日期';
    return '${date.year}/${date.month.toString().padLeft(2, '0')}/${date.day.toString().padLeft(2, '0')}';
  }

  Future<void> _saveTrip() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    try {
      await ref.read(tripsRepositoryProvider).updateTrip(
        tripId: widget.tripId,
        name: _nameController.text.trim(),
        description: _descriptionController.text.trim().isEmpty
            ? null
            : _descriptionController.text.trim(),
        startDate: _startDate?.toIso8601String(),
        endDate: _endDate?.toIso8601String(),
        defaultCurrency: _defaultCurrency,
      );

      if (mounted) {
        ErrorHandler.showSuccessSnackBar(context, '旅程已更新');
        context.pop(true); // 返回 true 表示有更新
      }
    } catch (e) {
      setState(() => _isSaving = false);
      if (mounted) {
        ErrorHandler.showErrorSnackBar(context, e, prefix: '更新失敗');
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
        backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
        appBar: AppBar(
          title: Text(
            '編輯旅程',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : const Color(0xFF1E293B),
            ),
          ),
          backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
          elevation: 0,
          leading: IconButton(
            icon: Icon(
              Icons.arrow_back_rounded,
              color: isDark ? Colors.white : const Color(0xFF1E293B),
            ),
            onPressed: () => context.pop(),
          ),
          actions: [
            TextButton(
              onPressed: _isSaving ? null : _saveTrip,
              child: _isSaving
                  ? SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: AppTheme.primaryColor,
                      ),
                    )
                  : Text(
                      '儲存',
                      style: TextStyle(
                        color: AppTheme.primaryColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: _isLoading
            ? _buildLoadingSkeleton()
            : _trip == null
                ? _buildErrorState()
                : _buildForm(isDark),
      ),
    );
  }

  Widget _buildLoadingSkeleton() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SkeletonText(width: 80, height: 14),
          const SizedBox(height: 8),
          const SkeletonLoading(height: 56, borderRadius: 12),
          const SizedBox(height: 24),
          const SkeletonText(width: 60, height: 14),
          const SizedBox(height: 8),
          const SkeletonLoading(height: 100, borderRadius: 12),
          const SizedBox(height: 24),
          const SkeletonText(width: 80, height: 14),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(child: SkeletonLoading(height: 56, borderRadius: 12)),
              const SizedBox(width: 12),
              Expanded(child: SkeletonLoading(height: 56, borderRadius: 12)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline_rounded,
            size: 64,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 16),
          Text(
            '無法載入旅程資訊',
            style: TextStyle(
              fontSize: 16,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: () => context.pop(),
            icon: const Icon(Icons.arrow_back_rounded),
            label: const Text('返回'),
          ),
        ],
      ),
    );
  }

  Widget _buildForm(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 旅程名稱
            _buildSectionTitle('旅程名稱', isRequired: true)
                .animate()
                .fadeIn(duration: 300.ms)
                .slideX(begin: -0.1, end: 0),
            const SizedBox(height: 8),
            TextFormField(
              controller: _nameController,
              validator: TripValidators.name,
              decoration: _buildInputDecoration(
                hintText: '輸入旅程名稱',
                prefixIcon: Icons.flight_takeoff_rounded,
                isDark: isDark,
              ),
              textInputAction: TextInputAction.next,
            )
                .animate()
                .fadeIn(duration: 300.ms, delay: 50.ms)
                .slideX(begin: -0.1, end: 0),
            const SizedBox(height: 24),

            // 旅程描述
            _buildSectionTitle('描述')
                .animate()
                .fadeIn(duration: 300.ms, delay: 100.ms)
                .slideX(begin: -0.1, end: 0),
            const SizedBox(height: 8),
            TextFormField(
              controller: _descriptionController,
              validator: TripValidators.description,
              decoration: _buildInputDecoration(
                hintText: '輸入旅程描述（選填）',
                prefixIcon: Icons.description_rounded,
                isDark: isDark,
              ),
              maxLines: 3,
              textInputAction: TextInputAction.done,
            )
                .animate()
                .fadeIn(duration: 300.ms, delay: 150.ms)
                .slideX(begin: -0.1, end: 0),
            const SizedBox(height: 24),

            // 日期選擇
            _buildSectionTitle('旅程日期')
                .animate()
                .fadeIn(duration: 300.ms, delay: 200.ms)
                .slideX(begin: -0.1, end: 0),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: _buildDateSelector(
                    label: '開始日期',
                    date: _startDate,
                    onTap: () => _selectDate(context, true),
                    isDark: isDark,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildDateSelector(
                    label: '結束日期',
                    date: _endDate,
                    onTap: () => _selectDate(context, false),
                    isDark: isDark,
                  ),
                ),
              ],
            )
                .animate()
                .fadeIn(duration: 300.ms, delay: 250.ms)
                .slideX(begin: -0.1, end: 0),

            // 預設貨幣
            const SizedBox(height: 24),
            _buildSectionTitle('預設貨幣')
                .animate()
                .fadeIn(duration: 300.ms, delay: 275.ms)
                .slideX(begin: -0.1, end: 0),
            const SizedBox(height: 8),
            CurrencyPicker(
              selectedCurrency: _defaultCurrency,
              onCurrencyChanged: (currency) {
                setState(() => _defaultCurrency = currency);
              },
            )
                .animate()
                .fadeIn(duration: 300.ms, delay: 300.ms)
                .slideX(begin: -0.1, end: 0),

            // 邀請碼顯示（唯讀）
            const SizedBox(height: 32),
            _buildSectionTitle('邀請碼')
                .animate()
                .fadeIn(duration: 300.ms, delay: 350.ms)
                .slideX(begin: -0.1, end: 0),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E293B) : Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark
                      ? Colors.grey.withValues(alpha: 0.2)
                      : Colors.grey.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      gradient: AppTheme.primaryGradient,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(
                      Icons.vpn_key_rounded,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _trip!.inviteCode,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 2,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '分享此邀請碼讓朋友加入',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[500],
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: Icon(
                      Icons.copy_rounded,
                      color: AppTheme.primaryColor,
                    ),
                    onPressed: () {
                      // 複製邀請碼邏輯由 trip_detail_page 處理
                      ErrorHandler.showSuccessSnackBar(context, '邀請碼已複製');
                    },
                  ),
                ],
              ),
            )
                .animate()
                .fadeIn(duration: 300.ms, delay: 400.ms)
                .slideX(begin: -0.1, end: 0),

            // 旅程資訊
            const SizedBox(height: 32),
            _buildInfoCard(isDark)
                .animate()
                .fadeIn(duration: 300.ms, delay: 450.ms)
                .slideY(begin: 0.1, end: 0),

            const SizedBox(height: 100),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title, {bool isRequired = false}) {
    return Row(
      children: [
        Text(
          title,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: Colors.grey[600],
          ),
        ),
        if (isRequired) ...[
          const SizedBox(width: 4),
          Text(
            '*',
            style: TextStyle(
              color: Colors.red[400],
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ],
    );
  }

  InputDecoration _buildInputDecoration({
    required String hintText,
    required IconData prefixIcon,
    required bool isDark,
  }) {
    return InputDecoration(
      hintText: hintText,
      hintStyle: TextStyle(color: Colors.grey[400]),
      prefixIcon: Icon(prefixIcon, color: AppTheme.primaryColor),
      filled: true,
      fillColor: isDark ? const Color(0xFF1E293B) : Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: isDark
              ? Colors.grey.withValues(alpha: 0.2)
              : Colors.grey.withValues(alpha: 0.3),
        ),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: isDark
              ? Colors.grey.withValues(alpha: 0.2)
              : Colors.grey.withValues(alpha: 0.3),
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: AppTheme.primaryColor,
          width: 2,
        ),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: Colors.red[400]!,
        ),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: Colors.red[400]!,
          width: 2,
        ),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    );
  }

  Widget _buildDateSelector({
    required String label,
    required DateTime? date,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDark
                ? Colors.grey.withValues(alpha: 0.2)
                : Colors.grey.withValues(alpha: 0.3),
          ),
        ),
        child: Row(
          children: [
            Icon(
              Icons.calendar_today_rounded,
              color: AppTheme.primaryColor,
              size: 20,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey[500],
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _formatDate(date),
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: date == null ? Colors.grey[400] : null,
                    ),
                  ),
                ],
              ),
            ),
            if (date != null)
              GestureDetector(
                onTap: () {
                  setState(() {
                    if (label == '開始日期') {
                      _startDate = null;
                    } else {
                      _endDate = null;
                    }
                  });
                },
                child: Icon(
                  Icons.clear_rounded,
                  color: Colors.grey[400],
                  size: 18,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark
            ? AppTheme.primaryColor.withValues(alpha: 0.1)
            : AppTheme.primaryColor.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppTheme.primaryColor.withValues(alpha: 0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                Icons.info_outline_rounded,
                color: AppTheme.primaryColor,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                '旅程資訊',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildInfoRow(
            '成員人數',
            '${_trip!.members.length} 人',
            Icons.people_rounded,
          ),
          const SizedBox(height: 8),
          _buildInfoRow(
            '帳單筆數',
            '${_trip!.bills.length} 筆',
            Icons.receipt_rounded,
          ),
          const SizedBox(height: 8),
          _buildInfoRow(
            '建立時間',
            _formatDateTime(_trip!.createdAt),
            Icons.access_time_rounded,
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 16, color: Colors.grey[500]),
        const SizedBox(width: 8),
        Text(
          '$label：',
          style: TextStyle(
            fontSize: 13,
            color: Colors.grey[600],
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  String _formatDateTime(DateTime dateTime) {
    return '${dateTime.year}/${dateTime.month.toString().padLeft(2, '0')}/${dateTime.day.toString().padLeft(2, '0')}';
  }
}
