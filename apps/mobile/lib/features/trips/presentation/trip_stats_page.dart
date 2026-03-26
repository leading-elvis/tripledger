import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:fl_chart/fl_chart.dart';
import '../data/trips_repository.dart';
import '../../../shared/models/trip_model.dart';
import '../../../shared/models/bill_model.dart';
import '../../../core/config/theme.dart';
import '../../../shared/widgets/animated_widgets.dart';
import '../../../shared/utils/category_utils.dart';
import '../../../core/utils/currency_utils.dart';

class TripStatsPage extends ConsumerStatefulWidget {
  final String tripId;

  const TripStatsPage({super.key, required this.tripId});

  @override
  ConsumerState<TripStatsPage> createState() => _TripStatsPageState();
}

class _TripStatsPageState extends ConsumerState<TripStatsPage>
    with SingleTickerProviderStateMixin {
  TripDetail? _trip;
  bool _isLoading = true;
  int _touchedIndex = -1;
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
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

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('消費統計'),
        backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.primaryColor,
          unselectedLabelColor: Colors.grey,
          indicatorColor: AppTheme.primaryColor,
          tabs: const [
            Tab(text: '分類佔比'),
            Tab(text: '成員消費'),
            Tab(text: '消費趨勢'),
          ],
        ),
      ),
      body: _isLoading
          ? _buildLoadingState()
          : _trip == null || _trip!.bills.isEmpty
              ? _buildEmptyState()
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _CategoryTab(
                      bills: _trip!.bills,
                      touchedIndex: _touchedIndex,
                      onTouch: (index) => setState(() => _touchedIndex = index),
                      currency: _trip!.defaultCurrency,
                    ),
                    _MemberTab(trip: _trip!),
                    _TrendTab(bills: _trip!.bills, currency: _trip!.defaultCurrency),
                  ],
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

  Widget _buildEmptyState() {
    return EmptyStateWidget(
      icon: Icons.bar_chart_rounded,
      title: '還沒有消費記錄',
      subtitle: '新增帳單後即可查看統計資料',
    );
  }
}

// 分類佔比 Tab
class _CategoryTab extends StatelessWidget {
  final List<Bill> bills;
  final int touchedIndex;
  final Function(int) onTouch;
  final Currency currency;

  const _CategoryTab({
    required this.bills,
    required this.touchedIndex,
    required this.onTouch,
    required this.currency,
  });

  @override
  Widget build(BuildContext context) {
    final categoryData = _calculateCategoryData();
    // 使用 baseAmount（已換算成旅程預設貨幣）來計算總花費
    final totalAmount = bills.fold<double>(0, (sum, b) => sum + (b.baseAmount ?? b.amount));

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // 總消費卡片
        _TotalCard(totalAmount: totalAmount, currency: currency),
        const SizedBox(height: 24),

        // 圓餅圖
        _buildPieChart(categoryData, totalAmount, currency),
        const SizedBox(height: 24),

        // 分類明細
        _buildCategoryList(categoryData, totalAmount, currency),
      ],
    );
  }

  Map<String, double> _calculateCategoryData() {
    final Map<String, double> data = {};
    for (final bill in bills) {
      // 使用 baseAmount 進行統計
      data[bill.category] = (data[bill.category] ?? 0) + (bill.baseAmount ?? bill.amount);
    }
    return data;
  }

  Widget _buildPieChart(Map<String, double> data, double total, Currency currency) {
    final entries = data.entries.toList();

    return Container(
      height: 280,
      padding: const EdgeInsets.all(16),
      child: PieChart(
        PieChartData(
          pieTouchData: PieTouchData(
            touchCallback: (FlTouchEvent event, pieTouchResponse) {
              if (!event.isInterestedForInteractions ||
                  pieTouchResponse == null ||
                  pieTouchResponse.touchedSection == null) {
                onTouch(-1);
                return;
              }
              onTouch(pieTouchResponse.touchedSection!.touchedSectionIndex);
            },
          ),
          borderData: FlBorderData(show: false),
          sectionsSpace: 3,
          centerSpaceRadius: 50,
          sections: entries.asMap().entries.map((entry) {
            final index = entry.key;
            final category = entry.value.key;
            final amount = entry.value.value;
            final isTouched = index == touchedIndex;
            final color = AppTheme.categoryColors[category] ?? Colors.grey;
            final percentage = (amount / total * 100);

            return PieChartSectionData(
              color: color,
              value: amount,
              title: isTouched ? '${percentage.toStringAsFixed(1)}%' : '',
              radius: isTouched ? 80 : 65,
              titleStyle: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
              badgeWidget: isTouched
                  ? null
                  : _CategoryBadge(category: category, color: color),
              badgePositionPercentageOffset: 1.1,
            );
          }).toList(),
        ),
      ),
    )
        .animate()
        .fadeIn(duration: 600.ms)
        .scale(begin: const Offset(0.8, 0.8), duration: 600.ms);
  }

  Widget _buildCategoryList(Map<String, double> data, double total, Currency currency) {
    final sortedEntries = data.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(Icons.list_rounded, size: 20, color: AppTheme.primaryColor),
            const SizedBox(width: 8),
            const Text(
              '分類明細',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                letterSpacing: -0.3,
              ),
            ),
          ],
        ).animate(delay: 300.ms).fadeIn().slideX(begin: -0.1, end: 0),
        const SizedBox(height: 16),
        ...sortedEntries.asMap().entries.map((entry) {
          final index = entry.key;
          final category = entry.value.key;
          final amount = entry.value.value;
          final percentage = amount / total;

          return _CategoryItem(
            category: category,
            amount: amount,
            percentage: percentage,
            index: index,
            currency: currency,
          );
        }),
      ],
    );
  }
}

class _CategoryBadge extends StatelessWidget {
  final String category;
  final Color color;

  const _CategoryBadge({required this.category, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 32,
      height: 32,
      decoration: BoxDecoration(
        color: color,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.4),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Icon(
        CategoryUtils.getIcon(category),
        color: Colors.white,
        size: 16,
      ),
    );
  }
}

class _TotalCard extends StatelessWidget {
  final double totalAmount;
  final Currency currency;

  const _TotalCard({required this.totalAmount, required this.currency});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: AppTheme.primaryGradient,
        borderRadius: BorderRadius.circular(20),
        boxShadow: AppTheme.coloredShadow,
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(
              Icons.account_balance_wallet_rounded,
              color: Colors.white,
              size: 28,
            ),
          ),
          const SizedBox(width: 16),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '總消費金額',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.9),
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 4),
              TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: totalAmount),
                duration: const Duration(milliseconds: 1200),
                curve: Curves.easeOut,
                builder: (context, value, child) {
                  return Text(
                    CurrencyUtils.formatAmount(value, currency),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 28,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -1,
                    ),
                  );
                },
              ),
            ],
          ),
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 500.ms)
        .slideY(begin: -0.2, end: 0, duration: 500.ms);
  }
}

class _CategoryItem extends StatelessWidget {
  final String category;
  final double amount;
  final double percentage;
  final int index;
  final Currency currency;

  const _CategoryItem({
    required this.category,
    required this.amount,
    required this.percentage,
    required this.index,
    required this.currency,
  });

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.categoryColors[category] ?? Colors.grey;
    final label = BillCategory.fromValue(category).label;

    return AnimatedCard(
      delayMs: 400 + index * 80,
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  gradient: AppTheme.categoryGradients[category],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  CategoryUtils.getIcon(category),
                  color: Colors.white,
                  size: 22,
                ),
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
                      '${(percentage * 100).toStringAsFixed(1)}%',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey[500],
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                CurrencyUtils.formatAmount(amount, currency),
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  letterSpacing: -0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: percentage),
              duration: Duration(milliseconds: 800 + index * 100),
              curve: Curves.easeOut,
              builder: (context, value, child) {
                return LinearProgressIndicator(
                  value: value,
                  backgroundColor: color.withValues(alpha: 0.1),
                  valueColor: AlwaysStoppedAnimation<Color>(color),
                  minHeight: 6,
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// 成員消費 Tab
class _MemberTab extends StatelessWidget {
  final TripDetail trip;

  const _MemberTab({required this.trip});

  @override
  Widget build(BuildContext context) {
    final memberStats = _calculateMemberStats();
    final maxAmount = memberStats.values.fold<double>(0, (max, v) => v > max ? v : max);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // 長條圖
        _buildBarChart(memberStats, maxAmount),
        const SizedBox(height: 24),

        // 成員消費列表
        Row(
          children: [
            Icon(Icons.people_rounded, size: 20, color: AppTheme.primaryColor),
            const SizedBox(width: 8),
            const Text(
              '成員消費排名',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                letterSpacing: -0.3,
              ),
            ),
          ],
        ).animate(delay: 300.ms).fadeIn().slideX(begin: -0.1, end: 0),
        const SizedBox(height: 16),
        ...memberStats.entries.toList().asMap().entries.map((entry) {
          final index = entry.key;
          final memberId = entry.value.key;
          final amount = entry.value.value;
          final member = trip.members.firstWhere(
            (m) => m.userId == memberId,
            orElse: () => TripMember(
              id: '',
              tripId: '',
              userId: memberId,
              userName: '未知',
              role: 'MEMBER',
              joinedAt: DateTime.now(),
            ),
          );

          return _MemberItem(
            member: member,
            amount: amount,
            percentage: amount / maxAmount,
            rank: index + 1,
            index: index,
            currency: trip.defaultCurrency,
          );
        }),
      ],
    );
  }

  Map<String, double> _calculateMemberStats() {
    final Map<String, double> data = {};
    for (final bill in trip.bills) {
      // 使用 baseAmount 進行統計
      final key = bill.payerId ?? bill.virtualPayerId;
      if (key == null) continue;
      data[key] = (data[key] ?? 0) + (bill.baseAmount ?? bill.amount);
    }
    // 按金額排序
    final sorted = data.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    return Map.fromEntries(sorted);
  }

  Widget _buildBarChart(Map<String, double> data, double maxAmount) {
    return Builder(
      builder: (context) {
        final isDark = Theme.of(context).brightness == Brightness.dark;

        return Container(
      height: 200,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: isDark ? null : AppTheme.softShadow,
      ),
      child: BarChart(
        BarChartData(
          alignment: BarChartAlignment.spaceAround,
          maxY: maxAmount * 1.2,
          barTouchData: BarTouchData(
            enabled: true,
            touchTooltipData: BarTouchTooltipData(
              getTooltipColor: (group) => AppTheme.primaryColor,
              getTooltipItem: (group, groupIndex, rod, rodIndex) {
                return BarTooltipItem(
                  CurrencyUtils.formatAmount(rod.toY, trip.defaultCurrency),
                  const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                );
              },
            ),
          ),
          titlesData: FlTitlesData(
            show: true,
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (value, meta) {
                  final index = value.toInt();
                  if (index >= data.length) return const SizedBox();
                  final memberId = data.keys.elementAt(index);
                  final member = trip.members.firstWhere(
                    (m) => m.userId == memberId,
                    orElse: () => TripMember(
                      id: '',
                      tripId: '',
                      userId: memberId,
                      userName: '?',
                      role: 'MEMBER',
                      joinedAt: DateTime.now(),
                    ),
                  );
                  return Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      (member.nickname ?? member.userName).substring(0, 1),
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  );
                },
              ),
            ),
            leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          ),
          borderData: FlBorderData(show: false),
          gridData: const FlGridData(show: false),
          barGroups: data.entries.toList().asMap().entries.map((entry) {
            final index = entry.key;
            final amount = entry.value.value;
            final colors = [
              AppTheme.primaryColor,
              AppTheme.secondaryColor,
              AppTheme.accentColor,
              AppTheme.categoryColors['FOOD']!,
              AppTheme.categoryColors['SHOPPING']!,
            ];

            return BarChartGroupData(
              x: index,
              barRods: [
                BarChartRodData(
                  toY: amount,
                  gradient: LinearGradient(
                    colors: [
                      colors[index % colors.length],
                      colors[index % colors.length].withValues(alpha: 0.7),
                    ],
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                  ),
                  width: 24,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
                ),
              ],
            );
          }).toList(),
        ),
      ),
    ).animate().fadeIn(duration: 600.ms);
      },
    );
  }
}

class _MemberItem extends StatelessWidget {
  final TripMember member;
  final double amount;
  final double percentage;
  final int rank;
  final int index;
  final Currency currency;

  const _MemberItem({
    required this.member,
    required this.amount,
    required this.percentage,
    required this.rank,
    required this.index,
    required this.currency,
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
      delayMs: 400 + index * 80,
      child: Row(
        children: [
          // 排名
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              gradient: rank <= 3 ? gradient : null,
              color: rank > 3 ? Colors.grey[300] : null,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Center(
              child: Text(
                '$rank',
                style: TextStyle(
                  color: rank <= 3 ? Colors.white : Colors.grey[600],
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),

          // 頭像
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              gradient: gradient,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: Text(
                (member.nickname ?? member.userName)[0].toUpperCase(),
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
            ),
          ),
          const SizedBox(width: 14),

          // 名稱
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  member.nickname ?? member.userName,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                ClipRRect(
                  borderRadius: BorderRadius.circular(2),
                  child: TweenAnimationBuilder<double>(
                    tween: Tween(begin: 0, end: percentage),
                    duration: Duration(milliseconds: 800 + index * 100),
                    curve: Curves.easeOut,
                    builder: (context, value, child) {
                      return LinearProgressIndicator(
                        value: value,
                        backgroundColor: gradient.colors.first.withValues(alpha: 0.1),
                        valueColor: AlwaysStoppedAnimation<Color>(gradient.colors.first),
                        minHeight: 4,
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),

          // 金額
          Text(
            CurrencyUtils.formatAmount(amount, currency),
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.bold,
              letterSpacing: -0.5,
            ),
          ),
        ],
      ),
    );
  }
}

// 消費趨勢 Tab
class _TrendTab extends StatelessWidget {
  final List<Bill> bills;
  final Currency currency;

  const _TrendTab({required this.bills, required this.currency});

  @override
  Widget build(BuildContext context) {
    final dailyData = _calculateDailyData();
    if (dailyData.isEmpty) {
      return EmptyStateWidget(
        icon: Icons.show_chart_rounded,
        title: '資料不足',
        subtitle: '需要更多帳單資料才能顯示趨勢圖',
      );
    }

    final maxAmount = dailyData.values.fold<double>(0, (max, v) => v > max ? v : max);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // 趨勢圖
        _buildLineChart(dailyData, maxAmount),
        const SizedBox(height: 24),

        // 每日消費列表
        Row(
          children: [
            Icon(Icons.calendar_today_rounded, size: 20, color: AppTheme.primaryColor),
            const SizedBox(width: 8),
            const Text(
              '每日消費',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                letterSpacing: -0.3,
              ),
            ),
          ],
        ).animate(delay: 300.ms).fadeIn().slideX(begin: -0.1, end: 0),
        const SizedBox(height: 16),
        ...dailyData.entries.toList().reversed.take(7).toList().asMap().entries.map((entry) {
          final index = entry.key;
          final date = entry.value.key;
          final amount = entry.value.value;

          return _DailyItem(
            date: date,
            amount: amount,
            index: index,
            currency: currency,
          );
        }),
      ],
    );
  }

  Map<String, double> _calculateDailyData() {
    final Map<String, double> data = {};
    for (final bill in bills) {
      final dateKey = '${bill.paidAt.month}/${bill.paidAt.day}';
      // 使用 baseAmount 進行統計
      data[dateKey] = (data[dateKey] ?? 0) + (bill.baseAmount ?? bill.amount);
    }
    return data;
  }

  Widget _buildLineChart(Map<String, double> data, double maxAmount) {
    final entries = data.entries.toList();

    return Container(
      height: 250,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: AppTheme.softShadow,
      ),
      child: LineChart(
        LineChartData(
          gridData: FlGridData(
            show: true,
            drawVerticalLine: false,
            horizontalInterval: maxAmount / 4,
            getDrawingHorizontalLine: (value) {
              return FlLine(
                color: Colors.grey.withValues(alpha: 0.2),
                strokeWidth: 1,
              );
            },
          ),
          titlesData: FlTitlesData(
            show: true,
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 30,
                interval: 1,
                getTitlesWidget: (value, meta) {
                  final index = value.toInt();
                  if (index >= entries.length || index < 0) {
                    return const SizedBox();
                  }
                  return Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      entries[index].key,
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 10,
                      ),
                    ),
                  );
                },
              ),
            ),
            leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          ),
          borderData: FlBorderData(show: false),
          minX: 0,
          maxX: (entries.length - 1).toDouble(),
          minY: 0,
          maxY: maxAmount * 1.2,
          lineBarsData: [
            LineChartBarData(
              spots: entries.asMap().entries.map((entry) {
                return FlSpot(entry.key.toDouble(), entry.value.value);
              }).toList(),
              isCurved: true,
              gradient: AppTheme.primaryGradient,
              barWidth: 3,
              isStrokeCapRound: true,
              dotData: FlDotData(
                show: true,
                getDotPainter: (spot, percent, barData, index) {
                  return FlDotCirclePainter(
                    radius: 5,
                    color: Colors.white,
                    strokeWidth: 3,
                    strokeColor: AppTheme.primaryColor,
                  );
                },
              ),
              belowBarData: BarAreaData(
                show: true,
                gradient: LinearGradient(
                  colors: [
                    AppTheme.primaryColor.withValues(alpha: 0.3),
                    AppTheme.primaryColor.withValues(alpha: 0.0),
                  ],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
            ),
          ],
          lineTouchData: LineTouchData(
            touchTooltipData: LineTouchTooltipData(
              getTooltipColor: (touchedSpot) => AppTheme.primaryColor,
              getTooltipItems: (touchedSpots) {
                return touchedSpots.map((touchedSpot) {
                  return LineTooltipItem(
                    CurrencyUtils.formatAmount(touchedSpot.y, currency),
                    const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  );
                }).toList();
              },
            ),
          ),
        ),
      ),
    ).animate().fadeIn(duration: 600.ms);
  }
}

class _DailyItem extends StatelessWidget {
  final String date;
  final double amount;
  final int index;
  final Currency currency;

  const _DailyItem({
    required this.date,
    required this.amount,
    required this.index,
    required this.currency,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedCard(
      delayMs: 400 + index * 80,
      child: Row(
        children: [
          GradientIconBox(
            icon: Icons.calendar_today_rounded,
            gradient: AppTheme.secondaryGradient,
            size: 44,
            iconSize: 20,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Text(
              date,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          Text(
            CurrencyUtils.formatAmount(amount, currency),
            style: const TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.bold,
              letterSpacing: -0.5,
            ),
          ),
        ],
      ),
    );
  }
}
