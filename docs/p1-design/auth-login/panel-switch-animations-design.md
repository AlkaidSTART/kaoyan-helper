# P1 - 登录面板切换动效 · 设计

## 动效清单

| 位置 | 方案 | 参数 |
| --- | --- | --- |
| Tab 胶囊指示器 | `AnimatedAlign` + `FractionallySizedBox(widthFactor: 0.5)` 滑动白胶囊；标签文字 `AnimatedDefaultTextStyle` 颜色/字重渐变 | 250ms，`Curves.easeOutCubic` |
| 表单切换（验证码 ↔ 密码） | `AnimatedSwitcher` + `FadeTransition` + `SlideTransition`（水平 5% 轻推入） | 220ms，入 `easeOutCubic` / 出 `easeInCubic` |
| 错误提示条 | `AnimatedSize`（高度展开收起）内嵌 `AnimatedSwitcher`（默认淡入淡出），底部 14px 间距并入错误子树保证收起无残空 | 尺寸 220ms easeOutCubic；淡入淡出 180ms |

## 设计要点
- 两个输入框高度均为 46，`AnimatedSwitcher` 过渡期叠放不会引起布局跳动。
- Tab 结构从"双 Container 自绘选中底色"改为 Stack（胶囊层 + 标签层），选中底色由胶囊统一承载，标签层永远透明，才有"滑动"而非"跳变"。
- 错误条消失时 `AnimatedSize` 将下方表单平滑推回，消除视觉突跳。
- 原有 180ms 横向轻颤（校验失败反馈）保持不变，节奏与新动效同量级。
