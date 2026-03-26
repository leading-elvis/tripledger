import 'package:flutter/material.dart';

/// 相機掃描框覆蓋層
///
/// 在相機預覽上顯示收據掃描框和提示文字
class CameraOverlay extends StatelessWidget {
  const CameraOverlay({super.key});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final height = constraints.maxHeight;

        // 掃描框大小
        final scanWidth = width * 0.85;
        final scanHeight = height * 0.6;

        // 掃描框位置
        final left = (width - scanWidth) / 2;
        final top = (height - scanHeight) / 2.5;

        return Stack(
          children: [
            // 半透明遮罩
            _buildOverlayMask(width, height, left, top, scanWidth, scanHeight),

            // 掃描框邊框
            Positioned(
              left: left,
              top: top,
              child: _buildScanFrame(scanWidth, scanHeight),
            ),

            // 提示文字
            Positioned(
              left: 0,
              right: 0,
              top: top + scanHeight + 24,
              child: const Text(
                '將收據放入框內',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),

            // 底部說明
            Positioned(
              left: 16,
              right: 16,
              bottom: 100,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  '請確保收據文字清晰可見，自動辨識金額和商家名稱',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 13,
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  /// 建立遮罩
  Widget _buildOverlayMask(
    double width,
    double height,
    double left,
    double top,
    double scanWidth,
    double scanHeight,
  ) {
    return CustomPaint(
      size: Size(width, height),
      painter: _OverlayPainter(
        scanRect: Rect.fromLTWH(left, top, scanWidth, scanHeight),
      ),
    );
  }

  /// 建立掃描框
  Widget _buildScanFrame(double width, double height) {
    const cornerLength = 24.0;
    const cornerWidth = 3.0;
    const cornerColor = Colors.white;

    return SizedBox(
      width: width,
      height: height,
      child: Stack(
        children: [
          // 左上角
          Positioned(
            left: 0,
            top: 0,
            child: _buildCorner(cornerLength, cornerWidth, cornerColor, true, true),
          ),
          // 右上角
          Positioned(
            right: 0,
            top: 0,
            child: _buildCorner(cornerLength, cornerWidth, cornerColor, false, true),
          ),
          // 左下角
          Positioned(
            left: 0,
            bottom: 0,
            child: _buildCorner(cornerLength, cornerWidth, cornerColor, true, false),
          ),
          // 右下角
          Positioned(
            right: 0,
            bottom: 0,
            child: _buildCorner(cornerLength, cornerWidth, cornerColor, false, false),
          ),
        ],
      ),
    );
  }

  /// 建立角落邊框
  Widget _buildCorner(
    double length,
    double width,
    Color color,
    bool isLeft,
    bool isTop,
  ) {
    return SizedBox(
      width: length,
      height: length,
      child: CustomPaint(
        painter: _CornerPainter(
          width: width,
          color: color,
          isLeft: isLeft,
          isTop: isTop,
        ),
      ),
    );
  }
}

/// 遮罩繪製器
class _OverlayPainter extends CustomPainter {
  final Rect scanRect;

  _OverlayPainter({required this.scanRect});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black.withAlpha((0.6 * 255).toInt())
      ..style = PaintingStyle.fill;

    // 繪製遮罩，留出掃描框區域
    final path = Path()
      ..addRect(Rect.fromLTWH(0, 0, size.width, size.height))
      ..addRRect(RRect.fromRectAndRadius(scanRect, const Radius.circular(12)))
      ..fillType = PathFillType.evenOdd;

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// 角落邊框繪製器
class _CornerPainter extends CustomPainter {
  final double width;
  final Color color;
  final bool isLeft;
  final bool isTop;

  _CornerPainter({
    required this.width,
    required this.color,
    required this.isLeft,
    required this.isTop,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = width
      ..strokeCap = StrokeCap.round;

    final path = Path();

    if (isLeft && isTop) {
      // 左上角
      path.moveTo(0, size.height);
      path.lineTo(0, 0);
      path.lineTo(size.width, 0);
    } else if (!isLeft && isTop) {
      // 右上角
      path.moveTo(0, 0);
      path.lineTo(size.width, 0);
      path.lineTo(size.width, size.height);
    } else if (isLeft && !isTop) {
      // 左下角
      path.moveTo(0, 0);
      path.lineTo(0, size.height);
      path.lineTo(size.width, size.height);
    } else {
      // 右下角
      path.moveTo(0, size.height);
      path.lineTo(size.width, size.height);
      path.lineTo(size.width, 0);
    }

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
