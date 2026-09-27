# P2 - 登录面板切换动效 · 开发

## 原子 Todo List
- [x] 落盘 P0/P1 文档与任务计划。
- [x] Tab 胶囊改为 `AnimatedAlign` 滑动指示器，标签文字改 `AnimatedDefaultTextStyle` 渐变。
- [x] 验证码/密码表单切换改 `AnimatedSwitcher`（淡入 + 5% 水平轻推）。
- [x] 错误提示条改 `AnimatedSize` + `AnimatedSwitcher` 平滑展开收起，底部间距并入错误子树。
- [x] 执行并通过 `flutter analyze` 与 `flutter test`。

## 技术决策 (ADR)
- **ADR-008**: Tab 选中底色从"两个标签各自自绘 Container 背景"重构为 Stack 双层结构（胶囊层滑动 + 标签层恒透明）——只有选中态独立为可平移元素才能产生"滑动"而非"跳变"，胶囊用 `FractionallySizedBox(widthFactor: 0.5)` 保证任意宽度下精确对半。
- **ADR-009**: 动效时长全部落在 180~250ms 区间（胶囊 250 / 表单 220 / 错误条尺寸 220 + 淡入淡出 180），入曲线 `easeOutCubic`、出曲线 `easeInCubic`，符合守则 ≤400ms 物理自然曲线要求；原有 180ms 轻颤反馈节奏同量级，整体一致。

## 实际问题记录
- 错误条原实现中 `SizedBox(height: 14)` 与错误容器是条件展开的两个兄弟节点，`AnimatedSize` 收起时会残留 14px 空隙；已把间距并入错误子树的 `Padding(bottom: 14)`，空态返回 `SizedBox(width: double.infinity)` 保证宽度约束稳定。
