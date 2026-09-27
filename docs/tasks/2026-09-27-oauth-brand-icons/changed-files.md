# 2026-09-27 · 第三方登录品牌图标升级 · 文件清单

## 修改
| 文件 | 说明 |
| --- | --- |
| `pubspec.yaml` | dependencies 新增 `font_awesome_flutter: ^11.0.0` |
| `lib/features/auth/presentation/widgets/oauth_button_row.dart` | 三处占位图标替换为 `FaIcon(FontAwesomeIcons.google/github/weixin)`，品牌色保持不变，尺寸上调至 22/24/24；后续按用户需求移除微信按钮，仅保留 Google / GitHub |

## 新建
| 文件 | 说明 |
| --- | --- |
| `docs/p0-definition/auth-login/brand-icons-definition.md` | 问题定义、范围与验收指标 |
| `docs/p1-design/auth-login/brand-icons-design.md` | 图标库选型对比与映射设计 |
| `docs/p2-development/auth-login/brand-icons-development.md` | 原子 Todo、ADR-004/005 与实际问题记录 |
| `docs/p3-verification/auth-login/brand-icons-verification.md` | analyze/test 结果与人工验收单 |
| `docs/tasks/2026-09-27-oauth-brand-icons/plan.md` | 任务诉求、决策论证与落地计划 |
| `docs/tasks/2026-09-27-oauth-brand-icons/changed-files.md` | 本文件清单 |
