import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../../core/config/theme.dart';
import '../../../core/config/theme_provider.dart';
import '../../../core/storage/auth_storage.dart';
import '../../../core/storage/cache_service.dart';
import '../../../shared/widgets/animated_widgets.dart';
import '../../../shared/utils/error_handler.dart';
import '../../auth/data/auth_repository.dart';
import '../../purchase/presentation/paywall_dialog.dart';
import '../../purchase/presentation/premium_comparison_sheet.dart';
import '../../purchase/providers/purchase_providers.dart';

/// 使用者資訊 Provider（從 AuthStorage 讀取）
final userInfoProvider = FutureProvider<Map<String, String?>>((ref) async {
  final authStorage = ref.read(authStorageProvider);
  final userId = await authStorage.getUserId();
  final userName = await authStorage.getUserName();
  return {
    'userId': userId,
    'userName': userName,
  };
});

/// 快取大小資訊 Provider
final cacheInfoProvider = FutureProvider.autoDispose<CacheInfo>((ref) async {
  final cacheService = ref.read(cacheServiceProvider);
  return cacheService.getCacheInfo();
});

/// App 版本號
const String appVersion = '1.0.0';

class SettingsPage extends ConsumerWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final themeMode = ref.watch(themeModeProvider);
    final userInfoAsync = ref.watch(userInfoProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('設定'),
        automaticallyImplyLeading: false, // 移除返回按鈕（從底部導航進入）
        backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 使用者資訊卡片
          _buildUserInfoCard(context, ref, userInfoAsync, isDark),
          const SizedBox(height: 24),

          // 外觀設定
          _buildSectionHeader('外觀', Icons.palette_rounded, 0),
          const SizedBox(height: 12),
          _buildThemeCard(context, ref, themeMode, isDark),
          const SizedBox(height: 24),

          // 購買
          _buildSectionHeader('購買', Icons.shopping_bag_rounded, 100),
          const SizedBox(height: 12),
          _buildPurchaseCard(context, ref, isDark),
          const SizedBox(height: 24),

          // 資料管理
          _buildSectionHeader('資料管理', Icons.storage_rounded, 150),
          const SizedBox(height: 12),
          _buildDataManagementCard(context, ref, isDark),
          const SizedBox(height: 24),

          // 關於
          _buildSectionHeader('關於', Icons.info_outline_rounded, 200),
          const SizedBox(height: 12),
          _buildAboutCard(context, isDark),
          const SizedBox(height: 24),

          // 登出按鈕
          _buildLogoutButton(context, ref, isDark),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon, int delayMs) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppTheme.primaryColor),
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

  Widget _buildUserInfoCard(
    BuildContext context,
    WidgetRef ref,
    AsyncValue<Map<String, String?>> userInfoAsync,
    bool isDark,
  ) {
    return AnimatedCard(
      delayMs: 0,
      child: userInfoAsync.when(
        data: (userInfo) {
          final userName = userInfo['userName'] ?? '用戶';
          final userId = userInfo['userId'] ?? '';

          return Row(
            children: [
              // 頭像
              GradientIconBox(
                icon: Icons.person_rounded,
                gradient: AppTheme.primaryGradient,
                size: 64,
                iconSize: 32,
              ),
              const SizedBox(width: 16),

              // 用戶資訊
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      userName,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'ID: ${userId.length > 8 ? '${userId.substring(0, 8)}...' : userId}',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey[500],
                      ),
                    ),
                  ],
                ),
              ),

              // 編輯按鈕
              IconButton(
                onPressed: () => _showEditProfileDialog(context, ref, userName),
                icon: Icon(
                  Icons.edit_rounded,
                  color: AppTheme.primaryColor,
                  size: 22,
                ),
              ),
            ],
          );
        },
        loading: () => const Center(
          child: Padding(
            padding: EdgeInsets.all(20),
            child: CircularProgressIndicator(),
          ),
        ),
        error: (_, __) => const Center(
          child: Text('無法載入用戶資訊'),
        ),
      ),
    );
  }

  Widget _buildThemeCard(
    BuildContext context,
    WidgetRef ref,
    ThemeMode themeMode,
    bool isDark,
  ) {
    return AnimatedCard(
      delayMs: 100,
      child: Column(
        children: [
          _SettingsTile(
            icon: Icons.light_mode_rounded,
            iconGradient: AppTheme.warmGradient,
            title: '主題模式',
            subtitle: _getThemeModeText(themeMode),
            trailing: _buildThemeSelector(context, ref, themeMode),
          ),
          Divider(color: isDark ? Colors.grey[800] : Colors.grey[200]),
          _SettingsTile(
            icon: Icons.dark_mode_rounded,
            iconGradient: AppTheme.secondaryGradient,
            title: '深色模式',
            subtitle: '減少眼睛疲勞',
            trailing: Switch(
              value: themeMode == ThemeMode.dark,
              onChanged: (value) {
                ref.read(themeModeProvider.notifier).setThemeMode(
                  value ? ThemeMode.dark : ThemeMode.light,
                );
              },
              activeTrackColor: AppTheme.primaryColor,
              activeThumbColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildThemeSelector(
    BuildContext context,
    WidgetRef ref,
    ThemeMode themeMode,
  ) {
    return PopupMenuButton<ThemeMode>(
      initialValue: themeMode,
      onSelected: (mode) {
        ref.read(themeModeProvider.notifier).setThemeMode(mode);
      },
      itemBuilder: (context) => [
        const PopupMenuItem(
          value: ThemeMode.system,
          child: Row(
            children: [
              Icon(Icons.settings_suggest_rounded, size: 20),
              SizedBox(width: 12),
              Text('跟隨系統'),
            ],
          ),
        ),
        const PopupMenuItem(
          value: ThemeMode.light,
          child: Row(
            children: [
              Icon(Icons.light_mode_rounded, size: 20),
              SizedBox(width: 12),
              Text('淺色模式'),
            ],
          ),
        ),
        const PopupMenuItem(
          value: ThemeMode.dark,
          child: Row(
            children: [
              Icon(Icons.dark_mode_rounded, size: 20),
              SizedBox(width: 12),
              Text('深色模式'),
            ],
          ),
        ),
      ],
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: AppTheme.primaryColor.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _getThemeModeText(themeMode),
              style: TextStyle(
                color: AppTheme.primaryColor,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(width: 4),
            Icon(
              Icons.arrow_drop_down_rounded,
              color: AppTheme.primaryColor,
            ),
          ],
        ),
      ),
    );
  }

  String _getThemeModeText(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.system:
        return '跟隨系統';
      case ThemeMode.light:
        return '淺色模式';
      case ThemeMode.dark:
        return '深色模式';
    }
  }

  Widget _buildPurchaseCard(
    BuildContext context,
    WidgetRef ref,
    bool isDark,
  ) {
    final adFreeStatusAsync = ref.watch(adFreeStatusProvider);

    return AnimatedCard(
      delayMs: 100,
      child: Column(
        children: [
          adFreeStatusAsync.when(
            data: (status) {
              if (status?.isAdFree == true) {
                return _SettingsTile(
                  icon: Icons.check_circle_rounded,
                  iconGradient: AppTheme.secondaryGradient,
                  title: '已去廣告',
                  subtitle: '感謝您的支持！',
                );
              }
              return _SettingsTile(
                icon: Icons.block_rounded,
                iconGradient: AppTheme.warmGradient,
                title: '永久去廣告',
                subtitle: '一次購買，永久移除所有廣告',
                onTap: () => RemoveAdsDialog.show(context),
              );
            },
            loading: () => _SettingsTile(
              icon: Icons.block_rounded,
              iconGradient: AppTheme.warmGradient,
              title: '永久去廣告',
              subtitle: '載入中...',
            ),
            error: (_, __) => _SettingsTile(
              icon: Icons.block_rounded,
              iconGradient: AppTheme.warmGradient,
              title: '永久去廣告',
              subtitle: '一次購買，永久移除所有廣告',
              onTap: () => RemoveAdsDialog.show(context),
            ),
          ),
          Divider(color: isDark ? Colors.grey[800] : Colors.grey[200]),
          _SettingsTile(
            icon: Icons.workspace_premium_rounded,
            iconGradient: AppTheme.warmGradient,
            title: '旅程進階版',
            subtitle: '解鎖智慧掃描、無限成員等進階功能',
            onTap: () => _showTripPremiumInfo(context),
          ),
          Divider(color: isDark ? Colors.grey[800] : Colors.grey[200]),
          _SettingsTile(
            icon: Icons.restore_rounded,
            iconGradient: AppTheme.primaryGradient,
            title: '恢復購買',
            subtitle: '恢復之前購買的項目',
            onTap: () => _restorePurchases(context, ref),
          ),
        ],
      ),
    );
  }

  Future<void> _restorePurchases(BuildContext context, WidgetRef ref) async {
    final purchaseService = ref.read(purchaseServiceProvider);

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Row(
          children: [
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Colors.white,
              ),
            ),
            SizedBox(width: 12),
            Text('正在恢復購買...'),
          ],
        ),
        duration: Duration(seconds: 2),
      ),
    );

    await purchaseService.restorePurchases();

    // 刷新狀態
    refreshAdFreeStatus(ref);

    if (context.mounted) {
      ErrorHandler.showSuccessSnackBar(context, '恢復購買完成');
    }
  }

  void _showTripPremiumInfo(BuildContext context) {
    PremiumComparisonSheet.show(context);
  }

  Widget _buildDataManagementCard(
    BuildContext context,
    WidgetRef ref,
    bool isDark,
  ) {
    final cacheInfoAsync = ref.watch(cacheInfoProvider);

    return AnimatedCard(
      delayMs: 200,
      child: Column(
        children: [
          _SettingsTile(
            icon: Icons.cached_rounded,
            iconGradient: AppTheme.secondaryGradient,
            title: '清除快取',
            subtitle: cacheInfoAsync.when(
              data: (info) => '目前快取：${info.formattedSize}',
              loading: () => '計算中...',
              error: (_, __) => '清除暫存資料以釋放空間',
            ),
            onTap: () => _showClearCacheDialog(context, ref),
          ),
          Divider(color: isDark ? Colors.grey[800] : Colors.grey[200]),
          _SettingsTile(
            icon: Icons.download_rounded,
            iconGradient: AppTheme.primaryGradient,
            title: '匯出資料',
            subtitle: '將你的旅程資料匯出為檔案',
            onTap: () => _showExportDialog(context),
          ),
          Divider(color: isDark ? Colors.grey[800] : Colors.grey[200]),
          _SettingsTile(
            icon: Icons.delete_forever_rounded,
            iconGradient: AppTheme.dangerGradient,
            title: '刪除帳號',
            subtitle: '永久刪除您的帳號和所有資料',
            onTap: () => _showDeleteAccountDialog(context, ref),
          ),
        ],
      ),
    );
  }

  Widget _buildAboutCard(
    BuildContext context,
    bool isDark,
  ) {
    return AnimatedCard(
      delayMs: 300,
      child: Column(
        children: [
          _SettingsTile(
            icon: Icons.info_outline_rounded,
            iconGradient: AppTheme.primaryGradient,
            title: 'App 版本',
            subtitle: appVersion,
          ),
          Divider(color: isDark ? Colors.grey[800] : Colors.grey[200]),
          _SettingsTile(
            icon: Icons.article_rounded,
            iconGradient: AppTheme.secondaryGradient,
            title: '使用條款',
            subtitle: '查看服務條款',
            onTap: () => _showTermsDialog(context),
          ),
          Divider(color: isDark ? Colors.grey[800] : Colors.grey[200]),
          _SettingsTile(
            icon: Icons.privacy_tip_rounded,
            iconGradient: AppTheme.warmGradient,
            title: '隱私權政策',
            subtitle: '了解我們如何保護你的資料',
            onTap: () => _showPrivacyDialog(context),
          ),
        ],
      ),
    );
  }

  Widget _buildLogoutButton(
    BuildContext context,
    WidgetRef ref,
    bool isDark,
  ) {
    return GradientButton(
      label: '登出',
      icon: Icons.logout_rounded,
      gradient: AppTheme.dangerGradient,
      onPressed: () => _showLogoutDialog(context, ref),
    )
        .animate(delay: 400.ms)
        .fadeIn(duration: 400.ms)
        .slideY(begin: 0.2, end: 0);
  }

  void _showEditProfileDialog(
    BuildContext context,
    WidgetRef ref,
    String currentName,
  ) {
    final controller = TextEditingController(text: currentName);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('編輯名稱'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: '顯示名稱',
            hintText: '請輸入你的名稱',
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              '取消',
              style: TextStyle(color: isDark ? Colors.grey[400] : Colors.grey[600]),
            ),
          ),
          FilledButton(
            onPressed: () async {
              final newName = controller.text.trim();
              if (newName.isNotEmpty) {
                final authStorage = ref.read(authStorageProvider);
                final userId = await authStorage.getUserId();
                if (userId != null) {
                  await authStorage.saveUserInfo(
                    userId: userId,
                    userName: newName,
                  );
                  ref.invalidate(userInfoProvider);
                }
                if (context.mounted) {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: const Text('名稱已更新'),
                      backgroundColor: AppTheme.primaryColor,
                    ),
                  );
                }
              }
            },
            style: FilledButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
            ),
            child: const Text('儲存'),
          ),
        ],
      ),
    ).then((_) => controller.dispose());
  }

  void _showClearCacheDialog(BuildContext context, WidgetRef ref) async {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cacheService = ref.read(cacheServiceProvider);

    // 先取得快取大小
    final cacheInfo = await cacheService.getCacheInfo();

    if (!context.mounted) return;

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('清除快取'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('確定要清除所有暫存資料嗎？這不會影響你的帳號資料。'),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.grey.withValues(alpha: 0.1)
                    : Colors.grey.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.folder_rounded,
                    color: AppTheme.primaryColor,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '目前快取大小：${cacheInfo.formattedSize}',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text(
              '取消',
              style: TextStyle(color: isDark ? Colors.grey[400] : Colors.grey[600]),
            ),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.pop(dialogContext);

              // 顯示清除中提示
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Row(
                      children: [
                        SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        ),
                        SizedBox(width: 12),
                        Text('正在清除快取...'),
                      ],
                    ),
                    duration: Duration(seconds: 1),
                  ),
                );
              }

              // 執行清除
              final success = await cacheService.clearCache();

              // 重新整理快取大小
              ref.invalidate(cacheInfoProvider);

              if (context.mounted) {
                if (success) {
                  ErrorHandler.showSuccessSnackBar(context, '快取已清除');
                } else {
                  ErrorHandler.showErrorSnackBar(context, '清除快取時發生錯誤');
                }
              }
            },
            style: FilledButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
            ),
            child: const Text('清除'),
          ),
        ],
      ),
    );
  }

  void _showExportDialog(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('匯出功能開發中...')),
    );
  }

  void _showTermsDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('使用條款'),
        content: const SingleChildScrollView(
          child: Text(
            '歡迎使用 TripLedger！\n\n'
            '使用本應用程式即表示您同意以下條款：\n\n'
            '1. 本應用程式僅供個人使用，用於追蹤旅行中的共同支出。\n\n'
            '2. 您對您帳號下的所有活動負責。\n\n'
            '3. 我們保留在必要時修改這些條款的權利。\n\n'
            '4. 本應用程式按「現狀」提供，不作任何明示或暗示的保證。',
          ),
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.pop(context),
            style: FilledButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
            ),
            child: const Text('確定'),
          ),
        ],
      ),
    );
  }

  void _showPrivacyDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('隱私權政策'),
        content: const SingleChildScrollView(
          child: Text(
            'TripLedger 重視您的隱私。\n\n'
            '我們收集的資料：\n'
            '• 您提供的帳號資訊\n'
            '• 旅程和帳單資料\n\n'
            '我們如何使用您的資料：\n'
            '• 提供和改進服務\n'
            '• 讓您與旅伴分享帳單\n\n'
            '資料保護：\n'
            '• 所有資料都經過加密傳輸\n'
            '• 我們不會將您的資料出售給第三方\n\n'
            '如有任何問題，請聯繫我們。',
          ),
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.pop(context),
            style: FilledButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
            ),
            child: const Text('確定'),
          ),
        ],
      ),
    );
  }

  void _showDeleteAccountDialog(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Row(
          children: [
            Icon(
              Icons.warning_rounded,
              color: Colors.red[600],
              size: 28,
            ),
            const SizedBox(width: 12),
            const Text('刪除帳號'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '您確定要刪除帳號嗎？此操作無法復原。',
              style: TextStyle(fontSize: 15),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '刪除後將會：',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.red,
                    ),
                  ),
                  SizedBox(height: 8),
                  Text('• 永久刪除您的帳號資料'),
                  Text('• 從所有旅程中移除您的成員身份'),
                  Text('• 保留您參與的財務記錄（匿名化）'),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text(
              '取消',
              style: TextStyle(color: isDark ? Colors.grey[400] : Colors.grey[600]),
            ),
          ),
          FilledButton(
            onPressed: () => _confirmDeleteAccount(context, ref, dialogContext),
            style: FilledButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            child: const Text('確認刪除'),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmDeleteAccount(
    BuildContext context,
    WidgetRef ref,
    BuildContext dialogContext,
  ) async {
    // 二次確認
    final confirmed = await showDialog<bool>(
      context: dialogContext,
      builder: (ctx) => AlertDialog(
        title: const Text('最後確認'),
        content: const Text('請再次確認您要永久刪除帳號。此操作無法復原。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('確認刪除'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    Navigator.pop(dialogContext);

    // 先取得 router 參考，避免 context 失效
    final router = GoRouter.of(context);

    // 顯示處理中
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              ),
              SizedBox(width: 12),
              Text('正在刪除帳號...'),
            ],
          ),
          duration: Duration(seconds: 10),
        ),
      );
    }

    try {
      final authRepo = ref.read(authRepositoryProvider);
      final success = await authRepo.deleteAccount();

      if (success && context.mounted) {
        // 清除快取
        ref.invalidate(userInfoProvider);
        ref.invalidate(adFreeStatusProvider);
        ref.invalidate(purchaseHistoryProvider);
        ref.invalidate(cacheInfoProvider);

        ScaffoldMessenger.of(context).hideCurrentSnackBar();

        // 導航到登入頁面
        router.go('/login');

        // 顯示成功訊息
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('帳號已成功刪除'),
              backgroundColor: Colors.green,
            ),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ErrorHandler.showErrorSnackBar(context, '刪除帳號失敗: $e');
      }
    }
  }

  void _showLogoutDialog(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('確認登出'),
        content: const Text('確定要登出嗎？'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text(
              '取消',
              style: TextStyle(color: isDark ? Colors.grey[400] : Colors.grey[600]),
            ),
          ),
          FilledButton(
            onPressed: () async {
              // 先取得 router 參考，避免 context 失效
              final router = GoRouter.of(context);
              Navigator.pop(dialogContext);

              // 執行登出
              await ref.read(authRepositoryProvider).logout();

              // 清除所有 Riverpod 快取，確保下一個用戶登入時不會看到舊資料
              ref.invalidate(userInfoProvider);
              ref.invalidate(adFreeStatusProvider);
              ref.invalidate(purchaseHistoryProvider);
              ref.invalidate(cacheInfoProvider);

              router.go('/login');
            },
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFFEF4444),
            ),
            child: const Text('登出'),
          ),
        ],
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final LinearGradient iconGradient;
  final String title;
  final String subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;

  const _SettingsTile({
    required this.icon,
    required this.iconGradient,
    required this.title,
    required this.subtitle,
    this.trailing,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Row(
          children: [
            GradientIconBox(
              icon: icon,
              gradient: iconGradient,
              size: 40,
              iconSize: 20,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 13,
                      color: Colors.grey[500],
                    ),
                  ),
                ],
              ),
            ),
            if (trailing != null) trailing!,
            if (onTap != null && trailing == null)
              Icon(
                Icons.chevron_right_rounded,
                color: Colors.grey[400],
              ),
          ],
        ),
      ),
    );
  }
}

