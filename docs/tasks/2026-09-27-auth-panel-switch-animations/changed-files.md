# 2026-09-27 · 登录面板切换动效完善 · 文件清单

## 修改
| 文件 | 说明 |
| --- | --- |
| `lib/features/auth/presentation/widgets/auth_glass_card.dart` | Tab 胶囊改 AnimatedAlign 滑动指示器（250ms）；标签文字改 AnimatedDefaultTextStyle 渐变；表单切换改 AnimatedSwitcher 淡入轻推（220ms）；错误条改 AnimatedSize + AnimatedSwitcher 平滑展开收起（220ms/180ms） |

## 新建
| 文件 | 说明 |
| --- | --- |
| `docs/p0-definition/auth-login/panel-switch-animations-definition.md` | 问题定义、范围与验收指标 |
| `docs/p1-design/auth-login/panel-switch-animations-design.md` | 三处动效方案与参数设计 |
| `docs/p2-development/auth-login/panel-switch-animations-development.md` | 原子 Todo、ADR-008/009 与实际问题记录 |
| `docs/p3-verification/auth-login/panel-switch-animations-verification.md` | analyze/test 结果与人工验收单 |
| `docs/tasks/2026-09-27-auth-panel-switch-animations/plan.md` | 任务诉求、决策论证与落地计划 |
| `docs/tasks/2026-09-27-auth-panel-switch-animations/changed-files.md` | 本文件清单 |
