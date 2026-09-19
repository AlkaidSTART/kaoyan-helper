# 登科 · 考研助手 (DengKe) — MVP 产品需求文档 (PRD)

> **版本**: v2.0 | **最后更新**: 2026-09-19
> **状态**: 经讨论确认

---

## 1. 产品概要

### 1.1 产品定位
「登科 · 考研助手」是一款面向考研学生的一站式数字化备考平台。核心理念：**刷题→纠错→择校→记忆→答疑，全闭环覆盖考研备考的核心场景**。

### 1.2 目标用户画像
| 维度 | 描述 |
|---|---|
| **身份** | 大三/大四在校生、二战/在职考研群体 |
| **科目覆盖** | 公共课（英语一/二、政治、数学一/二/三）+ 统考专业课（408 计算机等） |
| **使用场景** | 自习室/图书馆笔记本电脑刷题、宿舍平板复习、碎片时间手机背单词 |
| **核心需求** | 高效刷题、科学纠错、报录比辅助择校、抗遗忘背诵、疑难点即时答疑 |

### 1.3 核心痛点与产品解法

| 痛点 | 现状 | 登科的解法 |
|---|---|---|
| 题目零散，做完即忘 | 散落在纸质书、PDF、各类 App 之间，无统一错题归纳 | 统一题库 + 自动错题归集 + 连续正确消题机制 |
| 择校信息碎片化 | 各校官网格式不一，报录比需手动收集 Excel 对比 | 结构化院校库 + 多维筛选 + 报录比/分数线趋势可视化 |
| 背了就忘 | 单词本、考点笔记缺乏科学复习节奏 | 艾宾浩斯间隔复习算法 + 每日打卡闭环 |
| 答疑无门槛高 | 考研答疑社群质量参差、名师一对一成本高昂 | AI 助教即时答疑，基于题目上下文精准追问 |

---

## 2. MVP 功能范围

### 2.1 功能矩阵与优先级

MVP 四模块全上，管理后台同步交付。

| 模块 | 功能清单 | 优先级 | MVP 边界说明 |
|---|---|---|---|
| **M0 用户与认证** | 注册登录（邮箱验证码 + GitHub/Google/Apple OAuth）、用户资料、目标院校设定、角色权限（user/admin） | P0 | Supabase Auth 驱动，密码登录不做（验证码取代） |
| **M1 题库与错题** | 科目/章节/年份浏览、单选/多选作答、即时判分、解析展示、自动归入错题本、错题消灭流、UGC 题目上传（公有/私有） | P0 | MVP 使用 mock 题库数据演示流程；UGC 上传为手动录入表单 |
| **M2 择校报录** | 院校库列表、多维筛选（地区/985/211/双一流/专业代码）、历年报录比查看、复试线趋势图、设为目标 | P0 | MVP 使用 mock 院校数据（~50所热门院校样本） |
| **M3 记忆背诵** | 英语高频词卡、政治必背考点卡、艾宾浩斯间隔复习、翻转卡片交互、每日打卡与连续天数 | P0 | MVP 内置约 200 张样例卡片（100 词 + 100 考点） |
| **M4 AI 答疑** | 题旁上下文追问、独立对话页、科目预设 Prompt、流式 SSE 输出、Markdown+LaTeX 渲染、每日 30 次配额 | P0 | DeepSeek API，Edge Runtime 流式 |
| **M5 管理后台** | 题库 CRUD 与批量导入、用户列表与封禁、数据看板（DAU/答题量/AI 用量）、UGC 公有题目审核 | P0 | 集成在 Next.js `/admin` 路由组，RBAC 限 admin 角色 |
| **M6 国际化** | 中/英双语切换、语言包按路由懒加载 | P1 | next-intl 集成，UI 文案双语，题目内容本身不翻译 |

### 2.2 明确不做的 (Out of Scope for MVP)

| 功能 | 延后理由 | 预计版本 |
|---|---|---|
| 暗色模式 | 减少 50% 样式工作量，暖色主题已可降低视觉疲劳 | v1.1 |
| 爬虫题库采集 | 需处理反爬、版权、数据清洗，MVP 先验证交互体验 | v1.2 |
| 第三方题库 API 对接 | 多数平台无公开 API，需商务合作 | v1.3+ |
| 付费会员 / 支付 | MVP 先跑用户量和留存率 | v2.0 |
| 移动端 App (原生) | Web 端平板触摸体验优先验证 | v2.0+ |
| 社区 / 讨论区 | 非核心备考场景 | v2.0+ |
| 模拟考试 (限时/组卷) | 需要组卷算法和计时引擎，复杂度高 | v1.2 |

---

## 3. 核心业务流程

### 3.1 用户注册与目标设定

```
[首次访问] → [注册/登录]
                │
    ┌───────────┴──────────────┐
    ▼                          ▼
[邮箱验证码登录]         [OAuth 一键登录]
    │                    (GitHub/Google/Apple)
    ▼                          │
[输入验证码]                   │
    │                          │
    └──────────┬───────────────┘
               ▼
[引导设置目标院校 + 专业]
               │
               ▼
[进入仪表盘首页]
```

### 3.2 刷题 → 错题 → AI 答疑闭环

这是产品最核心的价值闭环：

```
[仪表盘] → [选择科目/章节/年份]
                    │
                    ▼
            [展示题目卡片]
                    │
                    ▼
            [用户选择答案]
                    │
        ┌───────────┴──────────────┐
        ▼                          ▼
  [答对: 进度+1]            [答错: 自动入错题本]
        │                          │
        ▼                          ▼
  [下一题]                   [展示解析面板]
                                   │
                            ┌──────┴───────┐
                            ▼              ▼
                      [看完继续]     [⚡ 召唤 AI 答疑]
                            │              │
                            ▼              ▼
                      [下一题]       [侧边抽屉打开]
                                           │
                                           ▼
                                    [AI 流式回复]
                                    [支持追问]

--- 错题消灭流 ---

[错题本] → [开始今日错题攻坚]
                    │
                    ▼
            [展示错题 (按错误次数降序)]
                    │
                    ▼
            [重新作答]
                    │
        ┌───────────┴──────────────┐
        ▼                          ▼
  [又答错: error_count++]    [答对: consecutive_correct++]
  [consecutive_correct=0]          │
                            ┌──────┴───────┐
                            ▼              ▼
                   [consecutive          [consecutive
                    _correct < 2]        _correct >= 2]
                            │              │
                            ▼              ▼
                      [仍在错题本]    [标记"已掌握"，移出活跃列表]
```

### 3.3 择校决策链路

```
[择校页面] → [组合筛选: 地区 + 985/211/双一流 + 专业代码]
                    │
                    ▼
         [院校列表 (报录比排序)]
                    │
                    ▼
         [点击展开: 近3年分数线趋势折线图]
                    │
                    ▼
         [⭐ 设为主目标 / 备选目标]
                    │
                    ▼
         [仪表盘显示目标院校信息 + 倒计时]
```

### 3.4 每日记忆打卡流

```
[仪表盘: "今日待复习 42 张"] → [进入背诵模块]
                                      │
                                      ▼
                              [展示卡片正面]
                              (英语单词 / 政治考点)
                                      │
                                      ▼
                              [点击翻转: 显示释义/解析]
                                      │
                                      ▼
                              [底部评级操作栏]
                    ┌─────────────┼──────────────┐
                    ▼             ▼               ▼
              [🔴 忘记]     [🟡 模糊]        [🟢 牢记]
              interval=0   interval=1天    interval递增
              今日重排       次日复习         延长间隔
                    │             │               │
                    └─────────────┴───────────────┘
                                  │
                                  ▼
                          [下一张卡片]
                          [顶部进度: 23/42]
                                  │
                                  ▼ (全部完成)
                          [🎉 打卡成功! 连续 12 天]
```

---

## 4. 详细功能规范

### 4.1 M0 用户与认证

#### 4.1.1 注册登录
- **邮箱验证码登录**：用户输入邮箱 → Supabase Auth 发送 6 位验证码 → 用户输入验证码完成登录/注册（新邮箱自动注册）。不做独立密码登录，验证码即认证。
- **OAuth 登录**：GitHub、Google、Apple 三方。Supabase Auth 原生支持，前端一键调起。
- **MVP 不做**：手机号+短信登录（短信服务费用、国内实名合规成本高）。

#### 4.1.2 用户资料与目标
- 字段：昵称、头像（默认生成）、目标院校（主目标 1 + 备选 2）、目标专业、预计考试年份。
- 首次登录强引导设置目标院校（可跳过）。

#### 4.1.3 角色与权限
- `user`：普通用户，访问用户端全部功能。
- `admin`：管理员，额外访问 `/admin` 后台。通过 Supabase 数据库 `users.role` 字段标识，不做管理员自助注册。

### 4.2 M1 题库与错题

#### 4.2.1 题库数据策略

**MVP 阶段**：使用 mock/seed 数据，每科 10~20 道样例题，覆盖所有题型（单选、多选、分析题）。重点验证交互体验，不追求内容量。

**后续数据来源（按优先级）**：
1. **用户上传 (UGC)**：用户通过表单录入题干+选项+解析，选择公有（所有人可见，需管理员审核）或私有（仅自己可见）。
2. **爬虫采集**：v1.2 版本，爬取公开教育资源站点，需处理版权与数据清洗。
3. **第三方接口**：v1.3+，视合作情况接入。

#### 4.2.2 题目数据模型
```
questions 表:
- id (UUID)
- subject (enum: politics/english/math/cs408)
- chapter (varchar) -- 章节/知识点分类
- year (int, nullable) -- 真题年份, null=非真题
- type (enum: single_choice/multiple_choice/essay)
- stem (text) -- 题干, 支持 Markdown + LaTeX
- options (jsonb) -- [{key: "A", content: "..."}, ...]
- answer (varchar) -- 正确答案: "B" 或 "ACD"
- explanation (text) -- 官方解析
- difficulty (enum: easy/medium/hard)
- source (enum: official/ugc) -- 来源: 官方题库 vs 用户上传
- creator_id (UUID, FK → users.id, nullable) -- UGC 上传者
- is_public (boolean, default false) -- UGC 公有/私有
- is_approved (boolean, default false) -- 管理员审核状态
- created_at, updated_at, deleted_at
```

#### 4.2.3 错题消灭状态机

状态流转规则（这是核心业务逻辑）：

| 事件 | 状态变化 | 字段更新 |
|---|---|---|
| 首次答错 | 创建 `mistake_records` | `error_count=1, consecutive_correct=0, status=active` |
| 再次答错 | 保持 active | `error_count++, consecutive_correct=0` |
| 重练答对 | 保持 active | `consecutive_correct++` |
| 连续答对 >= 2 次 | active → mastered | `status=mastered, mastered_at=now()` |

用户可手动将 `mastered` 题目重新标记为 `active`（"我其实还没掌握"）。

### 4.3 M2 择校报录

#### 4.3.1 数据结构
```
schools 表:
- id, name (校名), province, region (一区/二区)
- is_985, is_211, is_double_first_class, is_self_划线
- created_at, updated_at

school_programs 表 (院校+专业维度):
- id, school_id (FK), college_name (学院)
- major_code (专业代码, e.g. "085400")
- major_name (专业名称, e.g. "电子信息")
- year (int) -- 数据年份
- planned (int) -- 招生计划数
- applicants (int) -- 报考人数
- enrolled (int) -- 录取人数
- admission_score (int) -- 复试分数线
- national_score (int) -- 当年国家线
- created_at, updated_at
```

#### 4.3.2 报录比计算规则
- `ratio = applicants / enrolled`，enrolled 为 0 时返回 `null` 不展示比值（严禁除零）。
- 前端展示为 "10:1" 格式，附带难度标签：ratio < 5 绿色（较易）、5~10 橙色（适中）、> 10 红色（竞争激烈）。

#### 4.3.3 目标管理
- 每个用户最多保存 1 个主目标 + 2 个备选目标。
- 仪表盘展示主目标院校的分数线、倒计时。

### 4.4 M3 记忆背诵

#### 4.4.1 卡片数据模型
```
memorize_cards 表:
- id, category (enum: english_word/politics_point/custom)
- front (text) -- 正面 (单词 / 考点提问)
- back (text) -- 背面 (释义+例句 / 答案+解析)
- tags (text[]) -- 标签, e.g. ["高频", "马原", "CET-6"]
- source (enum: system/ugc)
- creator_id (UUID, nullable)
- created_at, updated_at

user_card_progress 表:
- id, user_id (FK), card_id (FK)
- repetitions (int, default 0) -- 复习次数
- ease_factor (float, default 2.5) -- SM-2 难度因子
- interval (int, default 0) -- 当前间隔天数
- next_review_at (timestamptz) -- 下次复习时间
- last_reviewed_at (timestamptz)
- created_at, updated_at
```

#### 4.4.2 间隔复习算法 (简化 SM-2)

```
输入: rating ∈ {forgot=1, fuzzy=2, remembered=3}

if rating == forgot:
    interval = 0          // 今日重排
    repetitions = 0
    ease_factor = max(1.3, ease_factor - 0.2)

if rating == fuzzy:
    interval = 1          // 明天
    repetitions = 0
    ease_factor = max(1.3, ease_factor - 0.1)

if rating == remembered:
    if repetitions == 0: interval = 1
    elif repetitions == 1: interval = 3
    else: interval = round(prev_interval * ease_factor)
    repetitions += 1
    ease_factor = ease_factor + 0.1

next_review_at = now() + interval * 24h
```

#### 4.4.3 打卡机制
- 每日登录自动计算"今日待复习量"（`next_review_at <= today`）。
- 完成全部待复习卡片即打卡成功，记录 `check_in_records`。
- 仪表盘展示连续打卡天数、总复习卡片数。

### 4.5 M4 AI 答疑助教

#### 4.5.1 两种交互入口
1. **题旁上下文追问**：做题/错题解析页面的"⚡ AI 答疑"按钮，自动构造 System Prompt：
   ```
   你是一位考研{科目}辅导老师。学生正在做以下题目：
   【题干】{stem}
   【选项】{options}
   【学生选择】{userAnswer}
   【正确答案】{correctAnswer}
   【参考解析】{explanation}
   
   请帮助学生深入理解这道题，用通俗易懂的方式解释。
   ```
2. **独立对话页**：`/chat` 页面，用户选择科目后进入自由对话。预设科目 System Prompt（政治/英语/数学/专业课各一套）。

#### 4.5.2 流式输出
- 使用 Vercel AI SDK `streamText()` + DeepSeek API。
- 前端 `useChat()` hook 消费 SSE 流，打字机效果渲染。
- 支持 Markdown 格式 + KaTeX 数学公式内联渲染。

#### 4.5.3 限流与成本控制
- 每用户每日 30 次问答（通过 Upstash Ratelimit Token Bucket 实现）。
- 超限返回 HTTP 429 + 友好提示"今日提问次数已用完，明天再来"。
- 单次最大输出 token 限制 2048（防止超长回复导致费用失控）。

### 4.6 M5 管理后台

集成在同一 Next.js 项目的 `/admin` 路由组，通过中间件校验 `role === 'admin'`。

| 子模块 | 功能 | MVP 范围 |
|---|---|---|
| **题库管理** | 题目 CRUD、批量 JSON/CSV 导入、上下架、按科目/题型筛选 | 完整 CRUD + 单文件导入 |
| **用户管理** | 用户列表、搜索、查看详情、封禁/解封 | 列表 + 封禁操作 |
| **数据看板** | DAU/WAU、今日答题量、AI 调用次数/成本估算、热门错题 Top 10 | 基础统计卡片 + 简单图表 |
| **UGC 审核** | 待审核公有题目队列、通过/驳回操作、举报处理 | 审核列表 + 通过/驳回 |

---

## 5. 非功能性需求

### 5.1 性能指标
| 指标 | 目标值 | 实现手段 |
|---|---|---|
| 首屏加载 (LCP) | < 1.5s | Next.js SSR/SSG + 代码分割 |
| 普通 API 响应 (P95) | < 200ms | Drizzle ORM 优化查询 + Redis 热点缓存 |
| AI 首 token 延迟 (TTFT) | < 1.0s | Edge Runtime + DeepSeek API |
| 卡片翻转动画帧率 | 60fps | CSS transform 硬件加速 |

### 5.2 安全
- 认证：Supabase Auth JWT，httpOnly cookie 存储，自动刷新。
- API：所有 Route Handler 校验 JWT，admin 接口额外校验角色。
- 敏感数据：API Key、数据库连接串等走 Vercel 环境变量，严禁硬编码，严禁入日志。
- 输入校验：所有用户输入经 Zod schema 校验，防 XSS/SQL 注入。

### 5.3 国际化
- 框架：next-intl，App Router 中间件按路由前缀 (`/zh`, `/en`) 切换语言。
- 范围：UI 文案、按钮、菜单、错误提示双语。题目/卡片内容本身不翻译。
- 默认语言：中文。

### 5.4 可观测性
- 结构化日志：Pino，JSON 格式，贯穿 `traceId`。
- 错误追踪：Vercel 内置 Log Drain，或接入 Sentry (v1.1)。
- 监控：Vercel Analytics (Web Vitals) + Speed Insights。
