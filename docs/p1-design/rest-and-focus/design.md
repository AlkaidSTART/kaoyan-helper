# P1 - 休息放松与专注管理设计

## 1. 悬浮球番茄钟设计 (`FloatingPomodoroBubble`)
- **形态**：
  - 收起态：48×48dp 浮动小球，环形进度条 (`CircularProgressIndicator`)，显示剩余时间（如 25m）。
  - 展开态：260×180dp 卡片，包含模式选择（专注 25m / 深度 50m / 短休 5m）与开始/重置按键。
- **动效**：`ScaleTransition` + `FadeTransition`（200ms）。

## 2. 休息页与子功能设计 (`RestView`)
- **顶部模式切换**：`SegmentedButton`（深呼吸、解压木鱼、舒尔特方格）。
- **考研解压木鱼 (`MuyuReliefWidget`)**：
  - 点击或按空格触发 `ScaleTransition(scale: 0.92)` 90ms 物理下沉回弹。
  - 浮升动画：`SlideTransition(dy: 0 -> -60dp)` + `FadeTransition(1.0 -> 0.0)`。
  - 飘字词库：`上岸 +1`、`心流 +1`、`一志愿拟录取 +1`、`功不唐捐 +1`。
- **舒尔特方格 (`SchulteGridWidget`)**：
  - 5×5 乱序网格，最大宽度 360×360dp。
  - 目标数字提示、计时器、点选正确底色切换至 `successContainer` 并淡化。
- **深呼吸导引 (`BreathingWidget`)**：
  - 4 秒吸气、4 秒屏息、4 秒呼气循环动画圆环。

## 3. 导航与入口集成
- `SideNavRail` 第 5 项（Index 5）为“休息”，图标为 `Icons.self_improvement_outlined` / `Icons.self_improvement_rounded`。
- 移动端 `NavigationBar` 保持同步。
