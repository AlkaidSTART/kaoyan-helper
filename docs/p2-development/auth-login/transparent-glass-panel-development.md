# P2 - 登录面板通透玻璃质感 · 开发

## 原子 Todo List
- [x] 落盘 P0/P1 文档。
- [x] `auth_glass_card.dart`：BackdropFilter 改为 compose(模糊 20 + 饱和 ×1.2)，面板填充改暖白渐变 44%→22%，边框改 65% 白。
- [x] `auth_glass_card.dart`：Tab 栏容器、三处输入框、分隔线半透明化。
- [x] `oauth_button_row.dart`：按钮填充与描边半透明化，与面板玻璃语言一致。
- [x] 落盘 P3 验证文档，执行 `flutter analyze` 与 `flutter test`。

## 技术决策 (ADR)
- **ADR-006**: 采用 `ImageFilter.compose(outer: ImageFilter.blur(20), inner: ImageFilter.colorFilter(饱和矩阵 ×1.2))` 替代单层模糊——透光率提高后仅靠模糊会显得灰蒙，饱和补偿恢复玻璃"折色"质感；该 API 为 Flutter 官方 compose 能力，无自定义着色器，三端兼容。
- **ADR-007**: 错误提示条保留实色：红色警示在半透明底上对比度会显著衰减，可读性优先于风格统一。

## 实际问题记录
- 输入框装饰在三个 builder 中重复出现，本次按最小改动原则就地修改数值，不抽取公共样式（避免无关重构）。
