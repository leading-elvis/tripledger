import 'package:flutter/material.dart';

/// Skeleton 載入動畫元件
/// 用於在載入資料時顯示佔位骨架
class SkeletonLoading extends StatefulWidget {
  final double? width;
  final double? height;
  final double borderRadius;
  final EdgeInsets? margin;

  const SkeletonLoading({
    super.key,
    this.width,
    this.height,
    this.borderRadius = 8,
    this.margin,
  });

  @override
  State<SkeletonLoading> createState() => _SkeletonLoadingState();
}

class _SkeletonLoadingState extends State<SkeletonLoading>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat();

    _animation = Tween<double>(begin: -2, end: 2).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOutSine),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          width: widget.width,
          height: widget.height,
          margin: widget.margin,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.borderRadius),
            gradient: LinearGradient(
              begin: Alignment(_animation.value - 1, 0),
              end: Alignment(_animation.value + 1, 0),
              colors: isDark
                  ? [
                      const Color(0xFF1E293B),
                      const Color(0xFF334155),
                      const Color(0xFF1E293B),
                    ]
                  : [
                      Colors.grey[300]!,
                      Colors.grey[100]!,
                      Colors.grey[300]!,
                    ],
            ),
          ),
        );
      },
    );
  }
}

/// 文字行骨架
class SkeletonText extends StatelessWidget {
  final double width;
  final double height;
  final EdgeInsets? margin;

  const SkeletonText({
    super.key,
    this.width = double.infinity,
    this.height = 16,
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    return SkeletonLoading(
      width: width,
      height: height,
      borderRadius: 4,
      margin: margin,
    );
  }
}

/// 圓形頭像骨架
class SkeletonAvatar extends StatelessWidget {
  final double size;
  final EdgeInsets? margin;

  const SkeletonAvatar({
    super.key,
    this.size = 40,
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    return SkeletonLoading(
      width: size,
      height: size,
      borderRadius: size / 2,
      margin: margin,
    );
  }
}

/// 列表項骨架
class SkeletonListItem extends StatelessWidget {
  final bool hasLeading;
  final bool hasTrailing;
  final int lines;
  final EdgeInsets? padding;

  const SkeletonListItem({
    super.key,
    this.hasLeading = true,
    this.hasTrailing = false,
    this.lines = 2,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding ?? const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          if (hasLeading) ...[
            const SkeletonAvatar(size: 48),
            const SizedBox(width: 16),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SkeletonText(width: 150, height: 16),
                if (lines > 1) ...[
                  const SizedBox(height: 8),
                  SkeletonText(
                    width: lines > 2 ? double.infinity : 100,
                    height: 14,
                  ),
                ],
                if (lines > 2) ...[
                  const SizedBox(height: 6),
                  const SkeletonText(width: 80, height: 12),
                ],
              ],
            ),
          ),
          if (hasTrailing) ...[
            const SizedBox(width: 16),
            const SkeletonLoading(width: 60, height: 20, borderRadius: 4),
          ],
        ],
      ),
    );
  }
}

/// 卡片骨架
class SkeletonCard extends StatelessWidget {
  final double? width;
  final double? height;
  final EdgeInsets? margin;
  final EdgeInsets? padding;
  final Widget? child;

  const SkeletonCard({
    super.key,
    this.width,
    this.height,
    this.margin,
    this.padding,
    this.child,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: width,
      height: height,
      margin: margin ?? const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: padding ?? const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: isDark
            ? null
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
      ),
      child: child ??
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  const SkeletonAvatar(size: 36),
                  const SizedBox(width: 12),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SkeletonText(width: 120, height: 14),
                        SizedBox(height: 4),
                        SkeletonText(width: 80, height: 12),
                      ],
                    ),
                  ),
                  const SkeletonLoading(width: 60, height: 22, borderRadius: 11),
                ],
              ),
              const SizedBox(height: 12),
              const SkeletonText(height: 12),
              const SizedBox(height: 6),
              const SkeletonText(width: 200, height: 12),
            ],
          ),
    );
  }
}

/// 旅程卡片骨架
class SkeletonTripCard extends StatelessWidget {
  final EdgeInsets? margin;

  const SkeletonTripCard({super.key, this.margin});

  @override
  Widget build(BuildContext context) {
    return SkeletonCard(
      margin: margin ?? const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              const SkeletonLoading(width: 48, height: 48, borderRadius: 12),
              const SizedBox(width: 16),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SkeletonText(width: 140, height: 18),
                    SizedBox(height: 8),
                    SkeletonText(width: 100, height: 14),
                  ],
                ),
              ),
              const SkeletonLoading(width: 80, height: 28, borderRadius: 14),
            ],
          ),
          const SizedBox(height: 16),
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              SkeletonText(width: 80, height: 14),
              SkeletonText(width: 60, height: 14),
              SkeletonText(width: 100, height: 14),
            ],
          ),
        ],
      ),
    );
  }
}

/// 帳單項目骨架
class SkeletonBillItem extends StatelessWidget {
  final EdgeInsets? margin;

  const SkeletonBillItem({super.key, this.margin});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: margin ?? const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: isDark
            ? null
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 2),
                ),
              ],
      ),
      child: Row(
        children: [
          const SkeletonLoading(width: 44, height: 44, borderRadius: 12),
          const SizedBox(width: 16),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SkeletonText(width: 120, height: 16),
                SizedBox(height: 8),
                SkeletonText(width: 80, height: 14),
              ],
            ),
          ),
          const Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              SkeletonText(width: 70, height: 18),
              SizedBox(height: 6),
              SkeletonLoading(width: 28, height: 28, borderRadius: 8),
            ],
          ),
        ],
      ),
    );
  }
}

/// 旅程列表骨架頁面
class TripsListSkeleton extends StatelessWidget {
  final int itemCount;

  const TripsListSkeleton({super.key, this.itemCount = 5});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 8),
      physics: const NeverScrollableScrollPhysics(),
      itemCount: itemCount,
      itemBuilder: (context, index) => const SkeletonTripCard(),
    );
  }
}

/// 帳單列表骨架
class BillsListSkeleton extends StatelessWidget {
  final int itemCount;

  const BillsListSkeleton({super.key, this.itemCount = 5});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      physics: const NeverScrollableScrollPhysics(),
      shrinkWrap: true,
      itemCount: itemCount,
      itemBuilder: (context, index) => const SkeletonBillItem(),
    );
  }
}

/// 成員列表骨架
class MembersListSkeleton extends StatelessWidget {
  final int itemCount;

  const MembersListSkeleton({super.key, this.itemCount = 4});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(vertical: 8),
      physics: const NeverScrollableScrollPhysics(),
      shrinkWrap: true,
      itemCount: itemCount,
      itemBuilder: (context, index) => const SkeletonListItem(
        hasLeading: true,
        hasTrailing: true,
        lines: 2,
      ),
    );
  }
}
