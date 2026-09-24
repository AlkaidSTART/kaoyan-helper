import 'package:flutter/material.dart';
import 'widgets/breathing_widget.dart';
import 'widgets/muyu_relief_widget.dart';
import 'widgets/schulte_grid_widget.dart';

enum RestMode { breathing, muyu, schulte }

class RestView extends StatefulWidget {
  const RestView({super.key});

  @override
  State<RestView> createState() => _RestViewState();
}

class _RestViewState extends State<RestView> {
  RestMode _mode = RestMode.muyu;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 720),
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              // 模式切换 SegmentedButton
              SegmentedButton<RestMode>(
                segments: const [
                  ButtonSegment<RestMode>(
                    value: RestMode.breathing,
                    icon: Icon(Icons.air_rounded, size: 18),
                    label: Text('深呼吸'),
                  ),
                  ButtonSegment<RestMode>(
                    value: RestMode.muyu,
                    icon: Icon(Icons.spa_outlined, size: 18),
                    label: Text('考研木鱼'),
                  ),
                  ButtonSegment<RestMode>(
                    value: RestMode.schulte,
                    icon: Icon(Icons.grid_view_rounded, size: 18),
                    label: Text('舒尔特方格'),
                  ),
                ],
                selected: {_mode},
                onSelectionChanged: (Set<RestMode> newSelection) {
                  setState(() => _mode = newSelection.first);
                },
              ),
              const SizedBox(height: 36),

              // 内容区
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 250),
                switchInCurve: Curves.easeOutCubic,
                switchOutCurve: Curves.easeInCubic,
                child: _buildCurrentWidget(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCurrentWidget() {
    switch (_mode) {
      case RestMode.breathing:
        return const BreathingWidget(key: ValueKey('breathing'));
      case RestMode.muyu:
        return const MuyuReliefWidget(key: ValueKey('muyu'));
      case RestMode.schulte:
        return const SchulteGridWidget(key: ValueKey('schulte'));
    }
  }
}
