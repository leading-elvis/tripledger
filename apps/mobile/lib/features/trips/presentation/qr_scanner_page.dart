import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../data/trips_repository.dart';
import '../../../core/config/theme.dart';
import '../../../shared/utils/error_handler.dart';

class QrScannerPage extends ConsumerStatefulWidget {
  const QrScannerPage({super.key});

  @override
  ConsumerState<QrScannerPage> createState() => _QrScannerPageState();
}

class _QrScannerPageState extends ConsumerState<QrScannerPage> {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.normal,
    facing: CameraFacing.back,
  );

  bool _isProcessing = false;
  bool _hasScanned = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _handleBarcode(BarcodeCapture capture) async {
    if (_isProcessing || _hasScanned) return;

    final barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;

    final code = barcodes.first.rawValue;
    if (code == null) return;

    // 檢查是否為有效的邀請碼格式
    String? inviteCode;
    if (code.startsWith('tripledger://join?code=')) {
      inviteCode = code.replaceFirst('tripledger://join?code=', '');
    } else if (code.length == 36 && code.contains('-')) {
      // UUID 格式
      inviteCode = code;
    }

    if (inviteCode == null) {
      _showError('無效的 QR Code');
      return;
    }

    setState(() {
      _isProcessing = true;
      _hasScanned = true;
    });

    try {
      final tripsRepo = ref.read(tripsRepositoryProvider);
      final trip = await tripsRepo.joinTrip(inviteCode);

      if (mounted) {
        _showSuccess('成功加入「${trip.name}」！');
        await Future.delayed(const Duration(milliseconds: 1500));
        if (mounted) {
          context.go('/trips/${trip.id}');
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isProcessing = false;
          _hasScanned = false;
        });
        // 檢查是否為成員數量限制錯誤
        final apiException = ErrorHandler.getApiException(e);
        if (apiException?.isMemberLimitReached == true) {
          _showMemberLimitDialog();
        } else {
          _showError('加入失敗: ${_parseError(e.toString())}');
        }
      }
    }
  }

  void _showMemberLimitDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        icon: Container(
          width: 60,
          height: 60,
          decoration: BoxDecoration(
            gradient: AppTheme.primaryGradient,
            borderRadius: BorderRadius.circular(16),
          ),
          child: const Icon(
            Icons.group_add_rounded,
            color: Colors.white,
            size: 30,
          ),
        ),
        title: const Text(
          '成員數量已達上限',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        content: const Text(
          '此旅程已達免費版成員上限（5 人）。\n\n請聯繫旅程管理員升級進階版，即可邀請更多成員加入！',
          textAlign: TextAlign.center,
          style: TextStyle(height: 1.5),
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.pop(context),
            style: FilledButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: const Text('了解'),
          ),
        ],
      ),
    );
  }

  String _parseError(String error) {
    if (error.contains('already a member') || error.contains('已經是')) {
      return '你已經是這個旅程的成員了';
    }
    if (error.contains('not found') || error.contains('無效')) {
      return '找不到此旅程';
    }
    return '請稍後再試';
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppTheme.categoryColors['FOOD'],
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showSuccess(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(child: Text(message)),
          ],
        ),
        backgroundColor: const Color(0xFF10B981),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white),
          onPressed: () => context.pop(),
        ),
        title: const Text(
          '掃描 QR Code',
          style: TextStyle(color: Colors.white),
        ),
        actions: [
          IconButton(
            icon: ValueListenableBuilder(
              valueListenable: _controller,
              builder: (context, state, child) {
                return Icon(
                  state.torchState == TorchState.on
                      ? Icons.flash_on
                      : Icons.flash_off,
                  color: Colors.white,
                );
              },
            ),
            onPressed: () => _controller.toggleTorch(),
          ),
        ],
      ),
      body: Stack(
        children: [
          // 相機預覽
          MobileScanner(
            controller: _controller,
            onDetect: _handleBarcode,
          ),

          // 掃描框
          Center(
            child: Container(
              width: 280,
              height: 280,
              decoration: BoxDecoration(
                border: Border.all(
                  color: _isProcessing
                      ? const Color(0xFF10B981)
                      : const Color(0xFF6366F1),
                  width: 3,
                ),
                borderRadius: BorderRadius.circular(24),
              ),
              child: _isProcessing
                  ? const Center(
                      child: CircularProgressIndicator(
                        color: Color(0xFF10B981),
                      ),
                    )
                  : null,
            ),
          ),

          // 四角裝飾
          Center(
            child: SizedBox(
              width: 280,
              height: 280,
              child: Stack(
                children: [
                  // 左上
                  Positioned(
                    top: 0,
                    left: 0,
                    child: _buildCorner(true, true),
                  ),
                  // 右上
                  Positioned(
                    top: 0,
                    right: 0,
                    child: _buildCorner(true, false),
                  ),
                  // 左下
                  Positioned(
                    bottom: 0,
                    left: 0,
                    child: _buildCorner(false, true),
                  ),
                  // 右下
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: _buildCorner(false, false),
                  ),
                ],
              ),
            ),
          ),

          // 底部提示
          Positioned(
            bottom: 100,
            left: 0,
            right: 0,
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.6),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Text(
                    _isProcessing ? '正在加入旅程...' : '將 QR Code 對準掃描框',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                TextButton.icon(
                  onPressed: () => _showManualInput(context),
                  icon: const Icon(
                    Icons.keyboard,
                    color: Colors.white70,
                    size: 20,
                  ),
                  label: const Text(
                    '手動輸入邀請碼',
                    style: TextStyle(color: Colors.white70),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCorner(bool isTop, bool isLeft) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        border: Border(
          top: isTop
              ? BorderSide(
                  color: _isProcessing
                      ? const Color(0xFF10B981)
                      : const Color(0xFF6366F1),
                  width: 4,
                )
              : BorderSide.none,
          bottom: !isTop
              ? BorderSide(
                  color: _isProcessing
                      ? const Color(0xFF10B981)
                      : const Color(0xFF6366F1),
                  width: 4,
                )
              : BorderSide.none,
          left: isLeft
              ? BorderSide(
                  color: _isProcessing
                      ? const Color(0xFF10B981)
                      : const Color(0xFF6366F1),
                  width: 4,
                )
              : BorderSide.none,
          right: !isLeft
              ? BorderSide(
                  color: _isProcessing
                      ? const Color(0xFF10B981)
                      : const Color(0xFF6366F1),
                  width: 4,
                )
              : BorderSide.none,
        ),
      ),
    );
  }

  Future<void> _showManualInput(BuildContext context) async {
    final controller = TextEditingController();

    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('輸入邀請碼'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            hintText: '請輸入邀請碼',
            border: OutlineInputBorder(),
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('取消'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(controller.text),
            child: const Text('加入'),
          ),
        ],
      ),
    );

    // 對話框關閉後釋放 controller
    controller.dispose();

    if (result != null && result.isNotEmpty && mounted) {
      setState(() {
        _isProcessing = true;
        _hasScanned = true;
      });

      try {
        final tripsRepo = ref.read(tripsRepositoryProvider);
        final trip = await tripsRepo.joinTrip(result);

        if (mounted) {
          _showSuccess('成功加入「${trip.name}」！');
          await Future.delayed(const Duration(milliseconds: 1500));
          if (mounted) {
            context.go('/trips/${trip.id}');
          }
        }
      } catch (e) {
        if (mounted) {
          setState(() {
            _isProcessing = false;
            _hasScanned = false;
          });
          // 檢查是否為成員數量限制錯誤
          final apiException = ErrorHandler.getApiException(e);
          if (apiException?.isMemberLimitReached == true) {
            _showMemberLimitDialog();
          } else {
            _showError('加入失敗: ${_parseError(e.toString())}');
          }
        }
      }
    }
  }
}
