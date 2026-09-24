# Changed Files: Rest & Focus Module

## 新建文件
- `lib/ui/features/rest/widgets/floating_pomodoro_bubble.dart`: 悬浮球番茄钟（收起态环形进度小球与展开态控制面板）。
- `lib/ui/features/rest/widgets/muyu_relief_widget.dart`: 考研解压木鱼（下沉微弹与飘字向上浮升）。
- `lib/ui/features/rest/widgets/breathing_widget.dart`: 呼吸导引器（4-4-4 物理平滑缩放圆环）。
- `lib/ui/features/rest/widgets/schulte_grid_widget.dart`: 5x5 舒尔特方格专注力训练。
- `lib/ui/features/rest/rest_view.dart`: 休息放松主界面（顶部模式切换 SegmentedButton）。
- `test/rest_module_test.dart`: 覆盖木鱼敲击、模式切换与番茄钟交互的自动化测试。

## 修改文件
- `lib/ui/shell/widgets/side_nav_rail.dart`: 增加“休息”导航目的地。
- `lib/ui/shell/app_shell.dart`: 挂载 `RestView` 与 `FloatingPomodoroBubble`。
