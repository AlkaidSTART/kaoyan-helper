# 登科 · 考研助手 (DengKe) — 技术栈选型文档 (Tech Stack Specification)

> **版本**: v3.0 | **最后更新**: 2026-09-20
> **状态**: 架构已锁定（由 Next.js 全栈单体迁移至 Flutter + Supabase 跨平台方案）

---

## 1. 架构总览

### 1.1 架构形态：Flutter 跨平台客户端 + Supabase 全托管后端

**决策背景**：v2.0 采用 Next.js 全栈单体部署在 Vercel，仅覆盖 Web 端。产品需求明确要求同时覆盖 Android、iOS、Web、桌面（macOS/Windows）四端，Next.js 方案无法满足原生移动端体验，React Native 在桌面端支持不成熟。

**最终决策**：

- **客户端**：Flutter (Dart)，单一代码库编译四平台产物
- **后端**：Supabase 全托管——Auth、PostgreSQL（PostgREST 自动生成 REST API）、Edge Functions（Deno/TypeScript）、Storage、Realtime
- **管理后台**：独立 Next.js Web 项目，部署在 Vercel

**取舍说明**：

| 维度 | 获得 (✅) | 放弃 (❌) |
|---|---|---|
| 跨平台 | 单一 Dart 代码库 → 4 端原生产物，UI 一致性极高 | Web 端 SEO 能力弱（Flutter Web 为 Canvas 渲染） |
| 后端运维 | Supabase 全托管，零服务器管理，PostgREST 自动 CRUD | 失去自定义 API 路由的灵活性（复杂逻辑需 Edge Functions） |
| 开发效率 | Hot Reload 秒级反馈，Riverpod 类型安全状态管理 | 团队需掌握 Dart 语言（非 JS/TS 主流生态） |
| AI 集成 | Edge Functions 做 AI Proxy，客户端不暴露 API Key | Edge Functions 冷启动 ~200ms，比直连略慢 |

**升级路径**：若 Supabase 免费额度不足或需要复杂业务逻辑，可将 Edge Functions 迁移至 Fly.io / Railway 上的独立 Deno / Node.js 服务，客户端只需改 base URL。

### 1.2 仓库结构

项目拆分为两个独立仓库，共享同一个 Supabase 项目：

```
dengke-app/          # Flutter 客户端（Android / iOS / Web / Desktop）
dengke-admin/        # Web 管理后台（Next.js + React + Tailwind）

共享：同一个 Supabase 项目（数据库、Auth、Edge Functions、Storage）
```

**拆分理由**：Flutter 和 Next.js 的工具链、构建流程、部署目标完全不同，合仓只增加 CI 复杂度，无实际代码共享收益。共享层通过 Supabase（数据库 + Auth + RLS）保证一致性。

### 1.3 架构图

```
┌──────────────────────────────────────────────────────────────────┐
│                       Flutter Client (Dart)                       │
│              Android · iOS · Web · macOS · Windows                │
│                                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐ │
│  │  Riverpod   │  │   go_router  │  │  flutter_markdown        │ │
│  │ (状态管理)   │  │   (路由)      │  │  + flutter_math_fork     │ │
│  │             │  │              │  │  (Markdown + LaTeX 渲染)  │ │
│  └──────┬──────┘  └──────────────┘  └──────────────────────────┘ │
│         │                                                         │
│  ┌──────┴──────────────────────────────────────────────────────┐ │
│  │  supabase_flutter SDK (Auth + PostgREST + Realtime + Storage)│ │
│  │  + dio / http (Edge Functions SSE streaming)                 │ │
│  └──────┬───────────────────────────┬──────────────────────────┘ │
└─────────┼───────────────────────────┼────────────────────────────┘
          │                           │
          ▼                           ▼
┌───────────────────────────┐  ┌──────────────────────────────────┐
│      Supabase Platform     │  │    Supabase Edge Functions       │
│                            │  │    (Deno / TypeScript)           │
│  ┌──────────┐ ┌─────────┐ │  │                                  │
│  │   Auth   │ │PostgREST│ │  │  /ai/chat    → DeepSeek API      │
│  │(Magic    │ │(自动REST │ │  │               (SSE streaming)    │
│  │ Link +   │ │  API)   │ │  │  /ai/explain → DeepSeek API      │
│  │ OAuth)   │ │         │ │  │                                  │
│  └──────────┘ └─────────┘ │  │  ┌────────────────────────────┐  │
│  ┌──────────┐ ┌─────────┐ │  │  │  Rate Limiting             │  │
│  │PostgreSQL│ │Realtime │ │  │  │  via Upstash Redis (HTTP)   │  │
│  │  (数据)  │ │(预留)    │ │  │  └────────────────────────────┘  │
│  └──────────┘ └─────────┘ │  └───────────────┬──────────────────┘
└───────────────────────────┘                  │
                                    ┌──────────┴──────────┐
                                    ▼                     ▼
                             ┌───────────┐        ┌──────────────┐
                             │  Upstash  │        │ DeepSeek API │
                             │   Redis   │        │   (LLM)      │
                             │ (HTTP协议) │        │              │
                             └───────────┘        └──────────────┘

┌──────────────────────────────────────────────────────────────────┐
│              Admin Dashboard (dengke-admin/)                       │
│          Next.js + React + Tailwind CSS + Supabase JS             │
│                    部署在 Vercel                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 1.4 数据流概要

| 场景 | 数据流 |
|---|---|
| 常规 CRUD（题目列表、院校查询） | Flutter → `supabase_flutter` SDK → PostgREST → PostgreSQL |
| 用户认证 | Flutter → `supabase_flutter` Auth → Supabase Auth（Magic Link / OAuth） |
| AI 对话 | Flutter → HTTP POST Edge Function `/ai/chat` → DeepSeek API → SSE 流式返回 |
| 限流检查 | Edge Function → Upstash Redis（HTTP `@upstash/ratelimit`） → 通过/拒绝 |
| 管理操作 | Admin Web → `@supabase/supabase-js` → PostgREST（走 service_role key，绕过 RLS） |

---

## 2. Flutter 客户端技术栈 (dengke-app/)

### 2.1 核心依赖

| 类别 | 选型 | 选型理由 | 曾考虑的替代方案 |
|---|---|---|---|
| **语言** | Dart 3.x (null safety) | Flutter 唯一语言，强类型、AOT 编译原生性能 | — |
| **框架** | Flutter 3.x (stable) | 单一代码库 → 4 端产物，Skia/Impeller 渲染引擎保证 UI 一致性 | React Native（桌面端不成熟）、MAUI（生态小） |
| **状态管理** | Riverpod 2.x | 编译期安全、无 `BuildContext` 依赖、Provider 自动销毁、可测试性极强 | Bloc（模板代码多）、GetX（类型不安全）、Provider（Riverpod 的前身，缺少编译期检查） |
| **路由** | go_router | Flutter 官方推荐、声明式路由、深链接 (Deep Link) 支持、Web URL 同步 | auto_route（代码生成重） |
| **HTTP 客户端** | dio | 拦截器链、请求取消、SSE streaming 支持（`responseType: ResponseType.stream`） | http（太简陋，无拦截器）|
| **Supabase SDK** | supabase_flutter | 官方 Flutter SDK，封装 Auth/PostgREST/Realtime/Storage | 手写 HTTP 调用（无意义） |
| **Markdown 渲染** | flutter_markdown | 渲染 AI 回复的 Markdown 格式内容 | — |
| **LaTeX 公式** | flutter_math_fork | 考研数学公式渲染刚需，纯 Dart 实现无 WebView 开销 | flutter_tex（依赖 WebView，移动端性能差） |
| **国际化** | flutter_localizations + intl | Flutter 官方 i18n 方案，ARB 文件格式，`gen-l10n` 代码生成类型安全访问 | easy_localization（非官方） |
| **本地存储** | shared_preferences + sqflite | 轻量 KV 存储 + 离线题目缓存 | Hive（不支持 SQL 查询） |
| **代码生成** | freezed + json_serializable | 不可变数据模型 + JSON 序列化，消除手写 `fromJson`/`toJson` 的错误 | built_value（API 丑陋） |
| **依赖注入** | Riverpod 自身 | Riverpod 的 Provider 体系天然就是 DI 容器，无需额外引入 | get_it（与 Riverpod 重叠） |

### 2.2 Riverpod 状态管理规范

```dart
// Provider naming: xxxProvider (camelCase)
// Notifier naming: XxxNotifier (PascalCase)
// File naming: xxx_provider.dart

// Example: quiz state management
@riverpod
class QuizNotifier extends _$QuizNotifier {
  @override
  Future<List<Question>> build() async {
    final supabase = ref.watch(supabaseClientProvider);
    return supabase.from('questions').select().then(/* parse */);
  }

  Future<void> submitAnswer(String questionId, String answer) async {
    // optimistic update + server sync
  }
}
```

**规范要点**：
- 使用 `@riverpod` 注解 + `riverpod_generator` 代码生成，避免手写 Provider 模板
- 异步数据统一使用 `AsyncValue<T>`，UI 层通过 `.when(data:, loading:, error:)` 三态处理
- 跨 Provider 依赖通过 `ref.watch()` 声明式订阅，自动响应变化
- Provider 按 feature 组织，与 UI 文件 co-locate

### 2.3 项目目录结构

```
dengke-app/
├── android/                       # Android 平台工程
├── ios/                           # iOS 平台工程
├── web/                           # Web 平台工程
├── macos/                         # macOS 平台工程
├── windows/                       # Windows 平台工程
├── lib/
│   ├── main.dart                  # 入口
│   ├── app.dart                   # MaterialApp + GoRouter + 主题配置
│   ├── core/
│   │   ├── constants/             # 全局常量（API base URL 等）
│   │   ├── theme/                 # 主题定义 (light/dark)
│   │   ├── router/                # GoRouter 路由配置
│   │   ├── l10n/                  # 国际化 ARB 文件 + 生成代码
│   │   └── utils/                 # 通用工具函数
│   ├── data/
│   │   ├── models/                # freezed 数据模型 (Question, School, User...)
│   │   ├── repositories/          # Repository 层：封装 Supabase 调用
│   │   └── services/              # 服务层：AI chat service, auth service
│   ├── features/                  # 业务 feature 模块 (Colocation 原则)
│   │   ├── auth/
│   │   │   ├── auth_screen.dart
│   │   │   └── auth_provider.dart
│   │   ├── quiz/
│   │   │   ├── quiz_screen.dart
│   │   │   ├── quiz_provider.dart
│   │   │   ├── widgets/           # feature 内部组件
│   │   │   └── quiz_screen_test.dart
│   │   ├── chat/                  # AI 对话
│   │   ├── mistakes/              # 错题本
│   │   ├── schools/               # 院校查询
│   │   ├── memory/                # 背诵记忆
│   │   └── profile/               # 个人中心
│   └── shared/
│       └── widgets/               # 跨 feature 通用组件 (只在实际复用时上提)
├── test/                          # 测试
├── pubspec.yaml
└── analysis_options.yaml          # lint 规则
```

### 2.4 关键代码约束

- **导包顺序**：`dart:` 标准库 → 空行 → `package:flutter/` 等 Flutter SDK → 空行 → 第三方 package → 空行 → 项目内 `package:dengke/` → 空行 → 相对路径
- **文件命名**：全部 `snake_case.dart`（Dart 规范）
- **类命名**：`PascalCase`（Widget、Notifier、Model）
- **Provider 命名**：`camelCaseProvider`（如 `quizListProvider`、`authStateProvider`）
- **严禁** `print()` 残留生产代码；使用 `dart:developer` 的 `log()` 或结构化 logger
- **所有异步操作**必须有 error handling（try-catch 或 AsyncValue.error 状态）
- **`dynamic` 类型禁用**；`analysis_options.yaml` 中启用 `strict-casts: true`

---

## 3. Supabase 后端层

### 3.1 架构定位

Supabase 不仅是数据库托管，而是作为**完整后端**使用：Auth 管认证、PostgREST 管 CRUD API、Edge Functions 管业务逻辑（AI 代理）、RLS 管数据权限。**不写任何自有后端服务。**

### 3.2 认证 (Supabase Auth)

| 认证方式 | 说明 | 配置 |
|---|---|---|
| **Email Magic Link** | 无密码登录，邮箱收验证链接 | Supabase Dashboard → Auth → Email → 开启 Magic Link |
| **GitHub OAuth** | 开发者用户快捷登录 | Supabase Dashboard → Auth → Providers → GitHub |
| **Google OAuth** | 主流用户登录 | 同上，配置 Google Cloud OAuth Client ID |
| **Apple Sign-In** | iOS 审核要求（含第三方登录时必须提供） | 同上，配置 Apple Developer Service ID |

**客户端集成**：

```dart
// Magic Link login
await supabase.auth.signInWithOtp(email: email);

// OAuth login
await supabase.auth.signInWithOAuth(
  OAuthProvider.github,
  redirectTo: 'io.dengke.app://login-callback',
);

// Listen to auth state changes
supabase.auth.onAuthStateChange.listen((data) {
  final session = data.session;
  // update Riverpod auth state
});
```

**JWT + RLS 工作流**：
1. 用户登录后，`supabase_flutter` SDK 自动管理 JWT token（存储、刷新）
2. 每次 PostgREST 请求自动附带 JWT
3. PostgreSQL RLS 策略基于 `auth.uid()` 过滤数据，确保用户只能访问自己的记录

### 3.3 PostgREST (自动 REST API)

Supabase 的 PostgREST 为每张表自动生成 RESTful API，**无需手写 CRUD 路由**：

```dart
// Select with filtering
final questions = await supabase
    .from('questions')
    .select('id, content, subject, difficulty')
    .eq('subject', 'math')
    .order('created_at', ascending: false)
    .limit(20);

// Insert
await supabase.from('mistake_records').insert({
  'user_id': userId,
  'question_id': questionId,
  'wrong_answer': answer,
});

// RPC (stored procedure)
final stats = await supabase.rpc('get_user_stats', params: {'uid': userId});
```

**取舍**：PostgREST 覆盖 90% CRUD 场景。复杂聚合查询通过 PostgreSQL Function + `supabase.rpc()` 调用，避免 N+1 问题。

### 3.4 Row Level Security (RLS)

**核心原则**：每张用户数据表必须开启 RLS，策略基于 `auth.uid()` 限制数据访问。

```sql
-- Example: users can only read/update their own mistake_records
ALTER TABLE mistake_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mistakes"
  ON mistake_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mistakes"
  ON mistake_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mistakes"
  ON mistake_records FOR DELETE
  USING (auth.uid() = user_id);
```

**Admin Dashboard 绕过 RLS**：管理后台使用 `service_role` key 初始化 Supabase 客户端，自动绕过 RLS。此 key **仅存在于 Admin 服务端环境变量**，永不暴露给客户端。

### 3.5 Edge Functions (AI Proxy)

**定位**：Supabase Edge Functions 运行在 Deno Runtime 上，用于：
1. **AI 代理**：代理 DeepSeek API 调用，隐藏 API Key，SSE 流式转发
2. **限流**：调用 Upstash Redis 做 Token Bucket 限流
3. **复杂业务逻辑**：超出 PostgREST 能力的场景（如聚合多表数据后调 AI）

**目录结构**：

```
supabase/
├── functions/
│   ├── ai-chat/
│   │   └── index.ts              # AI 对话 SSE 流式代理
│   ├── ai-explain/
│   │   └── index.ts              # 题目解析
│   └── _shared/
│       ├── deepseek.ts           # DeepSeek API client
│       ├── rate-limit.ts         # Upstash rate limiting
│       ├── auth.ts               # JWT verification helper
│       └── cors.ts               # CORS headers
├── migrations/                    # 数据库迁移文件
├── seed.sql                       # 测试数据
└── config.toml                    # Supabase 本地配置
```

**SSE 流式代理实现**：

```typescript
// supabase/functions/ai-chat/index.ts
import { serve } from "https://deno.land/std/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify JWT from Authorization header
  const authHeader = req.headers.get("Authorization");
  const { userId } = await verifyJwt(authHeader);

  // Rate limiting via Upstash Redis
  const { success } = await checkRateLimit(userId);
  if (!success) {
    return new Response(
      JSON.stringify({ error: { code: "RATE_LIMITED", message: "Daily limit reached" } }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Stream from DeepSeek API
  const { messages } = await req.json();
  const deepseekRes = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("DEEPSEEK_API_KEY")}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages,
      stream: true,
    }),
  });

  // Forward SSE stream to client
  return new Response(deepseekRes.body, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});
```

**升级路径**：Edge Functions 目前有 400ms CPU 时间限制（非 wall-clock），足够 AI streaming proxy 场景。若需长时间运算，可迁移至 Fly.io 或 Railway 上的独立 Deno 服务。

### 3.6 Realtime (预留)

Supabase Realtime 提供 PostgreSQL 变更推送（通过 WebSocket）。MVP 不启用，但预留以下场景：

- 管理员审核题目后，用户端实时收到通知
- 多人同时在线做题时，排行榜实时更新

启用时只需在客户端订阅 channel，无需后端改动：

```dart
// ponytail: MVP 不启用, 升级路径: 排行榜/通知场景开启
supabase.channel('public:questions').onPostgresChanges(
  event: PostgresChangeEvent.insert,
  schema: 'public',
  table: 'questions',
  callback: (payload) { /* handle new question */ },
).subscribe();
```

---

## 4. AI 集成方案

### 4.1 模型选型：DeepSeek

| 维度 | DeepSeek | GPT-4o | Claude |
|---|---|---|---|
| **价格** (输入/百万 token) | ~¥1 | ~$2.5 (~¥18) | ~$3 (~¥21) |
| **中文能力** | ⭐⭐⭐⭐⭐ 原生中文训练 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **数学推理** | ⭐⭐⭐⭐⭐ DeepSeek-R1 级别 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **TTFT** | <500ms | <800ms | <600ms |

**决策理由**：
1. **成本**：考研助手为 C 端免费/低价产品，AI 调用成本是核心约束。DeepSeek 价格优势碾压。
2. **中文专项**：原生中文训练数据，考研政治、英语翻译、数学解析质量稳定。
3. **数学能力**：DeepSeek-R1 系列在数学推理上表现优异，考研数学题解析刚需。

**升级路径**：Edge Function 中 DeepSeek 调用封装在 `_shared/deepseek.ts` 中，切换其他 OpenAI-compatible API（如 OpenRouter 多模型路由）只需改 base URL + API Key。

### 4.2 SSE 流式架构

```
Flutter Client                    Supabase Edge Function              DeepSeek API
     │                                    │                                │
     │── POST /functions/v1/ai-chat ─────▶│                                │
     │   {messages: [...]}                 │── POST /chat/completions ─────▶│
     │                                    │   {stream: true}               │
     │                                    │◀── data: {"choices":[...]} ────│
     │◀── data: {"content":"考"} ─────────│                                │
     │◀── data: {"content":"研"} ─────────│◀── data: {"choices":[...]} ────│
     │◀── data: {"content":"数学"} ───────│◀── data: {"choices":[...]} ────│
     │◀── data: [DONE] ──────────────────│◀── data: [DONE] ───────────────│
     │                                    │                                │
```

**Flutter 端 SSE 消费**：

```dart
// Using dio for SSE streaming
final response = await dio.post(
  '${Env.supabaseUrl}/functions/v1/ai-chat',
  data: {'messages': messages},
  options: Options(
    headers: {'Authorization': 'Bearer $accessToken'},
    responseType: ResponseType.stream,
  ),
);

// Parse SSE events from byte stream
final stream = response.data.stream as Stream<List<int>>;
await for (final chunk in stream.transform(utf8.decoder)) {
  for (final line in chunk.split('\n')) {
    if (line.startsWith('data: ') && line != 'data: [DONE]') {
      final json = jsonDecode(line.substring(6));
      final content = json['choices'][0]['delta']['content'];
      if (content != null) onToken(content);
    }
  }
}
```

### 4.3 Markdown + LaTeX 渲染

考研数学解析中大量混排 Markdown 文本 + LaTeX 公式，渲染方案：

```dart
// flutter_markdown + flutter_math_fork
Markdown(
  data: aiResponse,
  builders: {
    'math': MathBuilder(),       // inline math: $...$
    'mathBlock': MathBlockBuilder(), // block math: $$...$$
  },
)
```

**关键细节**：
- `flutter_math_fork` 为纯 Dart 实现，不依赖 WebView，移动端渲染性能好
- 需自定义 Markdown parser 识别 `$...$` 和 `$$...$$` 语法
- 对比 `flutter_tex`（基于 WebView + MathJax）：移动端性能差 5-10x，且初始化耗时长

---

## 5. 缓存与限流 (Upstash Redis)

### 5.1 定位

Upstash Redis 通过 **HTTP 协议** 访问，无需持久连接，天然适合 Serverless / Edge Functions 环境。

### 5.2 使用场景

| 职能 | 实现方式 | Key 设计 | TTL |
|---|---|---|---|
| **AI 限流** | `@upstash/ratelimit` Token Bucket | `ratelimit:chat:{userId}` | 按配置（如 30 次/天） |
| **热点缓存** | 院校报录比、热门题目统计 | `cache:school:{schoolId}:stats` | 1 小时 |
| **临时状态** | 背诵进度暂存（未完成卡片队列） | `session:memory:{userId}` | 24 小时 |

### 5.3 Edge Function 中的限流实现

```typescript
// supabase/functions/_shared/rate-limit.ts
import { Ratelimit } from "https://esm.sh/@upstash/ratelimit";
import { Redis } from "https://esm.sh/@upstash/redis";

const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
  token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 d"), // 30 requests per day
  analytics: true,
});

export async function checkRateLimit(userId: string) {
  return await ratelimit.limit(userId);
}
```

**免费额度**：Upstash 免费层 10k 命令/天，MVP 阶段充足。Pro 计划按用量付费，无预付。

---

## 6. Admin 管理后台 (dengke-admin/)

### 6.1 技术栈

| 类别 | 选型 | 理由 |
|---|---|---|
| **框架** | Next.js 15.x (App Router) | Vercel 一键部署、SSR 管理页面、成熟生态 |
| **语言** | TypeScript (strict) | 类型安全 |
| **样式** | Tailwind CSS 4.x | 快速搭建管理 UI |
| **状态管理** | Zustand | 轻量，管理后台状态简单 |
| **数据请求** | `@supabase/supabase-js` | 直连 Supabase PostgREST，使用 `service_role` key |
| **组件库** | shadcn/ui (可选) | Tailwind 原生、可复制可修改、无运行时 |
| **包管理** | pnpm | 与项目规范一致 |
| **部署** | Vercel | 自动 CI/CD，Preview Deployment |

### 6.2 功能范围

- 题库管理（CRUD、批量导入、审核 UGC）
- 用户管理（查看、封禁、统计）
- 院校数据管理（报录比、分数线）
- 数据分析面板（用户活跃、AI 调用量、错误率）
- AI 用量监控 + 限流配置

### 6.3 安全隔离

- Admin 使用 `SUPABASE_SERVICE_ROLE_KEY` 访问数据库，**绕过 RLS**
- 此 key 仅存在于 Vercel 环境变量（Secret），不进入客户端代码
- Admin 登录独立验证：Supabase Auth + 数据库 `admin_roles` 表角色检查
- Admin 部署在独立域名（如 `admin.dengke.app`），与客户端完全隔离

---

## 7. 数据库设计规范

### 7.1 Schema 约定

| 规则 | 示例 |
|---|---|
| 表名：复数 + snake_case | `users`, `questions`, `mistake_records`, `target_schools` |
| 主键：`id` (UUID) | `id UUID DEFAULT gen_random_uuid() PRIMARY KEY` |
| 外键：`xxx_id` | `user_id`, `question_id`, `school_id` |
| 时间戳 | `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at`, `deleted_at`（软删除） |
| 索引 | 外键字段默认建索引，高频查询字段加复合索引 |
| 枚举 | 使用 PostgreSQL `TEXT CHECK` 或自定义 `TYPE`，不用 magic number |

### 7.2 迁移管理

通过 **Supabase CLI** 管理迁移：

```bash
# Generate a new migration
supabase migration new add_questions_table

# Apply migrations to local database
supabase db reset

# Push migrations to remote (production)
supabase db push
```

**严禁**通过 Dashboard SQL Editor 直接修改生产环境表结构。所有 schema 变更必须通过迁移文件，纳入 Git 版本控制。

### 7.3 核心表预览

```sql
-- Users (Supabase Auth 自动创建 auth.users, 这里是 public profile)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  target_school_id UUID REFERENCES target_schools(id),
  exam_year INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Questions
CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL CHECK (subject IN ('math', 'english', 'politics', 'professional')),
  content TEXT NOT NULL,
  answer TEXT NOT NULL,
  explanation TEXT,
  difficulty INT CHECK (difficulty BETWEEN 1 AND 5),
  source TEXT,                    -- e.g., '2024年真题'
  created_by UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Mistake records
CREATE TABLE mistake_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  wrong_answer TEXT NOT NULL,
  review_count INT DEFAULT 0,
  next_review_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ
);
```

---

## 8. 国际化 (i18n)

### 8.1 方案

| 端 | 方案 | 支持语言 |
|---|---|---|
| Flutter 客户端 | `flutter_localizations` + `intl` + `gen-l10n` 代码生成 | 中文 (zh)、英文 (en) |
| Admin 后台 | `next-intl`（App Router 集成） | 中文 (zh)、英文 (en) |

### 8.2 Flutter i18n 工作流

```yaml
# pubspec.yaml
flutter:
  generate: true  # enable gen-l10n

# l10n.yaml
arb-dir: lib/core/l10n
template-arb-file: app_zh.arb
output-localization-file: app_localizations.dart
```

```json
// lib/core/l10n/app_zh.arb
{
  "appTitle": "登科 · 考研助手",
  "quizStartButton": "开始刷题",
  "aiChatPlaceholder": "请输入你的问题..."
}
```

```json
// lib/core/l10n/app_en.arb
{
  "appTitle": "DengKe · Postgrad Helper",
  "quizStartButton": "Start Quiz",
  "aiChatPlaceholder": "Ask your question..."
}
```

```dart
// Usage in widget (type-safe)
Text(AppLocalizations.of(context)!.appTitle)
```

---

## 9. 开发环境搭建

### 9.1 前置要求

| 工具 | 版本 | 用途 |
|---|---|---|
| Flutter SDK | 3.x stable | 客户端开发 |
| Dart SDK | 3.x (随 Flutter) | 语言运行时 |
| Supabase CLI | latest | 本地开发、迁移管理 |
| Docker Desktop | latest | Supabase 本地运行（`supabase start`） |
| Node.js | 20.x LTS | Admin 后台开发 |
| pnpm | 9.x+ | Admin 后台包管理 |
| Xcode | latest | iOS/macOS 构建（仅 macOS） |
| Android Studio | latest | Android 构建 + 模拟器 |

### 9.2 本地开发流程

```bash
# 1. Clone repos
git clone <dengke-app-repo>
git clone <dengke-admin-repo>

# 2. Start Supabase local dev stack (PostgreSQL + Auth + PostgREST + Edge Functions)
cd dengke-app
supabase start
# outputs: API URL, anon key, service_role key for local use

# 3. Run database migrations
supabase db reset   # apply all migrations + seed data

# 4. Run Flutter client
cd dengke-app
flutter pub get
flutter run -d chrome        # Web
flutter run -d macos          # macOS desktop
flutter run                   # connected device / emulator

# 5. Run Edge Functions locally
supabase functions serve ai-chat --env-file .env.local

# 6. Run Admin dashboard (separate terminal)
cd dengke-admin
pnpm install
pnpm dev
```

### 9.3 环境变量

#### Flutter 客户端 (.env / dart-define)

| 变量名 | 用途 | 说明 |
|---|---|---|
| `SUPABASE_URL` | Supabase 项目 URL | 本地: `http://localhost:54321` |
| `SUPABASE_ANON_KEY` | Supabase 匿名 Key | 客户端安全（受 RLS 限制） |

Flutter 通过 `--dart-define` 或 `flutter_dotenv` 注入：

```bash
flutter run --dart-define=SUPABASE_URL=http://localhost:54321 \
            --dart-define=SUPABASE_ANON_KEY=eyJ...
```

#### Supabase Edge Functions (.env.local)

| 变量名 | 用途 | 存储位置 |
|---|---|---|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | Supabase Secrets (`supabase secrets set`) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis 地址 | Supabase Secrets |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis Token | Supabase Secrets |

#### Admin 后台 (.env.local)

| 变量名 | 用途 | 存储位置 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目地址 | Vercel Env |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名 Key | Vercel Env |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 管理员 Key（绕过 RLS） | Vercel Env (Secret) |

**安全规则**：
- `service_role` key 和所有 API secret **永不出现在客户端代码**中
- Flutter 客户端的 `SUPABASE_ANON_KEY` 是安全的，因为 RLS 策略限制了数据访问范围
- 所有 `.env*` 文件加入 `.gitignore`

---

## 10. 部署方案

### 10.1 Flutter 客户端

| 平台 | 构建产物 | 分发渠道 | 构建命令 |
|---|---|---|---|
| **Android** | APK / AAB | Google Play / 直接下载 | `flutter build apk --release` |
| **iOS** | IPA | App Store (TestFlight) | `flutter build ipa --release` |
| **Web** | 静态文件 | Firebase Hosting / Vercel / Cloudflare Pages | `flutter build web --release` |
| **macOS** | .app / .dmg | 直接下载 / Mac App Store | `flutter build macos --release` |
| **Windows** | .exe / MSIX | 直接下载 / Microsoft Store | `flutter build windows --release` |

**CI/CD**：GitHub Actions 矩阵构建，push tag 时自动触发多平台构建。

### 10.2 Supabase (全托管)

- **数据库/Auth/PostgREST**：Supabase 云平台自动管理，无需手动部署
- **Edge Functions**：通过 `supabase functions deploy ai-chat` 部署到 Supabase Edge（Deno Deploy 底层）
- **迁移**：通过 `supabase db push` 或 Supabase Dashboard 执行

**免费额度**：
- 数据库：500MB 存储 + 2GB 带宽/月
- Auth：50,000 MAU
- Edge Functions：500K 调用/月 + 100MB 脚本大小
- MVP 阶段完全够用

### 10.3 Admin 后台

- **平台**：Vercel
- **触发**：`git push main` → Vercel Auto Build → Production Deploy
- **Preview**：每个 PR 自动生成 Preview Deployment URL
- **域名**：`admin.dengke.app`（自定义域名）

---

## 11. 技术决策记录 (ADR 摘要)

### ADR-001: Flutter 替代 Next.js (Web-only → 4 端跨平台)

- **问题**：v2.0 Next.js 方案仅覆盖 Web，无法提供原生移动端体验
- **决策**：Flutter 单一代码库，编译 Android / iOS / Web / Desktop 四端
- **代价**：Flutter Web SEO 弱（Canvas 渲染）、Dart 生态不如 JS/TS 丰富
- **缓解**：考研助手为登录后使用的工具型产品，SEO 需求低；Flutter 生态核心库齐全

### ADR-002: Supabase 全托管替代 Next.js API Routes

- **问题**：放弃 Next.js 后失去其 API Routes 能力
- **决策**：Supabase 作为完整后端——Auth + PostgREST + Edge Functions
- **代价**：PostgREST 不适合复杂业务逻辑；Edge Functions 有冷启动
- **缓解**：复杂逻辑走 PostgreSQL Function + RPC；AI proxy 是 IO-bound，冷启动影响可忽略

### ADR-003: Riverpod 作为 Flutter 状态管理

- **问题**：Flutter 状态管理方案众多，需要统一选型
- **决策**：Riverpod 2.x + riverpod_generator 代码生成
- **理由**：编译期 Provider 依赖检查（Provider 做不到）、无 BuildContext 依赖（Bloc/Provider 需要）、自动 dispose（GetX 不保证）
- **代价**：学习曲线比 Provider 陡，代码生成需 `build_runner`
- **缓解**：一次配置 `build_runner` 后持续受益

### ADR-004: PostgREST 替代 Drizzle ORM

- **问题**：v2.0 使用 Drizzle ORM 访问数据库，Flutter 端无法使用
- **决策**：直接使用 Supabase PostgREST 自动 API，客户端通过 `supabase_flutter` SDK 调用
- **代价**：失去 ORM 的 migration 类型安全；复杂查询需写 PostgreSQL Function
- **缓解**：Supabase CLI migration 管理足够；复杂查询少，RPC 补位

### ADR-005: 独立 Admin 仓库

- **问题**：管理后台用什么技术栈，放在哪个仓库
- **决策**：独立 `dengke-admin/` 仓库，Next.js + Tailwind + Supabase JS，部署 Vercel
- **理由**：Flutter Web 不适合做管理后台（表格、表单体验不如 React 生态）；独立仓库避免工具链冲突
- **数据一致性**：共享同一个 Supabase 项目，RLS + service_role key 保证权限隔离

---

## 12. 附录

### 12.1 关键 Dart/Flutter Package 清单

```yaml
# pubspec.yaml (core dependencies)
dependencies:
  flutter:
    sdk: flutter
  flutter_localizations:
    sdk: flutter
  intl: ^0.19.0
  flutter_riverpod: ^2.0.0
  riverpod_annotation: ^2.0.0
  go_router: ^14.0.0
  supabase_flutter: ^2.0.0
  dio: ^5.0.0
  flutter_markdown: ^0.7.0
  flutter_math_fork: ^0.7.0
  freezed_annotation: ^2.0.0
  json_annotation: ^4.0.0
  shared_preferences: ^2.0.0
  flutter_dotenv: ^5.0.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  riverpod_generator: ^2.0.0
  freezed: ^2.0.0
  json_serializable: ^6.0.0
  build_runner: ^2.0.0
  flutter_lints: ^4.0.0
```

### 12.2 与 v2.0 架构对比

| 维度 | v2.0 (Next.js 全栈) | v3.0 (Flutter + Supabase) |
|---|---|---|
| 客户端 | Next.js (Web only) | Flutter (Android/iOS/Web/Desktop) |
| 后端 | Next.js Route Handlers | Supabase PostgREST + Edge Functions |
| ORM | Drizzle ORM | PostgREST (无 ORM) |
| 状态管理 | Zustand | Riverpod |
| AI SDK | Vercel AI SDK | 手写 SSE 解析 (dio) |
| 部署 | Vercel 一体 | Flutter 多平台 + Supabase 托管 + Vercel (Admin) |
| 管理后台 | Next.js Route Group | 独立 Next.js 仓库 |
| 路由 | Next.js File Router | go_router |
| 国际化 | next-intl | flutter_localizations + intl |
