import 'package:flutter/material.dart';
import 'widgets/stat_card.dart';
import 'widgets/task_center_card.dart';
import 'widgets/target_school_card.dart';

class DashboardView extends StatelessWidget {
  const DashboardView({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 768;

        final statCards = [
          StatCard(
            icon: Icons.timer_outlined,
            label: '考研倒计时',
            value: 98,
            suffix: ' 天',
            valueColor: theme.colorScheme.primary,
          ),
          const StatCard(
            icon: Icons.assignment_outlined,
            label: '今日刷题',
            value: 32,
            subtitle: '/ 50 题',
          ),
          const StatCard(
            icon: Icons.track_changes_outlined,
            label: '今日达成率',
            value: 64,
            suffix: '%',
          ),
          const StatCard(
            icon: Icons.local_fire_department_outlined,
            label: '连续打卡',
            value: 12,
            suffix: ' 天',
            iconColor: Color(0xFFE07B39),
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
