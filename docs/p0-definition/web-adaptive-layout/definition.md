# P0 - Web 自适应布局与 UI 完善定义

## 1. 真实痛点与场景
- 考研备考学生长时间在 Web / 桌面端使用，需要宽屏的高效利用。
- 并行任务多（如边看题边用 AI 答疑），需要三栏式布局支撑并发交互。
- 长时间盯屏，需要温润低饱和、抗疲劳、留白足够的暖色调 UI。
- 备考需要一目了然的核心仪表盘：倒计时、今日刷题进度、达成率、打卡天数以及一志愿目标报录比与分数线。

## 2. 范围边界
- 实现 Web/桌面端自适应 Shell 结构（三栏式，MaxWidth 960）。
- 落地暖阳 (Warm Amber) Material 3 基础色彩体系与语义色扩展。
- 落地学习看板 (Dashboard) 核心信息卡片与微交互动效。
- 严格遵循全工程无系统 Emoji 规范，使用 Material Symbols Outlined 和 StatusDot。

## 3. 验收指标
- 桌面端 (>=1024px) 呈现 TopAppBar + 左侧 NavRail + 中间内容 (MaxWidth 960) + 右侧 AI 抽屉。
- 首页展示看板真实结构（统计卡片行、任务中心、目标看板）。
- 所有动效响应无障碍 `reduceMotion`，且单次动画时长 <= 400ms。
- 通过 `flutter analyze` 零警告，`flutter test` 单元测试通过。
