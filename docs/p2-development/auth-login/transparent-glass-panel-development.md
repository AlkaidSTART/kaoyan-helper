# P2 - 登录面板通透玻璃质感 · 开发

## 原子 Todo List
- [x] 落盘 P0/P1 文档。
- [x] `auth_glass_card.dart`：BackdropFilter 改为 compose(模糊 20 + 饱和 ×1.2)，面板填充改暖白渐变 44%→22%，边框改 65% 白。
- [x] `auth_glass_card.dart`：Tab 栏容器、三处输入框、分隔线半透明化。
- [x] `oauth_button_row.dart`：按钮填充与描边半透明化，与面板玻璃语言一致。
- [x] 落盘 P3 验证文档，执行 `flutter analyze` 与 `flutter test`。

## 技术决策 (ADR)
- **ADR-006**: 背景模糊采用单层 `ImageFilter.blur(sigma: 20)`；玻璃暖色调由暖白半透明渐变填充承担，不叠加色彩滤镜——`dart:ui` 的 `ImageFilter` 无 `colorFilter` 工厂（已核对 Flutter 3.41.2 与 master 源码，仅 blur/dilate/erode/matrix/compose/shader），任何 SDK 版本均不可用。
- **ADR-007**: 错误提示条保留实色：红色警示在半透明底上对比度会显著衰减，可读性优先于风格统一。

## 实际问题记录
- 初版尝试 `ImageFilter.compose(outer: blur, inner: ImageFilter.colorFilter(...))` 做背景饱和补偿，编译报 `undefined_method`：该 API 在 Flutter 中不存在，属方案设计失误；已回退为单层模糊并重跑验证通过。
- 输入框装饰在三个 builder 中重复出现，本次按最小改动原则就地修改数值，不抽取公共样式（避免无关重构）。
