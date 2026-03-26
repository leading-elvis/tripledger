import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../data/trips_repository.dart';
import '../../../shared/models/trip_model.dart';
import '../../../core/config/theme.dart';
import '../../../shared/widgets/animated_widgets.dart';

class MemberManagementPage extends ConsumerStatefulWidget {
  final String tripId;

  const MemberManagementPage({super.key, required this.tripId});

  @override
  ConsumerState<MemberManagementPage> createState() => _MemberManagementPageState();
}

class _MemberManagementPageState extends ConsumerState<MemberManagementPage> {
  TripDetail? _trip;
  bool _isLoading = true;
  bool _hasChanges = false; // 追蹤是否有資料變更

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final trip = await ref.read(tripsRepositoryProvider).getTripDetail(widget.tripId);
      setState(() {
        _trip = trip;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('載入失敗: $e'),
            backgroundColor: AppTheme.categoryColors['FOOD'],
          ),
        );
      }
    }
  }

  void _copyInviteCode() {
    if (_trip == null) return;
    Clipboard.setData(ClipboardData(text: _trip!.inviteCode));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle_rounded, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            const Text('邀請碼已複製'),
          ],
        ),
        backgroundColor: AppTheme.categoryColors['TRANSPORT'],
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showEditNicknameDialog(TripMember member) {
    final controller = TextEditingController(text: member.nickname ?? member.userName);
    bool isLoading = false;

    showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              GradientIconBox(
                icon: Icons.edit_rounded,
                gradient: AppTheme.primaryGradient,
                size: 40,
                iconSize: 20,
              ),
              const SizedBox(width: 12),
              const Text('編輯暱稱'),
            ],
          ),
          content: TextField(
            controller: controller,
            decoration: InputDecoration(
              labelText: '暱稱',
              hintText: '輸入成員在此旅程的暱稱',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: AppTheme.primaryColor, width: 2),
              ),
            ),
            autofocus: true,
            enabled: !isLoading,
          ),
          actions: [
            TextButton(
              onPressed: isLoading ? null : () => Navigator.pop(context),
              child: Text(
                '取消',
                style: TextStyle(color: Colors.grey[600]),
              ),
            ),
            isLoading
                ? const SizedBox(
                    width: 80,
                    height: 44,
                    child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                  )
                : GradientButton(
                    label: '儲存',
                    gradient: AppTheme.primaryGradient,
                    height: 44,
                    width: 80,
                    onPressed: () async {
                      final newNickname = controller.text.trim();
                      if (newNickname.isEmpty) return;

                      setDialogState(() => isLoading = true);
                      try {
                        await ref.read(tripsRepositoryProvider).updateMemberNickname(
                          tripId: widget.tripId,
                          memberId: member.id,
                          nickname: newNickname,
                        );
                        if (dialogContext.mounted) Navigator.pop(dialogContext);
                        if (mounted) {
                          _hasChanges = true;
                          ScaffoldMessenger.of(this.context).showSnackBar(
                            SnackBar(
                              content: const Text('暱稱更新成功'),
                              backgroundColor: AppTheme.primaryColor,
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                          _loadData();
                        }
                      } catch (e) {
                        setDialogState(() => isLoading = false);
                        if (mounted) {
                          ScaffoldMessenger.of(this.context).showSnackBar(
                            SnackBar(
                              content: Text('更新失敗: $e'),
                              backgroundColor: AppTheme.categoryColors['FOOD'],
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        }
                      }
                    },
                  ),
          ],
        ),
      ),
    ).then((_) => controller.dispose());
  }

  void _showChangeRoleDialog(TripMember member) {
    final currentRole = member.role;
    bool isLoading = false;

    Future<void> updateRole(String newRole, BuildContext dialogContext, void Function(void Function()) setDialogState) async {
      if (newRole == currentRole) {
        Navigator.pop(dialogContext);
        return;
      }

      setDialogState(() => isLoading = true);
      try {
        await ref.read(tripsRepositoryProvider).updateMemberRole(
          tripId: widget.tripId,
          memberId: member.id,
          role: newRole,
        );
        if (dialogContext.mounted) Navigator.pop(dialogContext);
        if (mounted) {
          _hasChanges = true;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('權限更新成功'),
              backgroundColor: AppTheme.primaryColor,
              behavior: SnackBarBehavior.floating,
            ),
          );
          _loadData();
        }
      } catch (e) {
        setDialogState(() => isLoading = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('更新失敗: $e'),
              backgroundColor: AppTheme.categoryColors['FOOD'],
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    }

    showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              GradientIconBox(
                icon: Icons.admin_panel_settings_rounded,
                gradient: AppTheme.secondaryGradient,
                size: 40,
                iconSize: 20,
              ),
              const SizedBox(width: 12),
              const Text('變更權限'),
            ],
          ),
          content: isLoading
              ? const Padding(
                  padding: EdgeInsets.all(20),
                  child: Center(child: CircularProgressIndicator()),
                )
              : Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '選擇 ${member.nickname ?? member.userName} 的新權限',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                    const SizedBox(height: 16),
                    _RoleOption(
                      role: 'ADMIN',
                      label: '管理員',
                      description: '可以新增/編輯帳單、管理成員',
                      icon: Icons.shield_rounded,
                      gradient: AppTheme.secondaryGradient,
                      isSelected: currentRole == 'ADMIN',
                      onTap: () => updateRole('ADMIN', dialogContext, setDialogState),
                    ),
                    const SizedBox(height: 12),
                    _RoleOption(
                      role: 'MEMBER',
                      label: '一般成員',
                      description: '可以查看帳單、新增自己的消費',
                      icon: Icons.person_rounded,
                      gradient: AppTheme.warmGradient,
                      isSelected: currentRole == 'MEMBER',
                      onTap: () => updateRole('MEMBER', dialogContext, setDialogState),
                    ),
                  ],
                ),
        ),
      ),
    );
  }

  // ============================================
  // 虛擬人員相關操作
  // ============================================

  void _showAddVirtualMemberDialog() {
    final controller = TextEditingController();
    bool isLoading = false;

    showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              GradientIconBox(
                icon: Icons.person_add_alt_1_rounded,
                gradient: AppTheme.warmGradient,
                size: 40,
                iconSize: 20,
              ),
              const SizedBox(width: 12),
              const Text('新增虛擬人員'),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '為不使用軟體的旅伴建立虛擬帳號，即可參與分帳',
                style: TextStyle(color: Colors.grey[600], fontSize: 13),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: controller,
                decoration: InputDecoration(
                  labelText: '名稱',
                  hintText: '輸入虛擬人員的名稱',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: AppTheme.primaryColor, width: 2),
                  ),
                ),
                autofocus: true,
                enabled: !isLoading,
                maxLength: 50,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: isLoading ? null : () => Navigator.pop(context),
              child: Text('取消', style: TextStyle(color: Colors.grey[600])),
            ),
            isLoading
                ? const SizedBox(
                    width: 80,
                    height: 44,
                    child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                  )
                : GradientButton(
                    label: '新增',
                    gradient: AppTheme.warmGradient,
                    height: 44,
                    width: 80,
                    onPressed: () async {
                      final name = controller.text.trim();
                      if (name.isEmpty) return;

                      setDialogState(() => isLoading = true);
                      try {
                        await ref.read(tripsRepositoryProvider).createVirtualMember(
                          tripId: widget.tripId,
                          name: name,
                        );
                        if (dialogContext.mounted) Navigator.pop(dialogContext);
                        if (mounted) {
                          _hasChanges = true;
                          ScaffoldMessenger.of(this.context).showSnackBar(
                            SnackBar(
                              content: Text('已新增虛擬人員「$name」'),
                              backgroundColor: AppTheme.primaryColor,
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                          _loadData();
                        }
                      } catch (e) {
                        setDialogState(() => isLoading = false);
                        if (mounted) {
                          ScaffoldMessenger.of(this.context).showSnackBar(
                            SnackBar(
                              content: Text('新增失敗: $e'),
                              backgroundColor: AppTheme.categoryColors['FOOD'],
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        }
                      }
                    },
                  ),
          ],
        ),
      ),
    ).then((_) => controller.dispose());
  }

  void _showEditVirtualMemberDialog(VirtualMember vm) {
    final controller = TextEditingController(text: vm.name);
    bool isLoading = false;

    showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              GradientIconBox(
                icon: Icons.edit_rounded,
                gradient: AppTheme.warmGradient,
                size: 40,
                iconSize: 20,
              ),
              const SizedBox(width: 12),
              const Text('編輯虛擬人員'),
            ],
          ),
          content: TextField(
            controller: controller,
            decoration: InputDecoration(
              labelText: '名稱',
              hintText: '輸入新名稱',
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: AppTheme.primaryColor, width: 2),
              ),
            ),
            autofocus: true,
            enabled: !isLoading,
            maxLength: 50,
          ),
          actions: [
            TextButton(
              onPressed: isLoading ? null : () => Navigator.pop(context),
              child: Text('取消', style: TextStyle(color: Colors.grey[600])),
            ),
            isLoading
                ? const SizedBox(
                    width: 80,
                    height: 44,
                    child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                  )
                : GradientButton(
                    label: '儲存',
                    gradient: AppTheme.warmGradient,
                    height: 44,
                    width: 80,
                    onPressed: () async {
                      final name = controller.text.trim();
                      if (name.isEmpty) return;

                      setDialogState(() => isLoading = true);
                      try {
                        await ref.read(tripsRepositoryProvider).updateVirtualMember(
                          tripId: widget.tripId,
                          vmId: vm.id,
                          name: name,
                        );
                        if (dialogContext.mounted) Navigator.pop(dialogContext);
                        if (mounted) {
                          _hasChanges = true;
                          ScaffoldMessenger.of(this.context).showSnackBar(
                            SnackBar(
                              content: const Text('名稱更新成功'),
                              backgroundColor: AppTheme.primaryColor,
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                          _loadData();
                        }
                      } catch (e) {
                        setDialogState(() => isLoading = false);
                        if (mounted) {
                          ScaffoldMessenger.of(this.context).showSnackBar(
                            SnackBar(
                              content: Text('更新失敗: $e'),
                              backgroundColor: AppTheme.categoryColors['FOOD'],
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        }
                      }
                    },
                  ),
          ],
        ),
      ),
    ).then((_) => controller.dispose());
  }

  void _showDeleteVirtualMemberDialog(VirtualMember vm) {
    bool isLoading = false;

    showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              GradientIconBox(
                icon: Icons.person_remove_rounded,
                gradient: AppTheme.dangerGradient,
                size: 40,
                iconSize: 20,
              ),
              const SizedBox(width: 12),
              const Text('刪除虛擬人員'),
            ],
          ),
          content: Text(
            '確定要刪除虛擬人員「${vm.name}」嗎？\n\n相關的帳單和結算記錄仍會保留。',
            style: const TextStyle(height: 1.5),
          ),
          actions: [
            TextButton(
              onPressed: isLoading ? null : () => Navigator.pop(context),
              child: Text('取消', style: TextStyle(color: Colors.grey[600])),
            ),
            isLoading
                ? const SizedBox(
                    width: 80,
                    height: 44,
                    child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                  )
                : GradientButton(
                    label: '刪除',
                    gradient: AppTheme.dangerGradient,
                    height: 44,
                    width: 80,
                    onPressed: () async {
                      setDialogState(() => isLoading = true);
                      try {
                        await ref.read(tripsRepositoryProvider).deleteVirtualMember(
                          tripId: widget.tripId,
                          vmId: vm.id,
                        );
                        if (dialogContext.mounted) Navigator.pop(dialogContext);
                        if (mounted) {
                          _hasChanges = true;
                          ScaffoldMessenger.of(this.context).showSnackBar(
                            SnackBar(
                              content: Text('已刪除虛擬人員「${vm.name}」'),
                              backgroundColor: AppTheme.primaryColor,
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                          _loadData();
                        }
                      } catch (e) {
                        setDialogState(() => isLoading = false);
                        if (mounted) {
                          ScaffoldMessenger.of(this.context).showSnackBar(
                            SnackBar(
                              content: Text('刪除失敗: $e'),
                              backgroundColor: AppTheme.categoryColors['FOOD'],
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        }
                      }
                    },
                  ),
          ],
        ),
      ),
    );
  }

  void _showMergeVirtualMemberDialog(VirtualMember vm) {
    bool isLoading = false;

    showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              GradientIconBox(
                icon: Icons.merge_rounded,
                gradient: AppTheme.successGradient,
                size: 40,
                iconSize: 20,
              ),
              const SizedBox(width: 12),
              const Expanded(child: Text('合併帳號')),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '將「${vm.name}」的所有帳單和結算記錄合併到你的帳號。',
                style: const TextStyle(height: 1.5),
              ),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.amber.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.amber.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline_rounded, color: Colors.amber[700], size: 20),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        '此操作無法復原',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: isLoading ? null : () => Navigator.pop(context),
              child: Text('取消', style: TextStyle(color: Colors.grey[600])),
            ),
            isLoading
                ? const SizedBox(
                    width: 80,
                    height: 44,
                    child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                  )
                : GradientButton(
                    label: '合併',
                    gradient: AppTheme.successGradient,
                    height: 44,
                    width: 80,
                    onPressed: () async {
                      setDialogState(() => isLoading = true);
                      try {
                        await ref.read(tripsRepositoryProvider).mergeVirtualMember(
                          tripId: widget.tripId,
                          vmId: vm.id,
                        );
                        if (dialogContext.mounted) Navigator.pop(dialogContext);
                        if (mounted) {
                          _hasChanges = true;
                          ScaffoldMessenger.of(this.context).showSnackBar(
                            SnackBar(
                              content: Text('已將「${vm.name}」的資料合併到你的帳號'),
                              backgroundColor: AppTheme.primaryColor,
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                          _loadData();
                        }
                      } catch (e) {
                        setDialogState(() => isLoading = false);
                        if (mounted) {
                          ScaffoldMessenger.of(this.context).showSnackBar(
                            SnackBar(
                              content: Text('合併失敗: $e'),
                              backgroundColor: AppTheme.categoryColors['FOOD'],
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        }
                      }
                    },
                  ),
          ],
        ),
      ),
    );
  }

  void _showRemoveMemberDialog(TripMember member) {
    bool isLoading = false;

    showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              GradientIconBox(
                icon: Icons.person_remove_rounded,
                gradient: AppTheme.dangerGradient,
                size: 40,
                iconSize: 20,
              ),
              const SizedBox(width: 12),
              const Text('移除成員'),
            ],
          ),
          content: Text(
            '確定要將「${member.nickname ?? member.userName}」從此旅程中移除嗎？\n\n此操作無法復原。',
            style: const TextStyle(height: 1.5),
          ),
          actions: [
            TextButton(
              onPressed: isLoading ? null : () => Navigator.pop(context),
              child: Text(
                '取消',
                style: TextStyle(color: Colors.grey[600]),
              ),
            ),
            isLoading
                ? const SizedBox(
                    width: 80,
                    height: 44,
                    child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                  )
                : GradientButton(
                    label: '移除',
                    gradient: AppTheme.dangerGradient,
                    height: 44,
                    width: 80,
                    onPressed: () async {
                      setDialogState(() => isLoading = true);
                      try {
                        await ref.read(tripsRepositoryProvider).removeMember(
                          tripId: widget.tripId,
                          memberId: member.id,
                        );
                        if (dialogContext.mounted) Navigator.pop(dialogContext);
                        if (mounted) {
                          _hasChanges = true;
                          ScaffoldMessenger.of(this.context).showSnackBar(
                            SnackBar(
                              content: Text('已移除 ${member.nickname ?? member.userName}'),
                              backgroundColor: AppTheme.primaryColor,
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                          _loadData();
                        }
                      } catch (e) {
                        setDialogState(() => isLoading = false);
                        if (mounted) {
                          ScaffoldMessenger.of(this.context).showSnackBar(
                            SnackBar(
                              content: Text('移除失敗: $e'),
                              backgroundColor: AppTheme.categoryColors['FOOD'],
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        }
                      }
                    },
                  ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        context.pop(_hasChanges);
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('成員管理'),
          backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.pop(_hasChanges),
          ),
        ),
        body: _isLoading
            ? _buildLoadingState()
            : _trip == null
                ? _buildErrorState()
                : _buildContent(isDark),
      ),
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const CircularProgressIndicator()
              .animate(onPlay: (c) => c.repeat())
              .rotate(duration: 1000.ms),
          const SizedBox(height: 16),
          Text('載入中...', style: TextStyle(color: Colors.grey[500])),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return EmptyStateWidget(
      icon: Icons.error_outline_rounded,
      title: '無法載入成員資訊',
      subtitle: '請檢查網路連線後重試',
      action: GradientButton(
        label: '返回',
        icon: Icons.arrow_back_rounded,
        gradient: AppTheme.primaryGradient,
        onPressed: () => context.pop(_hasChanges),
        width: 120,
      ),
    );
  }

  Widget _buildContent(bool isDark) {
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // 邀請碼卡片
          _buildInviteCodeCard(isDark),
          const SizedBox(height: 24),

          // 成員列表標題
          Row(
            children: [
              Icon(Icons.people_rounded, size: 20, color: AppTheme.primaryColor),
              const SizedBox(width: 8),
              Text(
                '成員列表',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  letterSpacing: -0.3,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${_trip!.members.length} 人',
                  style: TextStyle(
                    color: AppTheme.primaryColor,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ).animate().fadeIn(duration: 400.ms).slideX(begin: -0.1, end: 0),
          const SizedBox(height: 16),

          // 成員列表
          ..._trip!.members.asMap().entries.map((entry) {
            final index = entry.key;
            final member = entry.value;
            return _MemberCard(
              member: member,
              index: index,
              onEditNickname: () => _showEditNicknameDialog(member),
              onChangeRole: member.role != 'OWNER' ? () => _showChangeRoleDialog(member) : null,
              onRemove: member.role != 'OWNER' ? () => _showRemoveMemberDialog(member) : null,
            );
          }),

          const SizedBox(height: 24),

          // 虛擬人員區塊
          _buildVirtualMembersSection(isDark),
        ],
      ),
    );
  }

  Widget _buildVirtualMembersSection(bool isDark) {
    final virtualMembers = _trip!.virtualMembers;
    final isPremium = _trip!.isPremium;

    return Column(
      children: [
        // 標題列
        Row(
          children: [
            Icon(Icons.person_outline_rounded, size: 20, color: Colors.orange[600]),
            const SizedBox(width: 8),
            Text(
              '虛擬人員',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                letterSpacing: -0.3,
              ),
            ),
            const Spacer(),
            if (virtualMembers.isNotEmpty)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.orange.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${virtualMembers.length} 人',
                  style: TextStyle(
                    color: Colors.orange[600],
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
              ),
          ],
        ).animate().fadeIn(duration: 400.ms).slideX(begin: -0.1, end: 0),
        const SizedBox(height: 12),

        // Premium 到期提示
        if (!isPremium && virtualMembers.isNotEmpty)
          Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.amber.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.amber.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                Icon(Icons.info_outline_rounded, color: Colors.amber[700], size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    '進階功能已到期，虛擬人員僅供檢視',
                    style: TextStyle(
                      color: Colors.amber[800],
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ).animate().fadeIn(duration: 400.ms),

        // 新增按鈕
        if (isPremium)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: InkWell(
              onTap: _showAddVirtualMemberDialog,
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: Colors.orange.withValues(alpha: 0.3),
                    width: 1.5,
                    strokeAlign: BorderSide.strokeAlignInside,
                  ),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.person_add_alt_1_rounded, color: Colors.orange[600], size: 20),
                    const SizedBox(width: 8),
                    Text(
                      '新增虛擬人員',
                      style: TextStyle(
                        color: Colors.orange[600],
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ).animate().fadeIn(duration: 400.ms),

        // 空狀態
        if (virtualMembers.isEmpty && isPremium)
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.grey[50],
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                Icon(Icons.person_outline_rounded, size: 40, color: Colors.grey[400]),
                const SizedBox(height: 8),
                Text(
                  '尚無虛擬人員',
                  style: TextStyle(color: Colors.grey[500], fontSize: 14),
                ),
                const SizedBox(height: 4),
                Text(
                  '為不使用軟體的旅伴建立虛擬帳號',
                  style: TextStyle(color: Colors.grey[400], fontSize: 12),
                ),
              ],
            ),
          ).animate().fadeIn(duration: 400.ms),

        // 虛擬人員列表
        ...virtualMembers.asMap().entries.map((entry) {
          final index = entry.key;
          final vm = entry.value;
          return _VirtualMemberCard(
            vm: vm,
            index: index,
            isPremium: isPremium,
            onEdit: isPremium ? () => _showEditVirtualMemberDialog(vm) : null,
            onDelete: isPremium ? () => _showDeleteVirtualMemberDialog(vm) : null,
            onMerge: () => _showMergeVirtualMemberDialog(vm),
          );
        }),
      ],
    );
  }

  Widget _buildInviteCodeCard(bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: AppTheme.primaryGradient,
        borderRadius: BorderRadius.circular(20),
        boxShadow: AppTheme.coloredShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Icon(
                  Icons.vpn_key_rounded,
                  color: Colors.white,
                  size: 24,
                ),
              ),
              const SizedBox(width: 14),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '邀請碼',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.8),
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _trip!.inviteCode,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 2,
                    ),
                  ),
                ],
              ),
              const Spacer(),
              IconButton(
                onPressed: _copyInviteCode,
                icon: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.copy_rounded,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            '分享此邀請碼給朋友，讓他們加入旅程',
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.9),
              fontSize: 13,
            ),
          ),
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 500.ms)
        .slideY(begin: -0.1, end: 0, duration: 500.ms);
  }
}

class _MemberCard extends StatelessWidget {
  final TripMember member;
  final int index;
  final VoidCallback onEditNickname;
  final VoidCallback? onChangeRole;
  final VoidCallback? onRemove;

  const _MemberCard({
    required this.member,
    required this.index,
    required this.onEditNickname,
    this.onChangeRole,
    this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    final gradients = [
      AppTheme.primaryGradient,
      AppTheme.secondaryGradient,
      AppTheme.warmGradient,
      AppTheme.successGradient,
    ];
    final gradient = gradients[index % gradients.length];

    return AnimatedCard(
      delayMs: 200 + index * 80,
      child: Row(
        children: [
          // 頭像
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              gradient: gradient,
              borderRadius: BorderRadius.circular(14),
            ),
            child: Center(
              child: Text(
                (member.nickname ?? member.userName)[0].toUpperCase(),
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 20,
                ),
              ),
            ),
          ),
          const SizedBox(width: 14),

          // 名稱和角色
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        member.nickname ?? member.userName,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (member.nickname != null) ...[
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text(
                          '(${member.userName})',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey[500],
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 6),
                _RoleBadge(role: member.role),
              ],
            ),
          ),

          // 操作選單
          PopupMenuButton<String>(
            icon: Icon(
              Icons.more_vert_rounded,
              color: Colors.grey[400],
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'nickname',
                child: Row(
                  children: [
                    Icon(Icons.edit_rounded, color: AppTheme.primaryColor, size: 20),
                    const SizedBox(width: 12),
                    const Text('編輯暱稱'),
                  ],
                ),
              ),
              if (onChangeRole != null)
                PopupMenuItem(
                  value: 'role',
                  child: Row(
                    children: [
                      Icon(Icons.admin_panel_settings_rounded, color: AppTheme.secondaryColor, size: 20),
                      const SizedBox(width: 12),
                      const Text('變更權限'),
                    ],
                  ),
                ),
              if (onRemove != null)
                PopupMenuItem(
                  value: 'remove',
                  child: Row(
                    children: [
                      Icon(Icons.person_remove_rounded, color: Colors.red[400], size: 20),
                      const SizedBox(width: 12),
                      Text('移除成員', style: TextStyle(color: Colors.red[400])),
                    ],
                  ),
                ),
            ],
            onSelected: (value) {
              switch (value) {
                case 'nickname':
                  onEditNickname();
                  break;
                case 'role':
                  onChangeRole?.call();
                  break;
                case 'remove':
                  onRemove?.call();
                  break;
              }
            },
          ),
        ],
      ),
    );
  }
}

class _RoleBadge extends StatelessWidget {
  final String role;

  const _RoleBadge({required this.role});

  @override
  Widget build(BuildContext context) {
    final (label, color, icon) = switch (role) {
      'OWNER' => ('房主', AppTheme.primaryColor, Icons.star_rounded),
      'ADMIN' => ('管理員', AppTheme.secondaryColor, Icons.shield_rounded),
      _ => ('成員', Colors.grey, Icons.person_rounded),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: color, size: 14),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _VirtualMemberCard extends StatelessWidget {
  final VirtualMember vm;
  final int index;
  final bool isPremium;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;
  final VoidCallback onMerge;

  const _VirtualMemberCard({
    required this.vm,
    required this.index,
    required this.isPremium,
    this.onEdit,
    this.onDelete,
    required this.onMerge,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedCard(
      delayMs: 200 + index * 80,
      child: Row(
        children: [
          // 虛線邊框頭像
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              border: Border.all(
                color: Colors.orange.withValues(alpha: 0.5),
                width: 2,
                strokeAlign: BorderSide.strokeAlignInside,
              ),
              borderRadius: BorderRadius.circular(14),
              color: Colors.orange.withValues(alpha: 0.05),
            ),
            child: Center(
              child: Icon(
                Icons.person_outline_rounded,
                color: Colors.orange[600],
                size: 24,
              ),
            ),
          ),
          const SizedBox(width: 14),

          // 名稱和標籤
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  vm.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.orange.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.person_outline_rounded, color: Colors.orange[600], size: 14),
                      const SizedBox(width: 4),
                      Text(
                        '虛擬人員',
                        style: TextStyle(
                          color: Colors.orange[600],
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // 操作選單
          PopupMenuButton<String>(
            icon: Icon(
              Icons.more_vert_rounded,
              color: Colors.grey[400],
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            itemBuilder: (context) => [
              if (onEdit != null)
                PopupMenuItem(
                  value: 'edit',
                  child: Row(
                    children: [
                      Icon(Icons.edit_rounded, color: Colors.orange[600], size: 20),
                      const SizedBox(width: 12),
                      const Text('編輯名稱'),
                    ],
                  ),
                ),
              PopupMenuItem(
                value: 'merge',
                child: Row(
                  children: [
                    Icon(Icons.merge_rounded, color: AppTheme.successGradient.colors.first, size: 20),
                    const SizedBox(width: 12),
                    const Text('合併到我的帳號'),
                  ],
                ),
              ),
              if (onDelete != null)
                PopupMenuItem(
                  value: 'delete',
                  child: Row(
                    children: [
                      Icon(Icons.delete_outline_rounded, color: Colors.red[400], size: 20),
                      const SizedBox(width: 12),
                      Text('刪除', style: TextStyle(color: Colors.red[400])),
                    ],
                  ),
                ),
            ],
            onSelected: (value) {
              switch (value) {
                case 'edit':
                  onEdit?.call();
                  break;
                case 'merge':
                  onMerge();
                  break;
                case 'delete':
                  onDelete?.call();
                  break;
              }
            },
          ),
        ],
      ),
    );
  }
}

class _RoleOption extends StatelessWidget {
  final String role;
  final String label;
  final String description;
  final IconData icon;
  final LinearGradient gradient;
  final bool isSelected;
  final VoidCallback onTap;

  const _RoleOption({
    required this.role,
    required this.label,
    required this.description,
    required this.icon,
    required this.gradient,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isSelected
                ? gradient.colors.first.withValues(alpha: 0.1)
                : (isDark ? const Color(0xFF1E293B) : Colors.grey[100]),
            borderRadius: BorderRadius.circular(16),
            border: isSelected
                ? Border.all(color: gradient.colors.first, width: 2)
                : null,
          ),
          child: Row(
            children: [
              GradientIconBox(
                icon: icon,
                gradient: gradient,
                size: 44,
                iconSize: 22,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      description,
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey[500],
                      ),
                    ),
                  ],
                ),
              ),
              if (isSelected)
                Icon(
                  Icons.check_circle_rounded,
                  color: gradient.colors.first,
                  size: 24,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
