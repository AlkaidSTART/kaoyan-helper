# 登科 · 考研助手 — 技术栈选型文档 (Tech Stack Specification)

> **版本**: v2.0 | **最后更新**: 2026-09-19
> **状态**: 经讨论确认，技术方向已锁定

---

## 1. 架构总览

### 1.1 架构形态：Next.js 全栈单体 + Vercel Serverless

**决策背景**：项目无自有服务器，必须依赖 Vercel 免运维部署。最初方案为 Next.js + Go (Gin) 前后端分离，但 Vercel 原生仅支持 Node.js / Edge Runtime 的 Serverless Functions，Go Functions 存在冷启动慢、社区生态差、无法支撑 SSE 长连接等硬伤。

**最终决策**：放弃 Go 后端，采用 **Next.js App Router 全栈单体**——前端页面、API 路由、AI 流式代理全部在同一 Next.js 项目中完成，一键部署到 Vercel。

**取舍说明**：
- ✅ 获得：统一技术栈（全 TypeScript）、零运维成本、Vercel 原生 CI/CD、Edge Runtime 无超时 SSE
- ❌ 放弃：Go 的高并发性能优势、类型系统独立性
- 📌 升级路径：若未来用户量突破 Vercel 免费额度/性能瓶颈，可将计算密集型 API 迁移至 Railway/Fly.io 上的独立 Node.js 或 Go 服务，前端保持 Vercel 不变

### 1.2 架构图

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Platform                       │
│                                                         │
│  ┌──────────────────────┐  ┌─────────────────────────┐  │
│  │  Next.js App Router  │  │  Next.js Route Handlers │  │
│  │  (React Server       │  │  /api/v1/*              │  │
│  │   Components + Pages)│  │  (Node.js Runtime)      │  │
│  └──────────┬───────────┘  └──────────┬──────────────┘  │
│             │                         │                  │
│             │              ┌──────────┴──────────────┐  │
│             │              │  Edge Runtime            │  │
│             │              │  /api/v1/chat (SSE 流式) │  │
│             │              └──────────┬──────────────┘  │
└─────────────┼─────────────────────────┼─────────────────┘
              │                         │
    ┌─────────┴──────┐     ┌───────────┴───────────┐
    │                │     │                       │
    ▼                ▼     ▼                       ▼
┌────────┐   ┌──────────┐ ┌───────────┐   ┌──────────────┐
│Supabase│   │ Supabase │ │  Upstash  │   │ DeepSeek API │
│  Auth  │   │PostgreSQL│ │   Redis   │   │  (LLM)       │
│(OAuth+ │   │ (数据层)  │ │(HTTP协议) │   │              │
│ Email) │   │          │ │           │   │              │
└────────┘   └──────────┘ └───────────┘   └──────────────┘
```

### 1.3 运行时分工

| 运行时 | 用途 | 超时限制 | 适用场景 |
|---|---|---|---|
| **Node.js Runtime** (Serverless) | 常规 CRUD API、鉴权中间件、数据聚合 | Hobby: 10s, Pro: 60s | `/api/v1/questions`, `/api/v1/schools` 等 |
| **Edge Runtime** | AI 流式代理、轻量计算 | 无硬性超时 | `/api/v1/chat` SSE 流式推送 |
| **React Server Components** | 页面 SSR/SSG、数据预取 | 构建时或请求时 | 首屏渲染、SEO 友好页面 |

---

## 2. 前端技术栈

| 类别 | 选型 | 版本 | 选型理由 | 曾考虑的替代方案 |
|---|---|---|---|---|
| **框架** | Next.js (App Router) | 15.x | SSR/SSG/RSC 一站式、Vercel 原生集成、文件路由约定式 | Vite + React (纯 CSR，SEO 差) |
| **语言** | TypeScript | 5.x (strict mode) | 端到端类型安全，严禁 `any`，与 Supabase/Prisma 类型联动 | — |
| **样式** | Tailwind CSS | 4.x | 零运行时开销、原子化约束设计、响应式断点内置、主题色切换原生支持 | CSS Modules (维护碎片化) |
| **状态管理** | Zustand | 最新 | 极简 API、按 store 细粒度订阅、无 Provider 嵌套地狱、SSR 兼容 | Redux Toolkit (过重), Jotai (原子化过碎) |
| **数据请求** | SWR | 最新 | Vercel 官方出品、自动缓存/重验证/乐观更新、与 Next.js 深度集成 | TanStack Query (功能更强但 MVP 不需要) |
| **包管理** | pnpm | 9.x+ | 硬链接省空间、幽灵依赖检测、monorepo 友好 | npm (慢), yarn (pnpm 更严格) |
| **国际化** | next-intl | 最新 | App Router 原生集成、类型安全、按路由加载语言包 | i18next (配置重) |
| **表单** | React Hook Form + Zod | 最新 | 无受控组件性能损耗、Zod schema 前后端共享验证 | Formik (re-render 多) |
| **图标** | Lucide React | 最新 | 统一风格、Tree-shaking 按需引入、体积小 | — |
| **数学公式** | KaTeX | 最新 | 比 MathJax 快 10x+，考研数学公式为刚需 | MathJax (慢) |
| **Markdown** | react-markdown + rehype-katex | — | AI 回复渲染 Markdown + LaTeX 混排 | — |

### 2.1 目录结构规范

遵循 **Colocation** 原则——feature 内聚，通用组件上提：

```
src/
├── app/                          # Next.js App Router
│   ├── (main)/                   # 用户端布局组
│   │   ├── dashboard/
│   │   ├── quiz/
│   │   ├── mistakes/
│   │   ├── schools/
│   │   ├── memory/
│   │   └── chat/
│   ├── (admin)/                  # 管理后台布局组 (Route Group)
│   │   ├── admin/
│   │   │   ├── questions/
│   │   │   ├── users/
│   │   │   ├── analytics/
│   │   │   └── ugc-review/
│   ├── api/v1/                   # API Route Handlers
│   └── layout.tsx
├── components/
│   └── ui/                       # 通用基础组件 (Button, Card, Input...)
├── features/                     # 业务 feature 模块
│   ├── quiz/
│   │   ├── QuizCard.tsx
│   │   ├── QuizCard.test.tsx     # 测试 co-locate
│   │   └── useQuizStore.ts
│   ├── memory/
│   ├── school/
│   └── chat/
├── lib/                          # 工具函数、API 客户端、常量
│   ├── supabase/                 # Supabase 客户端封装
│   ├── redis.ts                  # Upstash Redis 客户端
│   ├── deepseek.ts               # DeepSeek API 封装
│   └── i18n/                     # 国际化配置与语言包
├── stores/                       # Zustand stores (命名: useXxxStore)
└── types/                        # 全局共享类型定义
```

### 2.2 关键代码约束

- **导包顺序**：`react/next` 标准库 → 空行 → 第三方包 → 空行 → `@/` 内部模块 → 空行 → 相对路径
- **组件命名**：PascalCase 文件名 (`QuizCard.tsx`)
- **Store 命名**：`useXxxStore` (如 `useAuthStore`, `useQuizStore`)
- **严禁** `console.log` 残留生产代码 (`console.error` 在错误边界中例外)

---

## 3. 后端 / API 层技术栈

由于采用 Next.js 全栈方案，后端能力由 **Route Handlers** (`app/api/`) 承载：

| 类别 | 选型 | 说明 | 决策理由 |
|---|---|---|---|
| **认证** | Supabase Auth | 邮箱验证码 + GitHub/Google/Apple OAuth | 开箱即用、JWT 自动管理、RLS 可选 |
| **ORM** | Drizzle ORM | 类型安全 SQL Builder、轻量、零运行时开销 | 比 Prisma 更轻、更贴近 SQL、Serverless 冷启动友好 |
| **数据库迁移** | Drizzle Kit | `drizzle-kit generate` + `drizzle-kit migrate` | 与 ORM 一体化，严禁直接改表 |
| **Redis** | `@upstash/redis` | HTTP 协议、无需连接池、Vercel Serverless 兼容 | Vercel 官方推荐，每请求无状态调用 |
| **限流** | `@upstash/ratelimit` | 基于 Upstash Redis 的 Token Bucket / Sliding Window | AI 接口防刷、成本控制 |
| **AI SDK** | Vercel AI SDK (`ai`) | 统一 LLM 接口、原生 SSE 流式、Edge Runtime 支持 | 一行代码切换 DeepSeek/OpenAI/Claude |
| **验证** | Zod | 请求参数 schema 校验、与前端表单共享 schema | 前后端类型统一 |
| **日志** | Pino | 结构化 JSON、`traceId` 贯穿、Vercel Log Drain 兼容 | `console.*` 不够结构化 |

### 3.1 API 设计约束

- RESTful 风格，Base Path: `/api/v1`
- 资源复数名词：`/api/v1/questions`, `/api/v1/schools`, `/api/v1/words`, `/api/v1/chat`
- JSON 字段统一 camelCase
- 错误响应统一格式：`{ "error": { "code": "RATE_LIMITED", "message": "..." } }`
- 敏感信息（API Key、数据库连接串）走 Vercel 环境变量，严禁硬编码

---

## 4. 数据层

### 4.1 PostgreSQL (Supabase 托管)

**定位**：纯数据库托管。Auth 模块使用 Supabase Auth，其余 PostgREST / Realtime 等能力 MVP 不启用，避免生态绑定过深。

**Schema 规范**：
- 表名：复数 + snake_case（`users`, `questions`, `mistake_records`, `target_schools`, `memorize_cards`）
- 主键：`id` (UUID, `gen_random_uuid()`)
- 外键：`xxx_id`
- 审计字段：`created_at` (timestamptz, default now()), `updated_at`, `deleted_at` (软删除)
- 索引：外键字段默认建索引、高频查询字段加复合索引

**升级路径**：Supabase 免费额度（500MB 存储、2 万用户）足以支撑 MVP。超限后可升级 Pro 计划（$25/月）或迁移至自建 PostgreSQL。

### 4.2 Upstash Redis (HTTP 协议)

**定位**：缓存 + 限流 + 临时状态

| 职能 | 具体用法 | Key 设计 |
|---|---|---|
| **AI 限流** | Token Bucket 算法，每用户每日 30 次 | `ratelimit:chat:{userId}` |
| **验证码** | 邮箱验证码 5 分钟有效期 | `verify:{email}:{code}` |
| **热点缓存** | 高频院校报录比数据、热门题目统计 | `cache:school:{schoolId}:ratios` |
| **背诵进度暂存** | 当前轮次未完成的卡片队列 | `session:memory:{userId}` |

**免费额度**：10k 命令/天，MVP 阶段充足。

---

## 5. AI 集成方案

### 5.1 模型选型：DeepSeek

**决策理由**：
1. **成本**：DeepSeek-V3/Chat 价格约 ¥1/百万 token（输入），远低于 GPT-4o（$2.5/百万 token）
2. **中文能力**：原生中文训练，考研政治/英语/数学解析质量优秀
3. **速度**：TTFT (首 token 延迟) < 500ms，流式体验流畅

**集成方式**：通过 Vercel AI SDK 的 provider 抽象层对接——

```typescript
// ponytail: 单模型直连, 升级路径: 引入 LLM Router 做 A/B 或 fallback
import { createDeepSeek } from '@ai-sdk/deepseek';

const deepseek = createDeepSeek({ apiKey: process.env.DEEPSEEK_API_KEY });
```

**升级路径**：Vercel AI SDK 支持统一 provider 接口，未来可一行代码切换至 Claude / GPT / 开源模型，或引入 OpenRouter 做多模型路由。

### 5.2 流式架构

```
[用户提问] → [Edge Runtime Route Handler] → [Vercel AI SDK streamText()] → [DeepSeek API]
                                                    │
                                                    ▼ SSE (data: {...}\n\n)
                                              [前端 useChat() 实时渲染]
```

- Edge Runtime 无超时限制，适合 AI 长回复场景
- 前端使用 Vercel AI SDK 的 `useChat()` hook，自动处理 SSE 解析、加载状态、错误重试

---

## 6. 开发与部署环境

### 6.1 本地开发

```bash
# 依赖安装
pnpm install

# 本地开发（Next.js dev server + 自动连接 Supabase / Upstash 远程服务）
pnpm dev

# 数据库迁移
pnpm db:generate   # 生成迁移文件
pnpm db:migrate    # 执行迁移
```

**本地数据库选项**：
- 方案 A (推荐)：直接连接 Supabase 远程开发数据库（零配置）
- 方案 B：本地 Docker 跑 PostgreSQL（需 `docker compose up postgres`）

### 6.2 部署流水线

```
[git push main] → [Vercel Auto Build] → [Preview/Production Deploy]
                         │
                         ├── TypeScript 类型检查 (tsc --noEmit)
                         ├── ESLint 代码规范检查
                         ├── Vitest 单元测试
                         └── Build 构建验证
```

### 6.3 环境变量清单

| 变量名 | 用途 | 存储位置 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目地址 | Vercel Env |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名 Key (客户端用) | Vercel Env |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 管理员 Key (服务端用) | Vercel Env (Secret) |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | Vercel Env (Secret) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis 地址 | Vercel Env |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis Token | Vercel Env (Secret) |
