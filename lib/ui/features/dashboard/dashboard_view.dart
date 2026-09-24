import 'package:flutter/material.dart';
import 'widgets/stat_card.dart';
import 'widgets/task_center_card.dart';
import 'widgets/target_school_card.dart';

class DashboardView extends StatelessWidget {
  const DashboardView({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 顶部核心数据统计卡片行
          Row(
            children: [
              Expanded(
                child: StatCard(
                  icon: Icons.timer_outlined,
                  label: '考研倒计时',
                  value: 98,
                  suffix: ' 天',
                  valueColor: theme.colorScheme.primary,
                ),
              ),
              const SizedBox(width: 16),
              const Expanded(
                child: StatCard(
                  icon: Icons.assignment_outlined,
                  label: '今日刷题',
                  value: 32,
                  subtitle: '/ 50 题',
                ),
              ),
              const SizedBox(width: 16),
              const Expanded(
                child: StatCard(
                  icon: Icons.track_changes_outlined,
                  label: '今日达成率',
                  value: 64,
                  suffix: '%',
                ),
              ),
              const SizedBox(width: 16),
              const Expanded(
                child: StatCard(
                  icon: Icons.local_fire_department_outlined,
                  label: '连续打卡',
                  value: 12,
                  suffix: ' 天',
                  iconColor: Color(0xFFE07B39),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // 主体两栏布局：任务中心 (flex: 3) + 目标看板 (flex: 2)
          const Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 3,
                child: TaskCenterCard(),
              ),
              SizedBox(width: 20),
              Expanded(
                flex: 2,
                child: TargetSchoolCard(),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
