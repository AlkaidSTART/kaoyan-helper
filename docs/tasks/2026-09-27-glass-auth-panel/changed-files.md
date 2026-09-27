# 2026-09-27 · 登录面板通透玻璃质感 · 文件清单

## 修改
| 文件 | 说明 |
| --- | --- |
| `lib/features/auth/presentation/widgets/auth_glass_card.dart` | 面板填充 80% 实色 → 暖白渐变 44%→22%；模糊 sigma 16→20；边框改 65% 白宽 1.2；Tab 栏容器、三处输入框、分隔线半透明化；错误提示条保持实色 |
| `lib/features/auth/presentation/widgets/oauth_button_row.dart` | 按钮填充 78%→45%、描边改 59% 白，与面板玻璃语言一致 |

## 新建
| 文件 | 说明 |
| --- | --- |
| `docs/p0-definition/auth-login/transparent-glass-panel-definition.md` | 问题定义、范围与验收指标 |
| `docs/p1-design/auth-login/transparent-glass-panel-design.md` | 玻璃配方参数表与不变性声明（含饱和度层设计修正记录） |
| `docs/p2-development/auth-login/transparent-glass-panel-development.md` | 原子 Todo、ADR-006/007 与实际问题记录 |
| `docs/p3-verification/auth-login/transparent-glass-panel-verification.md` | analyze/test 结果与人工验收单 |
| `docs/tasks/2026-09-27-glass-auth-panel/plan.md` | 任务诉求、决策论证与落地计划 |
| `docs/tasks/2026-09-27-glass-auth-panel/changed-files.md` | 本文件清单 |
