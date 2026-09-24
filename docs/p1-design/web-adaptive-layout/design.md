# P1 - Web 自适应布局与看板设计

## 1. 接口与数据模型契约
- 看板暂采用轻量本地 State / View Model 驱动 UI，便于后续挂载 Riverpod Repository。
- 定义 `DashboardStats`: 倒计时天数、刷题进度、达成率、打卡天数。
- 定义 `TargetSchool`: 目标学校、专业代码、报录比、历年分数线。

## 2. 色彩与主题设计
- 暖阳主题色：
  - Primary: `#E07B39`
  - OnPrimaryContainer: `#8C3B07`
  - SurfaceContainerLowest: `#FFFBF5`
  - Surface: `#FFFDF9`
  - OutlineVariant: `#E8DDD2`
- 语义色彩扩展 (`SemanticColors`):
  - Success: `#2E9E6E`, bg: `#EAF5F0`
  - Warning: `#D4912A`, bg: `#FBF4EA`
  - Danger: `#D4453A`, bg: `#FBECEB`

## 3. 组件规范
- `StatusDot`: 状态指示圆点（默认 8.0dp）。
- `NumberTicker`: 针对核心指标提供 350ms `Curves.easeOutCubic` 滚入动效。
- `StatCard`: 统计卡片，支持数字动效与清晰的线性图标。

## 4. 布局结构
- 桌面断点 `>= 1024px`，中间内容区 `ConstrainedBox(maxWidth: 960)` 居中对齐，左右留白。
- 右侧 AI 助手宽度 400px，250ms `Curves.easeOut` 平滑进出。
