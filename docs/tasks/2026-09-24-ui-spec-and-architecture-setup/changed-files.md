# 变更文件清单 (Changed Files Log)

> **任务标识**: `2026-09-24-ui-spec-and-architecture-setup`  
> **记录时间**: 2026-09-24  

---

## 1. 全局架构与顶层设计规范 (Global Directives · 保留在 docs/ 根目录)

| 文件路径 | 状态 | 作用与定位 |
|---|---|---|
| `docs/prd-mvp.md` | 保留于根目录 | 全局产品架构、用户画像、核心痛点与 MVP 功能边界底座 |
| `docs/tech-stack.md` | 保留于根目录 | 全局技术栈（Flutter + Supabase + Riverpod + Dio）选型与架构规范 |
| `docs/ui-design/` | 保留于根目录 | 全局 UI 设计系统（色彩、抗疲劳分级、动效、断点布局、图标系统）与各模块规范 |
| `docs/ui-design.md` | 保留于根目录 | 全局 UI 设计与交互规范总览文档 |
| `docs/tdd.md` | 保留于根目录 | 全局测试金字塔、TDD 流程、Mock 策略与质量保障规范 |
| `docs/README.md` | 新增 | 文档中心导航索引（清晰划分全局指导、功能流转与任务追溯） |

---

## 2. 新增文件 (Created)

| 文件路径 | 类型 | 内容描述 |
|---|---|---|
| `docs/tasks/README.md` | 规范文档 | 任务历史与对话追溯系统总览说明 |
| `docs/tasks/2026-09-24-ui-spec-and-architecture-setup/plan.md` | 任务记录 | 本次对话决策、组件讨论、架构规范落地计划 |
| `docs/tasks/2026-09-24-ui-spec-and-architecture-setup/changed-files.md` | 任务记录 | 本次任务产生的所有文件变动审计明细 |
| `docs/p0-definition/README.md` | 规范文档 | P0 阶段操作指引与功能专属子文件夹规范 |
| `docs/p1-design/README.md` | 规范文档 | P1 阶段操作指引与架构设计规范 |
| `docs/p2-development/README.md` | 规范文档 | P2 阶段任务拆解 Todo 与开发排错日志模板 |
| `docs/p3-verification/README.md` | 规范文档 | P3 阶段测试验收、静态分析与体验自查表 |
| `docs/p1-design/ui-design/modules/rest.md` | 业务设计 | 休息页（呼吸、考研木鱼、舒尔特方格、悬浮番茄钟）规范 |
| `docs/p1-design/ui-design/modules/auth.md` | 业务设计 | 登录页（自习室全景背景图、毛玻璃透光卡片、OAuth）规范 |
| `AGENTS.md` | 项目规范 | 项目级智能体操作守则与边界约束 |
| `/Users/allure/.claude/AGENTS.md` | 全局规范 | 全局智能体架构守则与单向数据流契约 |

---

## 3. 修改文件 (Modified)

| 文件路径 | 修改要点 |
|---|---|
| `CLAUDE.md` | 增加 P0-P3 流水线规范、功能独立子目录规范、任务回溯系统说明、架构模式定义 |
| `/Users/allure/.claude/CLAUDE.md` | 增加 Flutter/Dart 章节、Riverpod+Repo+Dio 规范、Dart 命名规范表 |
| `pubspec.yaml` | 引入 `flutter_riverpod` 与 `dio` 依赖，注册 `assets/` 静态资源 |
| `pubspec.lock` | 锁定新安装依赖版本 |
| `.gitignore` | 修正为官方标准 Flutter 规则，屏蔽本地生成与编译缓存 |
| `docs/p1-design/ui-design/00-overview.md` | 注册 rest 与 auth 模块设计文档索引 |
| `docs/p1-design/ui-design/modules/flashcards.md` | 细化 320ms 物理双层卡堆与惯性切卡动效 |
| `docs/p1-design/ui-design/modules/mistakes.md` | 规范卡片尺寸与连对 2 次消除流转动效 |
| `docs/p1-design/ui-design/modules/schools.md` | 规范双 Y 轴报录比折线图与 OCR+LLM 结构化抽取弹窗 |
| `docs/p1-design/ui-design/modules/ai-chat.md` | 规范坚挺明朗线条输入框与流式打字视口保护 |

---

## 4. Git 缓存清理 (Untracked from Index)

- `.dart_tool/*`（本地依赖图谱与构建缓存已从暂存区清理，保留本地文件）
- `.idea/workspace.xml`（本地 IDE 窗口配置已从暂存区清理，保留本地文件）
