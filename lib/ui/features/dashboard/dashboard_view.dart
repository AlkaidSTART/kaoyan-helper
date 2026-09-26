import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../features/dashboard/presentation/dashboard_notifier.dart';
import 'widgets/stat_card.dart';
import 'widgets/task_center_card.dart';
import 'widgets/target_school_card.dart';

class DashboardView extends ConsumerWidget {
  const DashboardView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    // 未登录或加载中为 null，统计卡显示 `--` 占位。
    final summary = ref.watch(
      dashboardSummaryProvider.select((state) => state.value),
    );
    final data = summary;

    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 768;

        final statCards = [
          StatCard(
            icon: Icons.timer_outlined,
            label: '考研倒计时',
            value: data?.daysUntilExam,
            suffix: ' 天',
            valueColor: theme.colorScheme.primary,
          ),
          StatCard(
            icon: Icons.assignment_outlined,
            label: '今日刷题',
            value: data?.todayQuestionCount,
            suffix: ' 题',
          ),
          StatCard(
            icon: Icons.track_changes_outlined,
            label: '待复习卡片',
            value: data?.dueCardCount,
            suffix: ' 张',
          ),
          StatCard(
            icon: Icons.local_fire_department_outlined,
            label: '连续打卡',
            value: data?.streakDays,
            suffix: ' 天',
            iconColor: const Color(0xFFE07B39),
          ),
        ];

        return SingleChildScrollView(
          padding: EdgeInsets.symmetric(
            horizontal: isNarrow ? 16.0 : 24.0,
            vertical: 20.0,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 顶部核心数据统计卡片行
              if (!isNarrow)
                Row(
                  children: [
                    for (int i = 0; i < statCards.length; i++) ...[
                      if (i > 0) const SizedBox(width: 16),
                      Expanded(child: statCards[i]),
                    ],
                  ],
                )
              else
                Column(
                  children: [
                    Row(
                      children: [
                        Expanded(child: statCards[0]),
                        const SizedBox(width: 12),
                        Expanded(child: statCards[1]),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(child: statCards[2]),
                        const SizedBox(width: 12),
                        Expanded(child: statCards[3]),
                      ],
                    ),
                  ],
                ),
              const SizedBox(height: 24),

              // 主体内容区：宽屏为两栏 (flex: 3 + flex: 2)，窄屏为纵向单列流
              if (!isNarrow)
                const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(flex: 3, child: TaskCenterCard()),
                    SizedBox(width: 20),
                    Expanded(flex: 2, child: TargetSchoolCard()),
                  ],
                )
              else
                const Column(
                  children: [
                    TaskCenterCard(),
                    SizedBox(height: 16),
                    TargetSchoolCard(),
                  ],
                ),
            ],
          ),
        );
      },
    );
  }
}
