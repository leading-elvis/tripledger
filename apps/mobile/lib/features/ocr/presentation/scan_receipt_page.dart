import 'dart:io';
import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_image_compress/flutter_image_compress.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../../shared/utils/error_handler.dart';
import '../../purchase/presentation/paywall_dialog.dart';
import '../providers/ocr_provider.dart';
import 'widgets/camera_overlay.dart';
import 'scan_result_page.dart';

/// 掃描收據頁面
///
/// 使用相機拍攝收據或從相簿選擇圖片，進行 OCR 辨識
class ScanReceiptPage extends ConsumerStatefulWidget {
  final String tripId;

  const ScanReceiptPage({
    super.key,
    required this.tripId,
  });

  @override
  ConsumerState<ScanReceiptPage> createState() => _ScanReceiptPageState();
}

class _ScanReceiptPageState extends ConsumerState<ScanReceiptPage>
    with WidgetsBindingObserver {
  CameraController? _cameraController;
  bool _isInitialized = false;
  bool _isCapturing = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initializeCamera();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _cameraController?.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive) {
      // 釋放相機資源並清除引用
      _cameraController?.dispose();
      _cameraController = null;
      if (mounted) {
        setState(() {
          _isInitialized = false;
        });
      }
    } else if (state == AppLifecycleState.resumed) {
      // 只有在相機尚未初始化時才重新初始化
      if (_cameraController == null) {
        _initializeCamera();
      }
    }
  }

  /// 初始化相機
  Future<void> _initializeCamera() async {
    // 確保先釋放舊的相機控制器（防止重複初始化導致記憶體洩漏）
    if (_cameraController != null) {
      await _cameraController!.dispose();
      _cameraController = null;
    }

    // 檢查權限
    final status = await Permission.camera.request();
    if (!status.isGranted) {
      if (mounted) {
        setState(() {
          _errorMessage = '需要相機權限才能掃描收據';
        });
      }
      return;
    }

    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        if (mounted) {
          setState(() {
            _errorMessage = '找不到可用的相機';
          });
        }
        return;
      }

      // 使用後置相機
      final camera = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );

      // 依序嘗試不同解析度，iPad 上 high 可能失敗
      CameraController? controller;
      for (final preset in [ResolutionPreset.high, ResolutionPreset.medium, ResolutionPreset.low]) {
        try {
          controller = CameraController(
            camera,
            preset,
            enableAudio: false,
          );
          await controller.initialize();
          break; // 初始化成功，跳出迴圈
        } catch (e) {
          await controller?.dispose();
          controller = null;
          if (preset == ResolutionPreset.low) rethrow; // 最低解析度也失敗，拋出錯誤
        }
      }

      // 檢查 widget 是否仍然存在（避免在 dispose 後設置狀態）
      if (mounted && controller != null) {
        _cameraController = controller;
        setState(() {
          _isInitialized = true;
        });
      } else {
        // Widget 已被 dispose，釋放剛建立的控制器
        await controller?.dispose();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = '相機初始化失敗: $e';
        });
      }
    }
  }

  /// 拍攝照片
  Future<void> _capturePhoto() async {
    if (_cameraController == null ||
        !_cameraController!.value.isInitialized ||
        _isCapturing) {
      return;
    }

    setState(() {
      _isCapturing = true;
    });

    try {
      final photo = await _cameraController!.takePicture();
      // 壓縮拍照圖片（與相簿選擇一致：最長邊 2000px, 品質 90%）
      final dir = await getTemporaryDirectory();
      final targetPath = '${dir.path}/compressed_${DateTime.now().millisecondsSinceEpoch}.jpg';
      final compressed = await FlutterImageCompress.compressAndGetFile(
        photo.path,
        targetPath,
        minWidth: 2000,
        minHeight: 2000,
        quality: 90,
      );
      await _processImage(File(compressed?.path ?? photo.path));
    } catch (e) {
      _showError('拍攝失敗: $e');
    } finally {
      setState(() {
        _isCapturing = false;
      });
    }
  }

  /// 從相簿選擇
  Future<void> _pickFromGallery() async {
    final picker = ImagePicker();
    try {
      final image = await picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 2000,
        maxHeight: 2000,
        imageQuality: 90,
      );

      if (image != null) {
        await _processImage(File(image.path));
      }
    } catch (e) {
      _showError('選擇圖片失敗: $e');
    }
  }

  /// 處理圖片（進行 OCR）
  Future<void> _processImage(File imageFile) async {
    // 顯示載入對話框
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const _ProcessingDialog(),
    );

    try {
      await ref.read(ocrScanProvider.notifier).scanReceipt(
            imageFile,
            tripId: widget.tripId,
          );

      if (mounted) {
        Navigator.of(context).pop(); // 關閉載入對話框

        final state = ref.read(ocrScanProvider);
        if (state.status == OcrScanStatus.success) {
          // 導航到結果頁面
          _navigateToResult();
        } else if (state.status == OcrScanStatus.error) {
          _handleOcrError(state.errorMessage);
        }
      }
    } catch (e) {
      if (mounted) {
        Navigator.of(context).pop();
        // 檢查是否為進階版限制
        if (ErrorHandler.isUpgradeRequired(e)) {
          await ErrorHandler.showUpgradeDialog(context, e, tripId: widget.tripId);
        } else {
          _handleOcrError(e.toString());
        }
      }
    }
  }

  /// 處理 OCR 錯誤，顯示對話框提供手動新增帳單選項
  void _handleOcrError(String? errorMessage) {
    if (!mounted) return;

    // 檢查是否為升級相關錯誤
    if (errorMessage != null && errorMessage.contains('PREMIUM_REQUIRED')) {
      PaywallDialog.show(
        context,
        tripId: widget.tripId,
        featureName: '雲端收據掃描',
      );
      return;
    }

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.info_outline_rounded, color: Colors.orange, size: 24),
            SizedBox(width: 8),
            Text('辨識未成功'),
          ],
        ),
        content: const Text('無法辨識收據內容，您可以手動新增帳單。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: Text(
              '重試',
              style: TextStyle(color: Colors.grey[600]),
            ),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(dialogContext);
              // 導航到手動新增帳單頁面
              context.push('/trips/${widget.tripId}/add-bill');
            },
            child: const Text('手動新增'),
          ),
        ],
      ),
    );
  }

  /// 導航到結果頁面
  void _navigateToResult() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => ScanResultPage(tripId: widget.tripId),
      ),
    );
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        title: const Text('掃描收據'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
      ),
      extendBodyBehindAppBar: true,
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_errorMessage != null) {
      return _buildErrorView();
    }

    if (!_isInitialized) {
      return const Center(
        child: CircularProgressIndicator(color: Colors.white),
      );
    }

    return Stack(
      children: [
        // 相機預覽
        Positioned.fill(
          child: CameraPreview(controller: _cameraController!),
        ),

        // 掃描框覆蓋層
        const Positioned.fill(
          child: CameraOverlay(),
        ),

        // 底部操作區
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: _buildBottomControls(),
        ),
      ],
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.camera_alt_outlined,
              size: 64,
              color: Colors.white54,
            ),
            const SizedBox(height: 16),
            Text(
              _errorMessage!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white70),
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                setState(() {
                  _errorMessage = null;
                });
                _initializeCamera();
              },
              child: const Text('重試'),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: _pickFromGallery,
              child: const Text('從相簿選擇'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomControls() {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 48),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.transparent,
            Colors.black.withAlpha((0.8 * 255).toInt()),
          ],
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          // 相簿按鈕
          _buildControlButton(
            icon: Icons.photo_library_outlined,
            label: '相簿',
            onTap: _pickFromGallery,
          ),

          // 拍攝按鈕
          _buildCaptureButton(),

          // 閃光燈按鈕（佔位）
          _buildControlButton(
            icon: Icons.flash_auto,
            label: '閃光燈',
            onTap: () {
              // 切換閃光燈
              _cameraController?.setFlashMode(
                _cameraController!.value.flashMode == FlashMode.auto
                    ? FlashMode.off
                    : FlashMode.auto,
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildControlButton({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white24,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: Colors.white, size: 24),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCaptureButton() {
    return GestureDetector(
      onTap: _isCapturing ? null : _capturePhoto,
      child: Container(
        width: 72,
        height: 72,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white, width: 4),
        ),
        padding: const EdgeInsets.all(4),
        child: Container(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: _isCapturing ? Colors.grey : Colors.white,
          ),
          child: _isCapturing
              ? const Padding(
                  padding: EdgeInsets.all(16),
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : null,
        ),
      ),
    );
  }
}

/// 相機預覽
class CameraPreview extends StatelessWidget {
  final CameraController controller;

  const CameraPreview({super.key, required this.controller});

  @override
  Widget build(BuildContext context) {
    if (!controller.value.isInitialized) {
      return const SizedBox();
    }

    return ClipRect(
      child: OverflowBox(
        alignment: Alignment.center,
        child: FittedBox(
          fit: BoxFit.cover,
          child: SizedBox(
            width: controller.value.previewSize?.height ?? 0,
            height: controller.value.previewSize?.width ?? 0,
            child: controller.buildPreview(),
          ),
        ),
      ),
    );
  }
}

/// 處理中對話框
class _ProcessingDialog extends StatelessWidget {
  const _ProcessingDialog();

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text(
              '正在辨識收據...',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              '請稍候',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey,
                  ),
            ),
          ],
        ),
      ),
    );
  }
}
