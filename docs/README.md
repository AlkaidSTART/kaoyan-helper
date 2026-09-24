# 登科 · 文档中心索引 (Documentation Index)

本项目文档分为三层：**全局顶层指导规范**、**功能研发流转目录 (P0~P3)**、**任务会话回溯记录**。

---

## 一、全局顶层指导规范 (Global Directives)
项目底座规范，所有功能模块必须以此为基准，不得违背：

| 文档 | 作用与定位 |
|---|---|
| **[prd-mvp.md](prd-mvp.md)** | 全局产品架构、用户画像、核心痛点与 MVP 功能边界底座 |
| **[tech-stack.md](tech-stack.md)** | 全局技术栈（Flutter + Supabase + Riverpod + Dio）选型与架构规范 |
| **[ui-design/](ui-design/)** | 全局 UI 设计系统（色彩、抗疲劳分级、动效、断点布局、图标系统）与各模块规范 |
| **[tdd.md](tdd.md)** | 全局测试金字塔、TDD 流程、Mock 策略与质量保障规范 |

---

## 二、具体功能研发流转 (Feature Pipelines · P0 ~ P3)
任何新功能从立项到交付的四阶段演进。每个功能在此 4 个目录下分别建立同名专属子文件夹（如 `auth/`）：

```
docs/
  ├── p0-definition/<feature-name>/       # P0 定义：具体功能的实际痛点、场景边界与验收指标
  ├── p1-design/<feature-name>/           # P1 设计：具体功能的架构接口、数据模型与专属 UI 细节
  ├── p2-development/<feature-name>/      # P2 开发：具体功能的任务拆解 Todo、实际问题与排错日志
  └── p3-verification/<feature-name>/     # P3 验证：具体功能的测试报告、analyze 日志与验收单
```

- **[docs/p0-definition/](p0-definition/README.md)**：需求与痛点定义指引
- **[docs/p1-design/](p1-design/README.md)**：技术方案与详细设计指引
- **[docs/p2-development/](p2-development/README.md)**：任务拆解与开发日志指引
- **[docs/p3-verification/](p3-verification/README.md)**：测试验收与交付标准指引

### 已建立流转的功能模块：
- **CI/CD 流水线 (`ci-cd/`)**：
  - [P0 需求定义](p0-definition/ci-cd/README.md)
  - [P1 架构设计](p1-design/ci-cd/README.md)
  - [P2 任务拆解与决策](p2-development/ci-cd/README.md)
  - [P3 质量验证与验收](p3-verification/ci-cd/README.md)

---

## 三、任务与会话追溯系统 (Task & Session Logs)
记录每次对话/迭代的具体任务规划、技术决策以及变动文件明细：

- **[docs/tasks/](tasks/README.md)**：任务历史总览
  - [2026-09-24 全业务组件 UI/动效方案细化与架构规范固化](tasks/2026-09-24-ui-spec-and-architecture-setup/plan.md)
  - [2026-09-24 GitHub Actions CI/CD 流水线建设与规范落地](tasks/2026-09-24-github-ci-cd-pipeline/plan.md)
