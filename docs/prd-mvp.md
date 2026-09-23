# 登科 · 考研助手 (DengKe) — MVP 产品需求文档 (PRD)

> **版本**: v3.0 | **最后更新**: 2026-09-20
> **状态**: 经讨论确认，架构已迁移至 Flutter + Supabase

---

## 1. 产品概要

### 1.1 产品定位

「登科 · 考研助手」是一款面向考研学生的一站式数字化备考平台。核心理念：**刷题→纠错→择校→记忆→答疑，全闭环覆盖考研备考的核心场景**。

客户端采用 Flutter 跨平台方案，一套代码交付 Android / iOS / Web / macOS / Windows 五端；后端依托 Supabase 全托管，实现 Auth、数据库、API、Edge Functions 的零运维。

### 1.2 目标用户画像

| 维度 | 描述 |
|---|---|
| **身份** | 大三/大四在校生、二战/在职考研群体 |
| **科目覆盖** | 公共课（英语一/二、政治、数学一/二/三）+ 统考专业课（408 计算机等） |
| **使用场景** | 手机碎片时间背单词、iPad 刷题、笔记本电脑集中复习、macOS/Windows 桌面端答疑 |
| **核心需求** | 高效刷题、科学纠错、报录比辅助择校、抗遗忘背诵、疑难点即时答疑 |

### 1.3 核心痛点与产品解法

| 痛点 | 现状 | 登科的解法 |
|---|---|---|
| 题目零散，做完即忘 | 散落在纸质书、PDF、各类 App 之间，无统一错题归纳 | 统一题库 + 自动错题归集 + 连续 2 次正确消题机制 |
| 择校信息碎片化 | 各校官网格式不一，报录比需手动收集 Excel 对比 | 结构化院校库 + 多维筛选 + 报录比趋势可视化 |
| 背了就忘 | 单词本、考点笔记缺乏科学复习节奏 | SM-2 间隔复习算法 + 每日打卡闭环 |
| 答疑无门槛高 | 考研答疑社群质量参差、名师一对一成本高昂 | AI 助教即时答疑，基于题目上下文精准追问 |

### 1.4 技术架构总览

```
┌─────────────────────────────────────────────────────────┐
│                     Flutter Client                       │
│          (Android / iOS / Web / macOS / Windows)          │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────┐  │
│  │ Riverpod │  │ GoRouter │  │flutter_l10n│  │ Dio/   │  │
│  │  State   │  │ Routing  │  │   i18n     │  │ HTTP   │  │
│  └──────────┘  └──────────┘  └───────────┘  └────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS / JWT
                        ▼
┌─────────────────────────────────────────────────────────┐
│                   Supabase (Fully Managed)                │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────┐  │
│  │   Auth   │  │PostgreSQL│  │ PostgREST  │  │  Edge  │  │
│  │(JWT/OAuth)│  │  + RLS   │  │  (REST API)│  │Functions│  │
│  └──────────┘  └──────────┘  └───────────┘  └────┬───┘  │
└──────────────────────────────────────────────────┼──────┘
                                                   │
                        ┌──────────────────────────┼───────┐
                        │                          ▼       │
                        │  ┌──────────┐  ┌──────────────┐  │
                        │  │ Upstash  │  │ DeepSeek API │  │
                        │  │  Redis   │  │  (AI Tutor)  │  │
                        │  │(Rate Lim)│  │              │  │
                        │  └──────────┘  └──────────────┘  │
                        │        External Services         │
                        └──────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│            Admin Dashboard (Separate Project)             │
│         Next.js + Vercel — 仅 Web，admin 角色访问          │
└─────────────────────────────────────────────────────────┘
```

### 1.5 技术选型明细

| 层级 | 选型 | 说明 |
|---|---|---|
| **客户端框架** | Flutter (Dart) | 一套代码 → Android / iOS / Web / macOS / Windows |
| **状态管理** | Riverpod | 类型安全、声明式、可测试 |
| **路由** | GoRouter | 声明式路由，深度链接支持 |
| **网络请求** | supabase_flutter SDK + Dio | Supabase SDK 处理 Auth/DB，Dio 处理 SSE 流 |
| **后端** | Supabase | Auth + PostgreSQL + PostgREST + Edge Functions，全托管 |
| **AI** | DeepSeek API | 通过 Supabase Edge Functions (Deno) 代理，SSE streaming |
| **缓存/限流** | Upstash Redis | Token Bucket 算法，30 次/日/用户 |
| **国际化** | flutter_localizations + ARB | 中/英双语 |
| **管理后台** | Next.js (独立项目) | 部署在 Vercel，通过 Supabase Service Role Key 访问数据 |

---

## 2. MVP 功能范围

### 2.1 功能矩阵与优先级

MVP 六模块全上，管理后台作为独立项目同步交付。

| 模块 | 功能清单 | 优先级 | MVP 边界说明 |
|---|---|---|---|
| **M0 用户与认证** | Email magic link（Supabase 发送验证码）+ GitHub/Google/Apple OAuth、用户资料、目标院校设定、角色权限（user/admin） | P0 | Supabase Auth 驱动，无密码登录 |
| **M1 题库与错题** | 科目/章节/年份浏览、单选/多选作答、即时判分、解析展示、自动归入错题本、错题消灭流（连续 2 次正确→掌握）、UGC 题目上传（公有/私有） | P0 | MVP 使用 mock 题库数据；UGC 为手动录入表单 |
| **M2 择校报录** | 院校库列表、多维筛选（地区/985/211/专业代码）、报录比+趋势图、设为目标 | P0 | MVP 使用 mock 院校数据（~50 所热门院校样本） |
| **M3 记忆背诵** | 英语高频词卡、政治必背考点卡、简化 SM-2 间隔复习、翻转卡片交互、每日打卡连续天数 | P0 | MVP 内置约 200 张样例卡片（100 词 + 100 考点） |
| **M4 AI 答疑** | 题旁上下文追问、独立对话页、科目预设 System Prompt、SSE 流式输出、Markdown+LaTeX 渲染、每日 30 次配额 | P0 | DeepSeek API，Supabase Edge Function 流式代理 |
| **M5 管理后台** | 题库 CRUD 与批量导入、用户管理与封禁、数据看板（DAU/答题量/AI 用量）、UGC 审核队列 | P0 | 独立 Next.js 项目，部署在 Vercel，RBAC 限 admin 角色 |
| **M6 国际化** | 中/英双语切换 | P0 | flutter_localizations + ARB 文件，UI 文案双语，内容不翻译 |

### 2.2 明确不做的 (Out of Scope for MVP)

| 功能 | 延后理由 | 预计版本 |
|---|---|---|
| 暗色模式 | 减少 50% 样式/主题工作量，MVP 专注功能验证 | v1.1 |
| 爬虫题库采集 | 需处理反爬、版权、数据清洗，MVP 先验证交互体验 | v1.2 |
| 第三方题库 API 对接 | 多数平台无公开 API，需商务合作 | v1.3+ |
| 付费会员 / 支付 | MVP 先跑用户量和留存率 | v2.0 |
| 桌面端原生特性 | macOS/Windows 端 MVP 仅作为 Flutter 默认产物，不做平台专属功能（如菜单栏、Tray） | v2.0+ |
| 社区 / 讨论区 | 非核心备考场景，增加社交审核复杂度 | v2.0+ |
| 模拟考试 (限时/组卷) | 需要组卷算法和计时引擎，复杂度高 | v1.2 |

---

## 3. 核心业务流程

### 3.1 用户注册与目标设定

```
[首次打开 App] → [Welcome 引导页]
                        │
                        ▼
                 [选择登录方式]
                        │
        ┌───────────────┴────────────────┐
        ▼                                ▼
[邮箱 Magic Link]              [OAuth 一键登录]
        │                      (GitHub/Google/Apple)
        ▼                                │
[输入邮箱]                               │
        │                                │
        ▼                                │
[Supabase 发送验证码邮件]                 │
        │                                │
        ▼                                │
[用户输入 6 位验证码]                     │
        │                                │
        └───────────────┬────────────────┘
                        ▼
              [Supabase Auth 返回 JWT]
              [supabase_flutter 自动持久化 Session]
                        │
                        ▼
              [检查是否首次登录]
                        │
            ┌───────────┴───────────────┐
            ▼                           ▼
      [是: 引导设定目标]          [否: 进入首页]
            │
            ▼
      [选择目标院校 + 专业]
      (可跳过，稍后设置)
            │
            ▼
      [进入仪表盘首页]
```

### 3.2 刷题 → 错题 → AI 答疑闭环

这是产品最核心的价值闭环：

```
[首页仪表盘] → [选择科目]
                    │
                    ▼
         [选择筛选维度: 章节 / 年份]
                    │
                    ▼
            [展示题目卡片]
            [顶部: 进度 3/20]
                    │
                    ▼
         [用户点选答案选项]
                    │
                    ▼
              [提交答案]
                    │
        ┌───────────┴──────────────────┐
        ▼                              ▼
  [✅ 答对]                      [❌ 答错]
  [显示"正确!"反馈]              [显示正确答案高亮]
        │                              │
        ▼                              ▼
  [进度+1, 下一题]            [自动写入 mistake_records]
                                [error_count=1]
                                [status=active]
                                       │
                                       ▼
                              [展开解析面板]
                              [显示官方解析文本]
                                       │
                            ┌──────────┴──────────┐
                            ▼                     ▼
                     [看完, 下一题]         [⚡ 召唤 AI 答疑]
                                                  │
                                                  ▼
                                        [打开 AI 对话 Sheet]
                                        [System Prompt 注入:]
                                        [题干+选项+用户答案]
                                        [+正确答案+解析]
                                                  │
                                                  ▼
                                        [DeepSeek SSE 流式回复]
                                        [Markdown + LaTeX 渲染]
                                        [支持多轮追问]
```

### 3.3 错题消灭流 (状态机驱动)

```
[错题本页面] → [按错误次数降序排列]
                    │
                    ▼
         [展示错题卡片 (仅 status=active)]
                    │
                    ▼
            [用户重新作答]
                    │
        ┌───────────┴──────────────────────┐
        ▼                                  ▼
  [❌ 又答错]                         [✅ 答对]
  error_count++                    consecutive_correct++
  consecutive_correct = 0                  │
        │                      ┌───────────┴───────────┐
        ▼                      ▼                       ▼
  [留在错题本]         [consecutive_correct < 2]  [consecutive_correct >= 2]
  [展示解析]           [留在错题本, 继续练]       [🎉 status → mastered]
                                                 [mastered_at = now()]
                                                 [移出活跃列表]
                                                       │
                                                       ▼
                                            [用户可手动 re-activate]
                                            ["我还没掌握" → status=active]
                                            [consecutive_correct = 0]
```

**状态机转移表**：

| 当前状态 | 事件 | 目标状态 | 字段变更 |
|---|---|---|---|
| (不存在) | 首次答错 | `active` | 创建记录: `error_count=1, consecutive_correct=0` |
| `active` | 再次答错 | `active` | `error_count++, consecutive_correct=0` |
| `active` | 重练答对 | `active` | `consecutive_correct++` |
| `active` | `consecutive_correct >= 2` | `mastered` | `status='mastered', mastered_at=now()` |
| `mastered` | 用户手动重置 | `active` | `consecutive_correct=0` |

### 3.4 择校决策链路

```
[择校页面] → [组合筛选面板]
              ┌──────────────────────────────────┐
              │ 地区: [全部▾]  类型: [985☐ 211☐]  │
              │ 专业代码: [输入搜索...]            │
              └──────────────────────────────────┘
                    │
                    ▼
         [院校列表 (支持按报录比排序)]
         ┌──────────────────────────────────┐
         │ 📍 北京大学 · 计算机科学 · 985     │
         │    报录比 15:1 🔴 · 分数线 380    │
         │ 📍 华中科技 · 电子信息 · 985       │
         │    报录比  8:1 🟠 · 分数线 340    │
         │ 📍 苏州大学 · 软件工程 · 211       │
         │    报录比  4:1 🟢 · 分数线 310    │
         └──────────────────────────────────┘
                    │
                    ▼ (点击某院校)
         [展开详情: 近 3 年报录比折线图]
         [招生计划 / 报考人数 / 录取人数 / 分数线]
                    │
                    ▼
         [⭐ 设为目标院校]
                    │
                    ▼
         [首页仪表盘展示目标院校信息]
```

**报录比计算与展示**：
- `ratio = applicants / enrolled`，`enrolled` 为 0 时返回 `null` 不展示比值（严禁除零）
- 展示格式: "N:1"，附带难度色标:
  - ratio < 5 → 🟢 较易
  - 5 ≤ ratio ≤ 10 → 🟠 适中
  - ratio > 10 → 🔴 竞争激烈

### 3.5 每日记忆打卡流

```
[首页仪表盘]
┌──────────────────────────────┐
│ 📚 今日待复习: 42 张          │
│ 🔥 连续打卡: 12 天            │
│        [开始复习 →]           │
└──────────────────────────────┘
        │
        ▼ (点击"开始复习")
[进入背诵模块]
        │
        ▼
[展示卡片正面]
┌──────────────────────────────┐
│                              │
│        abandon               │
│        /əˈbændən/            │
│                              │
│       (点击翻转 ↻)            │
└──────────────────────────────┘
        │
        ▼ (点击翻转, 60fps 3D 翻转动画)
[展示卡片背面]
┌──────────────────────────────┐
│  vt. 放弃；遗弃；沉溺于        │
│                              │
│  例: abandon hope             │
│  同义: give up, desert        │
└──────────────────────────────┘
        │
        ▼
[底部评级操作栏]
┌──────────┬──────────┬──────────┐
│ 🔴 忘记   │ 🟡 模糊   │ 🟢 记住   │
│ 今日重排  │ 明天复习   │ 延长间隔   │
└──────────┴──────────┴──────────┘
        │
        ▼ (选择评级后)
[SM-2 算法计算 next_review_at]
[下一张卡片]
[顶部进度: 23/42]
        │
        ▼ (全部完成)
[🎉 打卡成功!]
[写入 check_in_records]
[更新连续天数展示]
```

### 3.6 AI 答疑独立对话流

```
[底部导航: AI 答疑 Tab]
        │
        ▼
[选择科目]
┌─────────┬─────────┬─────────┬──────────┐
│  政治    │  英语    │  数学    │ 专业课   │
└─────────┴─────────┴─────────┴──────────┘
        │
        ▼
[进入对话页]
[加载科目专属 System Prompt]
        │
        ▼
[用户输入问题]
        │
        ▼
[发送至 Supabase Edge Function]
        │
        ▼
[Edge Function 流程:]
  1. JWT 验证
  2. Upstash Redis Token Bucket 限流检查 (30/天)
     ├── 超限 → 返回 429 + "今日提问次数已用完，明天再来"
     └── 通过 ↓
  3. 构造 DeepSeek API 请求 (max_tokens: 2048)
  4. SSE streaming 透传回客户端
        │
        ▼
[Flutter 端消费 SSE 流]
[逐字渲染, Markdown + KaTeX LaTeX 支持]
[支持多轮追问]
        │
        ▼
[显示剩余次数: "今日剩余 27/30 次"]
```

---

## 4. 详细功能规范

### 4.1 M0 用户与认证

#### 4.1.1 注册登录

- **邮箱 Magic Link (OTP)**：用户输入邮箱 → Supabase Auth 发送 6 位验证码 → 用户输入验证码完成登录/注册（新邮箱自动注册）。不做独立密码登录，验证码即认证。
- **OAuth 登录**：GitHub、Google、Apple 三方。`supabase_flutter` SDK 原生支持，调用 `supabase.auth.signInWithOAuth()` 调起系统浏览器或 In-App WebView。
- **Session 持久化**：`supabase_flutter` 自动使用 `SharedPreferences` (移动端) / `localStorage` (Web) 持久化 JWT，支持 token 自动刷新。
- **MVP 不做**：手机号+短信登录（短信服务费用、国内实名合规成本高）。

#### 4.1.2 用户资料与目标

- 字段：昵称、头像（默认生成）、目标院校（主目标 1 + 备选 2）、目标专业、预计考试年份。
- 首次登录强引导设置目标院校（可跳过）。
- 资料存储在 Supabase `users` 表（public schema，通过 trigger 从 `auth.users` 同步创建）。

#### 4.1.3 角色与权限

- `user`：普通用户，访问客户端全部功能。
- `admin`：管理员，额外可登录管理后台。通过 `users.role` 字段标识（默认 `'user'`），不做管理员自助注册，由数据库直接修改。
- **RLS 策略**：所有表开启 Row Level Security，`user` 角色仅能访问自己的数据，公共数据（题库、院校库）通过 `anon` / `authenticated` 策略开放只读。

### 4.2 M1 题库与错题

#### 4.2.1 题库数据策略

**MVP 阶段**：使用 seed 数据，每科 10~20 道样例题，覆盖所有题型（单选、多选）。重点验证交互体验，不追求内容量。

**后续数据来源（按优先级）**：
1. **用户上传 (UGC)**：用户通过表单录入题干+选项+解析，选择公有（所有人可见，需管理员审核）或私有（仅自己可见）。
2. **爬虫采集**：v1.2 版本，爬取公开教育资源站点。
3. **第三方接口**：v1.3+，视合作情况接入。

#### 4.2.2 题目展示与作答交互

```
┌──────────────────────────────────────┐
│  政治 · 马克思主义基本原理 · 2024 真题  │
│  第 3 题 / 共 20 题                    │
│──────────────────────────────────────│
│                                      │
│  唯物辩证法的实质和核心是（  ）         │
│                                      │
│  ○ A. 质量互变规律                     │
│  ● B. 对立统一规律        ← 用户选择   │
│  ○ C. 否定之否定规律                   │
│  ○ D. 联系和发展的规律                 │
│                                      │
│           [确认提交]                   │
│──────────────────────────────────────│
│  ✅ 回答正确!                          │
│                                      │
│  📖 解析:                             │
│  对立统一规律揭示了事物发展的源泉和      │
│  动力，是唯物辩证法的实质和核心...       │
│                                      │
│  [⚡ AI 深度讲解]        [下一题 →]    │
└──────────────────────────────────────┘
```

- **单选**：RadioButton 组，选中后可切换，点击"确认提交"判分。
- **多选**：Checkbox 组，选中后点击"确认提交"判分，需全部选对才算正确。
- **判分逻辑**：纯前端比对 `user_answer` 与 `answer` 字段，即时反馈。
- **解析展示**：提交后展开解析区域，支持 Markdown + LaTeX 渲染。

#### 4.2.3 UGC 题目上传

- 用户通过录入表单提交：科目、章节、题型、题干、选项（JSON）、正确答案、解析。
- 选择可见性：
  - **私有**：`is_public=false`，仅创建者可见，无需审核。
  - **公有**：`is_public=true, is_approved=false`，提交后进入管理后台审核队列。
- RLS 策略保证：私有题目 `creator_id = auth.uid()` 才可读取；公有题目 `is_approved=true` 才对其他用户可见。

### 4.3 M2 择校报录

#### 4.3.1 筛选维度

| 筛选字段 | 类型 | 说明 |
|---|---|---|
| `province` | 多选下拉 | 按省份筛选 |
| `region` | 单选 | 一区 / 二区（影响国家线） |
| `is_985` | 开关 | 985 院校 |
| `is_211` | 开关 | 211 院校 |
| `major_code` | 文本搜索 | 专业代码模糊搜索，如 "0854" |

筛选条件组合使用 AND 逻辑，通过 Supabase PostgREST 的 query filter 实现。

#### 4.3.2 趋势图

- 展示某院校某专业近 3 年数据：报录比、分数线、招生人数。
- 使用 `fl_chart` (Flutter 图表库) 绘制折线图。
- 数据来源：`school_programs` 表按 `year` 聚合。

#### 4.3.3 目标管理

- 每个用户最多保存 1 个主目标 + 2 个备选目标。
- 目标存储在 `users` 表的 `target_schools` (jsonb) 字段。
- 首页仪表盘展示主目标院校名称、分数线、考研倒计时。

### 4.4 M3 记忆背诵

#### 4.4.1 间隔复习算法 (简化 SM-2)

```
输入: rating ∈ {forgot, fuzzy, remembered}

if rating == forgot:
    interval = 0              // 今日重新排入队列
    repetitions = 0
    ease_factor = max(1.3, ease_factor - 0.2)

if rating == fuzzy:
    interval = 1              // 明天复习
    repetitions = 0
    ease_factor = max(1.3, ease_factor - 0.1)

if rating == remembered:
    if repetitions == 0:
        interval = 1          // 首次记住: 明天
    elif repetitions == 1:
        interval = 3          // 第二次记住: 3 天后
    else:
        interval = round(prev_interval * ease_factor)
    repetitions += 1
    ease_factor += 0.1

next_review_at = now() + interval * 24h
```

**算法参数边界**：
- `ease_factor` 初始值: 2.5
- `ease_factor` 下限: 1.3（防止间隔收缩过快）
- `ease_factor` 无上限（随记忆巩固自然增长）
- `interval` 无上限（长期记忆的卡片间隔可达数月）

#### 4.4.2 卡片翻转交互

- 使用 Flutter `AnimatedBuilder` + `Matrix4` 实现 3D 翻转效果。
- 要求 60fps 流畅，翻转动画时长 300ms。
- 正面：单词/考点标题。
- 背面：释义、例句、解析。
- 支持左右滑动切换上一张/下一张。

#### 4.4.3 打卡机制

- 每日登录自动计算"今日待复习量"（`next_review_at <= today`）。
- 完成全部待复习卡片即打卡成功，写入 `check_in_records`。
- 连续天数计算：查询最近连续不间断的 `check_in_records` 记录。
- 仪表盘展示：连续打卡天数、总复习卡片数。

### 4.5 M4 AI 答疑助教

#### 4.5.1 两种交互入口

**1. 题旁上下文追问**

做题/错题解析页面的"⚡ AI 深度讲解"按钮，点击后打开底部 Sheet，自动构造 System Prompt：

```
你是一位考研{subject}辅导老师。学生正在做以下题目：

【题干】{stem}
【选项】{options}
【学生选择】{userAnswer}
【正确答案】{correctAnswer}
【参考解析】{explanation}

请帮助学生深入理解这道题，用通俗易懂的方式解释为什么正确答案是正确的，
学生的选择为什么是错误的。如果涉及公式请使用 LaTeX 格式。
```

**2. 独立对话页**

底部导航"AI 答疑"Tab，用户选择科目后进入自由对话。预设科目 System Prompt：

| 科目 | System Prompt 要点 |
|---|---|
| 政治 | 考研政治辅导老师，擅长马原/毛中特/近代史/思修，回答需引用教材原文 |
| 英语 | 考研英语辅导老师，擅长阅读理解/完型/翻译/写作，可进行语法分析 |
| 数学 | 考研数学辅导老师，擅长高数/线代/概率论，解题步骤需详尽，公式用 LaTeX |
| 专业课 | 考研计算机(408)辅导老师，擅长数据结构/操作系统/计网/组成原理 |

#### 4.5.2 SSE 流式输出 (Supabase Edge Function)

Edge Function (Deno Runtime) 职责：
1. 验证 JWT（从 `Authorization` header 提取）
2. Upstash Redis Token Bucket 限流检查（每用户每日 30 次）
3. 构造 DeepSeek API 请求（`max_tokens: 2048`，`stream: true`）
4. SSE streaming 透传回客户端

Flutter 端消费 SSE：
- 使用 `Dio` + `ResponseType.stream` 接收 SSE 流。
- 解析 `data: {...}` 行，逐 token 更新 UI。
- 使用 `flutter_markdown` + `flutter_math_fork` 渲染 Markdown + LaTeX。

#### 4.5.3 限流与成本控制

- **限流方案**：Upstash Redis Token Bucket，每用户每日 30 次问答。
- **Key 设计**：`rate_limit:{user_id}:{yyyy-mm-dd}`，TTL 24h。
- **超限响应**：HTTP 429 + JSON body `{"error": "daily_limit_exceeded", "message": "今日提问次数已用完，明天再来"}`。
- **单次 token 上限**：`max_tokens: 2048`，防止超长回复导致费用失控。
- **API Key 安全**：DeepSeek API Key 存储在 Supabase Edge Function 环境变量，永不暴露给客户端。

### 4.6 M5 管理后台

独立 Next.js 项目，部署在 Vercel。通过 Supabase Service Role Key（服务端 only）绑定同一 Supabase 项目，绕过 RLS 直接操作数据库。

**访问控制**：登录使用同一套 Supabase Auth，验证 JWT 后检查 `users.role === 'admin'`，非 admin 返回 403。

| 子模块 | 功能 | MVP 范围 |
|---|---|---|
| **题库管理** | 题目 CRUD、批量 JSON/CSV 导入、上下架、按科目/题型筛选 | 完整 CRUD + 单文件导入 |
| **用户管理** | 用户列表、搜索、查看详情、封禁/解封 | 列表 + 封禁操作 |
| **数据看板** | DAU/WAU、今日答题量、AI 调用次数/成本估算、热门错题 Top 10 | 基础统计卡片 + 简单图表 |
| **UGC 审核** | 待审核公有题目队列（`is_public=true AND is_approved=false`）、通过/驳回 | 审核列表 + 通过/驳回 |

### 4.7 M6 国际化

- **框架**：`flutter_localizations` + ARB 文件（`app_zh.arb`, `app_en.arb`）。
- **范围**：UI 文案（按钮、菜单、提示语、错误消息）双语。题目/卡片内容本身不翻译。
- **默认语言**：中文。
- **切换方式**：设置页手动切换，通过 Riverpod Provider 管理 locale 状态。

---

## 5. 数据模型定义

### 5.1 ER 关系总览

```
┌──────────┐       ┌─────────────────┐       ┌──────────────────┐
│  users   │       │   questions     │       │ mistake_records  │
│──────────│       │─────────────────│       │──────────────────│
│ id (PK)  │──┐    │ id (PK)         │──┐    │ id (PK)          │
│ role     │  │    │ subject         │  │    │ user_id (FK)     │──→ users
│ nickname │  │    │ chapter         │  │    │ question_id (FK) │──→ questions
│ target_  │  │    │ type            │  │    │ error_count      │
│  schools │  │    │ stem            │  │    │ consecutive_     │
│ ...      │  │    │ options         │  │    │   correct        │
└──────────┘  │    │ answer          │  │    │ status           │
              │    │ source          │  │    │ mastered_at      │
              │    │ creator_id (FK) │──┘    │ ...              │
              │    │ is_public       │       └──────────────────┘
              │    │ is_approved     │
              │    │ ...             │
              │    └─────────────────┘
              │
              │    ┌─────────────────┐       ┌──────────────────┐
              │    │    schools      │       │ school_programs  │
              │    │─────────────────│       │──────────────────│
              │    │ id (PK)         │──┐    │ id (PK)          │
              │    │ name            │  └───→│ school_id (FK)   │
              │    │ province        │       │ major_code       │
              │    │ is_985, is_211  │       │ year             │
              │    │ ...             │       │ applicants       │
              │    └─────────────────┘       │ enrolled         │
              │                              │ admission_score  │
              │                              │ ...              │
              │                              └──────────────────┘
              │
              │    ┌─────────────────┐       ┌──────────────────┐
              │    │ memorize_cards  │       │user_card_progress│
              │    │─────────────────│       │──────────────────│
              │    │ id (PK)         │──┐    │ id (PK)          │
              │    │ category        │  └───→│ card_id (FK)     │
              │    │ front           │       │ user_id (FK)     │──→ users
              │    │ back            │       │ repetitions      │
              │    │ tags            │       │ ease_factor      │
              │    │ source          │       │ interval         │
              │    │ creator_id (FK) │       │ next_review_at   │
              │    │ ...             │       │ ...              │
              │    └─────────────────┘       └──────────────────┘
              │
              │    ┌──────────────────┐
              └───→│check_in_records  │
                   │──────────────────│
                   │ id (PK)          │
                   │ user_id (FK)     │
                   │ checked_in_at    │
                   │ cards_reviewed   │
                   │ ...              │
                   └──────────────────┘
```

### 5.2 表定义明细

#### users

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | 与 `auth.users.id` 同步 |
| `email` | `varchar(255)` | UNIQUE, NOT NULL | 登录邮箱 |
| `nickname` | `varchar(100)` | | 昵称 |
| `avatar_url` | `text` | | 头像 URL |
| `role` | `varchar(20)` | DEFAULT `'user'`, CHECK IN (`'user'`, `'admin'`) | 角色 |
| `target_schools` | `jsonb` | DEFAULT `'[]'` | 目标院校 JSON，如 `[{"school_id": "...", "type": "primary"}]` |
| `exam_year` | `int` | | 预计考试年份 |
| `is_banned` | `boolean` | DEFAULT `false` | 封禁状态 |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

#### questions

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `subject` | `varchar(20)` | NOT NULL, CHECK IN (`'politics'`, `'english'`, `'math'`, `'cs408'`) | 科目 |
| `chapter` | `varchar(200)` | | 章节/知识点分类 |
| `year` | `int` | | 真题年份，NULL = 非真题 |
| `type` | `varchar(20)` | NOT NULL, CHECK IN (`'single_choice'`, `'multiple_choice'`) | 题型 |
| `stem` | `text` | NOT NULL | 题干，支持 Markdown + LaTeX |
| `options` | `jsonb` | NOT NULL | `[{"key": "A", "content": "..."}, ...]` |
| `answer` | `varchar(10)` | NOT NULL | 正确答案: `"B"` 或 `"ACD"` |
| `explanation` | `text` | | 官方解析 |
| `difficulty` | `varchar(10)` | CHECK IN (`'easy'`, `'medium'`, `'hard'`) | 难度 |
| `source` | `varchar(10)` | DEFAULT `'official'`, CHECK IN (`'official'`, `'ugc'`) | 来源 |
| `creator_id` | `uuid` | FK → `users.id`, NULLABLE | UGC 上传者 |
| `is_public` | `boolean` | DEFAULT `false` | UGC 公有/私有 |
| `is_approved` | `boolean` | DEFAULT `false` | 管理员审核状态 |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |
| `deleted_at` | `timestamptz` | | 软删除 |

**RLS 策略**：
- `SELECT`：`source='official'` OR (`source='ugc'` AND `is_public=true` AND `is_approved=true`) OR `creator_id = auth.uid()`
- `INSERT`：`auth.uid() IS NOT NULL`，强制 `creator_id = auth.uid()`、`source = 'ugc'`
- `UPDATE/DELETE`：`creator_id = auth.uid()` OR admin role

#### mistake_records

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `user_id` | `uuid` | FK → `users.id`, NOT NULL | |
| `question_id` | `uuid` | FK → `questions.id`, NOT NULL | |
| `error_count` | `int` | DEFAULT `1` | 累计错误次数 |
| `consecutive_correct` | `int` | DEFAULT `0` | 连续正确次数 |
| `status` | `varchar(10)` | DEFAULT `'active'`, CHECK IN (`'active'`, `'mastered'`) | 状态 |
| `mastered_at` | `timestamptz` | | 掌握时间 |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**索引**：`UNIQUE(user_id, question_id)` — 同一用户同一题只有一条错题记录。

**RLS 策略**：`user_id = auth.uid()`（仅操作自己的错题）。

#### schools

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `name` | `varchar(100)` | NOT NULL | 校名 |
| `province` | `varchar(20)` | NOT NULL | 省份 |
| `region` | `varchar(10)` | CHECK IN (`'一区'`, `'二区'`) | 国家线区域 |
| `is_985` | `boolean` | DEFAULT `false` | |
| `is_211` | `boolean` | DEFAULT `false` | |
| `is_double_first_class` | `boolean` | DEFAULT `false` | 双一流 |
| `is_self_marking` | `boolean` | DEFAULT `false` | 自主划线 |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**RLS 策略**：`authenticated` 角色只读。

#### school_programs

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `school_id` | `uuid` | FK → `schools.id`, NOT NULL | |
| `college_name` | `varchar(100)` | | 学院名称 |
| `major_code` | `varchar(20)` | NOT NULL | 专业代码，如 `"085400"` |
| `major_name` | `varchar(100)` | NOT NULL | 专业名称，如 `"电子信息"` |
| `year` | `int` | NOT NULL | 数据年份 |
| `planned` | `int` | | 招生计划数 |
| `applicants` | `int` | | 报考人数 |
| `enrolled` | `int` | | 录取人数 |
| `admission_score` | `int` | | 复试分数线 |
| `national_score` | `int` | | 当年国家线 |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**索引**：`INDEX(school_id, major_code, year)`。

**RLS 策略**：`authenticated` 角色只读。

#### memorize_cards

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `category` | `varchar(20)` | NOT NULL, CHECK IN (`'english_word'`, `'politics_point'`, `'custom'`) | 分类 |
| `front` | `text` | NOT NULL | 正面（单词/考点提问） |
| `back` | `text` | NOT NULL | 背面（释义+例句/答案+解析） |
| `tags` | `text[]` | | 标签，如 `{"高频", "马原", "CET-6"}` |
| `source` | `varchar(10)` | DEFAULT `'system'`, CHECK IN (`'system'`, `'ugc'`) | 来源 |
| `creator_id` | `uuid` | FK → `users.id`, NULLABLE | UGC 创建者 |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**RLS 策略**：`source='system'` 公开只读；`source='ugc'` 仅 `creator_id = auth.uid()` 可见。

#### user_card_progress

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `user_id` | `uuid` | FK → `users.id`, NOT NULL | |
| `card_id` | `uuid` | FK → `memorize_cards.id`, NOT NULL | |
| `repetitions` | `int` | DEFAULT `0` | SM-2 复习次数 |
| `ease_factor` | `float` | DEFAULT `2.5` | SM-2 难度因子 |
| `interval` | `int` | DEFAULT `0` | 当前间隔天数 |
| `next_review_at` | `timestamptz` | | 下次复习时间 |
| `last_reviewed_at` | `timestamptz` | | 上次复习时间 |
| `created_at` | `timestamptz` | DEFAULT `now()` | |
| `updated_at` | `timestamptz` | DEFAULT `now()` | |

**索引**：`UNIQUE(user_id, card_id)`；`INDEX(user_id, next_review_at)` — 高效查询"今日待复习"。

**RLS 策略**：`user_id = auth.uid()`。

#### check_in_records

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `user_id` | `uuid` | FK → `users.id`, NOT NULL | |
| `checked_in_at` | `date` | NOT NULL | 打卡日期 |
| `cards_reviewed` | `int` | NOT NULL | 当日复习卡片数 |
| `created_at` | `timestamptz` | DEFAULT `now()` | |

**索引**：`UNIQUE(user_id, checked_in_at)` — 每用户每天最多一条打卡记录。

**RLS 策略**：`user_id = auth.uid()`。

---

## 6. 非功能性需求

### 6.1 性能指标

| 指标 | 目标值 | 实现手段 |
|---|---|---|
| App 启动（冷启动到可交互） | < 2s | Flutter AOT 编译 + 延迟初始化非关键模块 |
| 普通 API 响应 (P95) | < 200ms | Supabase PostgREST + 合理索引 + 分页 |
| AI 首 token 延迟 (TTFT) | < 1.0s | Supabase Edge Function (Deno, 全球边缘节点) + DeepSeek API |
| 卡片翻转动画帧率 | 60fps | Flutter `Matrix4` 硬件加速 3D transform |
| 列表滚动帧率 | 60fps | `ListView.builder` 懒加载 + 合理 widget 粒度 |

### 6.2 安全

- **认证**：Supabase Auth JWT，`supabase_flutter` SDK 自动管理 token 生命周期（存储、刷新、过期）。
- **授权**：所有表开启 RLS (Row Level Security)，策略在 5.2 各表定义中已列明。
- **API Key 隔离**：
  - 客户端仅持有 Supabase `anon` key（公开安全，受 RLS 保护）。
  - DeepSeek API Key、Upstash Redis Token 等敏感凭证仅存在于 Supabase Edge Function 环境变量。
  - 管理后台使用 Supabase `service_role` key（服务端 only，Vercel 环境变量）。
- **输入校验**：Flutter 端使用 `FormValidator`，Supabase 端依赖 PostgreSQL CHECK 约束 + RLS。
- **传输安全**：全链路 HTTPS，Supabase 默认强制。

### 6.3 国际化

- **框架**：`flutter_localizations` + ARB 文件。
- **范围**：UI 文案（按钮、菜单、提示语、错误消息、空状态文案）双语。题目/卡片内容本身不翻译。
- **默认语言**：中文（`zh`）。
- **切换**：设置页手动切换，Riverpod Provider 管理 `Locale` 状态，`MaterialApp.locale` 响应变化。

### 6.4 可观测性

- **客户端日志**：Flutter `logger` 包，开发环境打印，生产环境静默（或接入 Sentry/Crashlytics，v1.1）。
- **Edge Function 日志**：Supabase Dashboard 内置日志查看器，结构化 JSON 输出。
- **错误追踪**：v1.1 接入 Sentry (Flutter SDK)，覆盖未捕获异常 + ANR。
- **分析**：v1.1 接入 Firebase Analytics 或 Supabase 自带的 pg_stat 做基础数据统计。

---

## 7. Flutter 项目结构

```
lib/
├── main.dart                          # App 入口
├── app.dart                           # MaterialApp 配置 (主题/路由/国际化)
├── core/                              # 跨功能基础设施
│   ├── constants/                     # 常量定义
│   ├── extensions/                    # Dart extension methods
│   ├── router/                        # GoRouter 路由配置
│   ├── supabase/                      # Supabase 客户端初始化
│   ├── theme/                         # 主题定义
│   └── utils/                         # 通用工具函数
├── l10n/                              # ARB 国际化文件
│   ├── app_zh.arb
│   └── app_en.arb
├── features/                          # 按业务功能组织
│   ├── auth/                          # M0 认证
│   │   ├── data/                      # Repository, Supabase 数据源
│   │   ├── domain/                    # 实体, 业务逻辑
│   │   └── presentation/             # 页面, Widget, Provider
│   ├── quiz/                          # M1 题库与错题
│   │   ├── data/
│   │   ├── domain/
│   │   │   └── mistake_state_machine.dart  # 错题状态机
│   │   └── presentation/
│   ├── school/                        # M2 择校
│   │   ├── data/
│   │   ├── domain/
│   │   └── presentation/
│   ├── memorize/                      # M3 记忆背诵
│   │   ├── data/
│   │   ├── domain/
│   │   │   └── sm2_algorithm.dart     # SM-2 算法
│   │   └── presentation/
│   ├── ai_tutor/                      # M4 AI 答疑
│   │   ├── data/
│   │   │   └── sse_client.dart        # SSE 流消费
│   │   ├── domain/
│   │   └── presentation/
│   └── home/                          # 首页仪表盘
│       └── presentation/
└── shared/                            # 共享 UI 组件 (实际复用后才提取)
    └── widgets/
```

---

## 8. Supabase Edge Function 设计

### 8.1 AI Chat Function

**路径**：`supabase/functions/ai-chat/index.ts`

**请求流程**：

```
Flutter Client                 Edge Function                DeepSeek API
     │                              │                            │
     │  POST /functions/v1/ai-chat  │                            │
     │  Authorization: Bearer JWT   │                            │
     │  Body: {messages, subject}   │                            │
     │─────────────────────────────→│                            │
     │                              │  1. verify JWT             │
     │                              │  2. check user not banned  │
     │                              │  3. Upstash Redis          │
     │                              │     rate limit check       │
     │                              │     (30/day/user)          │
     │                              │                            │
     │                              │  [if 429] ←───────────────│
     │  ← 429 daily_limit_exceeded  │                            │
     │                              │                            │
     │                              │  4. POST /chat/completions │
     │                              │     model: deepseek-chat   │
     │                              │     max_tokens: 2048       │
     │                              │     stream: true           │
     │                              │────────────────────────────→│
     │                              │                            │
     │                              │  ← SSE stream              │
     │  ← SSE stream (透传)         │                            │
     │  data: {"choices":[...]}     │                            │
     │  data: {"choices":[...]}     │                            │
     │  data: [DONE]                │                            │
     │                              │                            │
```

### 8.2 环境变量

| 变量名 | 存储位置 | 说明 |
|---|---|---|
| `DEEPSEEK_API_KEY` | Supabase Edge Function Secrets | DeepSeek API 密钥 |
| `UPSTASH_REDIS_REST_URL` | Supabase Edge Function Secrets | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Supabase Edge Function Secrets | Upstash Redis 认证 token |

---

## 9. 管理后台 (独立项目)

### 9.1 项目架构

独立 Next.js 项目（`dengke-admin/`），部署在 Vercel。

| 层级 | 选型 |
|---|---|
| 框架 | Next.js (App Router) |
| UI | shadcn/ui + Tailwind CSS |
| 状态 | Zustand |
| 图表 | Recharts |
| 数据访问 | Supabase JS SDK (Service Role Key) |
| 部署 | Vercel |

### 9.2 功能页面

| 页面 | 路由 | 功能 |
|---|---|---|
| 登录 | `/login` | Supabase Auth 登录 → 校验 `role='admin'` |
| 数据看板 | `/dashboard` | DAU/WAU 折线图、今日答题量、AI 调用次数/成本估算、热门错题 Top 10 |
| 题库管理 | `/questions` | 题目列表(分页/筛选/搜索)、新增/编辑/删除、批量 JSON/CSV 导入 |
| 用户管理 | `/users` | 用户列表(搜索/分页)、查看详情、封禁/解封 |
| UGC 审核 | `/ugc-review` | 待审核队列(`is_public=true AND is_approved=false`)、通过/驳回 |

---

## 10. 版本记录

| 版本 | 日期 | 变更内容 |
|---|---|---|
| v1.0 | 2026-09-18 | 初始 PRD 草案（Next.js 全栈方案） |
| v2.0 | 2026-09-19 | 完善功能规范、数据模型、业务流程 |
| v3.0 | 2026-09-20 | **架构迁移至 Flutter + Supabase**：客户端从 Next.js 迁至 Flutter 跨平台；后端从 Vercel + Drizzle ORM 迁至 Supabase 全托管；状态管理从 Zustand 迁至 Riverpod；国际化从 next-intl 迁至 flutter_localizations；管理后台拆为独立 Next.js 项目；补充 Edge Function 设计、RLS 策略、项目结构、SM-2 算法细节 |
