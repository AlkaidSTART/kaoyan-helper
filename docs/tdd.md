# 登科 · 考研助手 (DengKe) — TDD 测试设计与规范文档

> **版本**: v2.0 | **最后更新**: 2026-09-19
> **状态**: 经讨论确认。架构已调整为 Next.js 全栈 TypeScript，Go 后端相关测试已移除。

---

## 1. 测试策略

### 1.1 总体方针

遵循 TDD 循环：**Red (写失败测试) → Green (最简实现通过) → Refactor (重构，测试仍绿)**。

项目全栈 TypeScript，测试分三层：

| 层级 | 占比 | 工具 | 覆盖范围 |
|---|---|---|---|
| **单元测试** | ~60% | Vitest | 纯函数、算法逻辑、状态管理 (Zustand store)、数据转换、工具函数 |
| **集成测试** | ~30% | Vitest + @testing-library/react | 组件交互流程、API Route Handler 请求/响应、数据库查询结果 |
| **E2E 测试** | ~10% | Playwright | 关键用户流程 (登录→刷题→错题→AI 答疑全链路) |

### 1.2 核心原则

1. **业务逻辑变更必须附带测试**——无测试的业务 PR 不予合并。
2. **测试基于实现理解**——不能仅从接口猜行为，必须看过代码再写测试，覆盖关键分支与边界。
3. **纯逻辑优先提取**——将算法（SM-2、报录比计算、错题状态机）抽为纯函数，与 I/O 解耦，单元测试覆盖率 >= 90%。
4. **数据库测试用真实连接**——集成测试连接 Supabase 测试项目（或本地 Docker PostgreSQL），禁止 Mock 数据库掩盖 SQL 错误。
5. **API 测试用 Next.js 内建机制**——对 Route Handler 使用 `NextRequest` / `NextResponse` 直接调用，不启动 HTTP 服务器。

### 1.3 不测什么

- 纯 UI 样式/布局（交给视觉审查 + Storybook 截图对比，非 MVP 范围）。
- 第三方库的内部行为（Supabase Auth SDK、Vercel AI SDK 等）。
- 配置类代码（`tailwind.config.ts`、`next.config.ts`）。

---

## 2. 测试目录结构

遵循 Colocation 原则——测试文件与源文件同目录：

```
src/
├── lib/
│   ├── algorithms/
│   │   ├── sm2.ts                      # SM-2 间隔复习算法
│   │   ├── sm2.test.ts                 # ← 纯函数单元测试
│   │   ├── mistake-state-machine.ts    # 错题状态机
│   │   └── mistake-state-machine.test.ts
│   ├── utils/
│   │   ├── admission-ratio.ts          # 报录比计算
│   │   └── admission-ratio.test.ts
│   └── validators/
│       ├── question.schema.ts          # Zod schema
│       └── question.schema.test.ts     # schema 验证边界测试
├── features/
│   ├── quiz/
│   │   ├── QuizCard.tsx
│   │   ├── QuizCard.test.tsx           # ← 组件交互测试
│   │   ├── useQuizStore.ts
│   │   └── useQuizStore.test.ts        # ← Store 状态流转测试
│   ├── memory/
│   │   ├── Flashcard.tsx
│   │   ├── Flashcard.test.tsx
│   │   ├── useMemoryStore.ts
│   │   └── useMemoryStore.test.ts
│   └── chat/
│       ├── ChatPanel.tsx
│       └── ChatPanel.test.tsx
├── app/
│   └── api/v1/
│       ├── questions/
│       │   ├── route.ts
│       │   └── route.test.ts           # ← API Route Handler 集成测试
│       ├── chat/
│       │   ├── route.ts
│       │   └── route.test.ts
│       └── schools/
│           ├── route.ts
│           └── route.test.ts
└── e2e/
    ├── quiz-flow.spec.ts               # ← Playwright E2E
    ├── memory-flow.spec.ts
    └── auth-flow.spec.ts
```

---

## 3. 核心模块测试用例设计

### 3.1 错题状态机 (`mistake-state-machine.ts`)

这是产品最核心的业务逻辑——错题的生命周期状态流转。

**纯函数签名**:
```typescript
type MistakeState = {
  status: 'active' | 'mastered';
  errorCount: number;
  consecutiveCorrect: number;
  masteredAt: Date | null;
};

function transitionMistakeState(
  current: MistakeState,
  event: 'answer_wrong' | 'answer_correct'
): MistakeState;
```

**测试用例**:

```typescript
// mistake-state-machine.test.ts
import { describe, it, expect } from 'vitest';
import { transitionMistakeState, createInitialMistakeState } from './mistake-state-machine';

describe('错题状态机', () => {
  describe('首次答错 → 创建活跃错题', () => {
    it('应创建 active 状态，errorCount=1，consecutiveCorrect=0', () => {
      const state = createInitialMistakeState();
      expect(state).toEqual({
        status: 'active',
        errorCount: 1,
        consecutiveCorrect: 0,
        masteredAt: null,
      });
    });
  });

  describe('活跃错题再次答错', () => {
    it('errorCount 递增，consecutiveCorrect 重置为 0', () => {
      const current = { status: 'active', errorCount: 2, consecutiveCorrect: 1, masteredAt: null };
      const next = transitionMistakeState(current, 'answer_wrong');
      expect(next.errorCount).toBe(3);
      expect(next.consecutiveCorrect).toBe(0);
      expect(next.status).toBe('active');
    });
  });

  describe('重练答对但未达标 (consecutiveCorrect < 2)', () => {
    it('consecutiveCorrect 递增，保持 active', () => {
      const current = { status: 'active', errorCount: 3, consecutiveCorrect: 0, masteredAt: null };
      const next = transitionMistakeState(current, 'answer_correct');
      expect(next.consecutiveCorrect).toBe(1);
      expect(next.status).toBe('active');
    });
  });

  describe('连续第 2 次答对 → 标记掌握', () => {
    it('status 变为 mastered，masteredAt 非空', () => {
      const current = { status: 'active', errorCount: 3, consecutiveCorrect: 1, masteredAt: null };
      const next = transitionMistakeState(current, 'answer_correct');
      expect(next.consecutiveCorrect).toBe(2);
      expect(next.status).toBe('mastered');
      expect(next.masteredAt).toBeInstanceOf(Date);
    });
  });

  describe('已掌握状态答错 → 重新激活', () => {
    it('重回 active，consecutiveCorrect 清零', () => {
      const current = { status: 'mastered', errorCount: 3, consecutiveCorrect: 2, masteredAt: new Date() };
      const next = transitionMistakeState(current, 'answer_wrong');
      expect(next.status).toBe('active');
      expect(next.errorCount).toBe(4);
      expect(next.consecutiveCorrect).toBe(0);
      expect(next.masteredAt).toBeNull();
    });
  });

  describe('边界: 极端高 errorCount', () => {
    it('errorCount=999 时仍正常递增', () => {
      const current = { status: 'active', errorCount: 999, consecutiveCorrect: 0, masteredAt: null };
      const next = transitionMistakeState(current, 'answer_wrong');
      expect(next.errorCount).toBe(1000);
    });
  });
});
```

### 3.2 SM-2 间隔复习算法 (`sm2.ts`)

**纯函数签名**:
```typescript
type CardProgress = {
  repetitions: number;
  easeFactor: number;
  interval: number; // 天数
};

type Rating = 'forgot' | 'fuzzy' | 'remembered';

function calculateNextReview(
  current: CardProgress,
  rating: Rating
): CardProgress & { nextReviewAt: Date };
```

**测试用例**:

```typescript
// sm2.test.ts
describe('SM-2 间隔复习算法', () => {
  const BASE_PROGRESS: CardProgress = { repetitions: 0, easeFactor: 2.5, interval: 0 };

  describe('评级: forgot (忘记)', () => {
    it('interval 重置为 0，repetitions 重置为 0，easeFactor 递减 0.2', () => {
      const result = calculateNextReview(
        { repetitions: 3, easeFactor: 2.5, interval: 7 },
        'forgot'
      );
      expect(result.interval).toBe(0);
      expect(result.repetitions).toBe(0);
      expect(result.easeFactor).toBe(2.3);
    });

    it('easeFactor 不低于 1.3 下限', () => {
      const result = calculateNextReview(
        { repetitions: 1, easeFactor: 1.4, interval: 1 },
        'forgot'
      );
      expect(result.easeFactor).toBe(1.3); // max(1.3, 1.4 - 0.2)
    });

    it('nextReviewAt 应为当前时间 (今日重排)', () => {
      const before = Date.now();
      const result = calculateNextReview(BASE_PROGRESS, 'forgot');
      const after = Date.now();
      expect(result.nextReviewAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(result.nextReviewAt.getTime()).toBeLessThanOrEqual(after + 1000);
    });
  });

  describe('评级: fuzzy (模糊)', () => {
    it('interval 设为 1 天，repetitions 重置为 0，easeFactor 递减 0.1', () => {
      const result = calculateNextReview(
        { repetitions: 5, easeFactor: 2.5, interval: 14 },
        'fuzzy'
      );
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(0);
      expect(result.easeFactor).toBe(2.4);
    });
  });

  describe('评级: remembered (牢记)', () => {
    it('首次牢记: interval=1, repetitions=1', () => {
      const result = calculateNextReview(BASE_PROGRESS, 'remembered');
      expect(result.interval).toBe(1);
      expect(result.repetitions).toBe(1);
    });

    it('第二次牢记: interval=3, repetitions=2', () => {
      const result = calculateNextReview(
        { repetitions: 1, easeFactor: 2.5, interval: 1 },
        'remembered'
      );
      expect(result.interval).toBe(3);
      expect(result.repetitions).toBe(2);
    });

    it('后续牢记: interval = round(prev_interval * easeFactor)', () => {
      const result = calculateNextReview(
        { repetitions: 2, easeFactor: 2.5, interval: 3 },
        'remembered'
      );
      expect(result.interval).toBe(8); // round(3 * 2.5) = 8
      expect(result.repetitions).toBe(3);
      expect(result.easeFactor).toBe(2.6); // 2.5 + 0.1
    });

    it('easeFactor 累积递增正确', () => {
      let progress: CardProgress = { repetitions: 5, easeFactor: 2.8, interval: 30 };
      const result = calculateNextReview(progress, 'remembered');
      expect(result.easeFactor).toBe(2.9);
      expect(result.interval).toBe(Math.round(30 * 2.8)); // 84
    });
  });

  describe('边界情况', () => {
    it('easeFactor 极低时 interval 仍应为正数', () => {
      const result = calculateNextReview(
        { repetitions: 2, easeFactor: 1.3, interval: 3 },
        'remembered'
      );
      expect(result.interval).toBe(4); // round(3 * 1.3) = 4
      expect(result.interval).toBeGreaterThan(0);
    });
  });
});
```

### 3.3 报录比计算 (`admission-ratio.ts`)

```typescript
// admission-ratio.test.ts
describe('报录比计算', () => {
  it('标准计算: 400 报名 / 40 录取 = 10.0', () => {
    expect(calculateRatio(400, 40)).toBe(10.0);
  });

  it('录取为 0 时返回 null (防除零)', () => {
    expect(calculateRatio(120, 0)).toBeNull();
  });

  it('报名为 0 时返回 0', () => {
    expect(calculateRatio(0, 40)).toBe(0);
  });

  it('报名和录取都为 0 时返回 null', () => {
    expect(calculateRatio(0, 0)).toBeNull();
  });

  it('结果保留一位小数', () => {
    expect(calculateRatio(333, 50)).toBe(6.7); // 6.66 → 6.7
  });

  describe('难度标签', () => {
    it('ratio <= 5 → easy', () => {
      expect(getDifficultyLabel(4.2)).toBe('easy');
    });

    it('5 < ratio <= 10 → moderate', () => {
      expect(getDifficultyLabel(8.0)).toBe('moderate');
    });

    it('ratio > 10 → competitive', () => {
      expect(getDifficultyLabel(15.3)).toBe('competitive');
    });

    it('ratio 为 null → unknown', () => {
      expect(getDifficultyLabel(null)).toBe('unknown');
    });
  });
});
```

### 3.4 AI 限流 (API Route Handler 集成测试)

```typescript
// app/api/v1/chat/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('POST /api/v1/chat', () => {
  describe('限流', () => {
    it('第 30 次请求正常通过', async () => {
      // 模拟 Upstash Ratelimit 返回 success: true, remaining: 0
      mockRatelimit.limit.mockResolvedValue({ success: true, remaining: 0 });
      const response = await POST(createMockRequest({ message: '为什么选A？' }));
      expect(response.status).toBe(200);
    });

    it('第 31 次请求返回 429', async () => {
      mockRatelimit.limit.mockResolvedValue({
        success: false,
        remaining: 0,
        reset: Date.now() + 86400000,
      });
      const response = await POST(createMockRequest({ message: '再问一个' }));
      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.error.code).toBe('RATE_LIMITED');
      expect(body.error.message).toContain('今日提问次数已用完');
    });
  });

  describe('输入校验', () => {
    it('空消息返回 400', async () => {
      const response = await POST(createMockRequest({ message: '' }));
      expect(response.status).toBe(400);
    });

    it('超长消息 (>5000字) 返回 400', async () => {
      const response = await POST(createMockRequest({ message: 'a'.repeat(5001) }));
      expect(response.status).toBe(400);
    });

    it('未认证请求返回 401', async () => {
      const response = await POST(createMockRequest({ message: 'test' }, { noAuth: true }));
      expect(response.status).toBe(401);
    });
  });

  describe('流式响应', () => {
    it('正常请求返回 SSE 流', async () => {
      mockDeepSeek.mockStreamResponse(['这道', '题考查的是', '辩证法']);
      const response = await POST(createMockRequest({ message: '解释这道题' }));
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      // 验证 SSE 格式
      const text = await response.text();
      expect(text).toContain('data:');
    });
  });
});
```

### 3.5 前端组件交互测试

```typescript
// features/quiz/QuizCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('QuizCard 组件', () => {
  const mockQuestion = {
    id: '1',
    stem: '下列关于矛盾普遍性的表述，正确的是：',
    type: 'single_choice',
    options: [
      { key: 'A', content: '矛盾普遍性寓于特殊性之中' },
      { key: 'B', content: '矛盾特殊性可以脱离普遍性' },
      { key: 'C', content: '普遍性等同于特殊性' },
      { key: 'D', content: '以上都不对' },
    ],
    answer: 'A',
    explanation: '矛盾普遍性与特殊性是辩证统一关系...',
  };

  it('渲染题干和所有选项', () => {
    render(<QuizCard question={mockQuestion} />);
    expect(screen.getByText(/矛盾普遍性/)).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });

  it('点击正确选项 → 选项卡变绿，显示解析', async () => {
    render(<QuizCard question={mockQuestion} />);
    await userEvent.click(screen.getByText(/寓于特殊性/));
    expect(screen.getByText(/寓于特殊性/).closest('button')).toHaveClass('border-emerald');
    expect(screen.getByText(/辩证统一关系/)).toBeVisible();
  });

  it('点击错误选项 → 选项卡变红，正确选项标绿', async () => {
    render(<QuizCard question={mockQuestion} />);
    await userEvent.click(screen.getByText(/脱离普遍性/));
    expect(screen.getByText(/脱离普遍性/).closest('button')).toHaveClass('border-rose');
    expect(screen.getByText(/寓于特殊性/).closest('button')).toHaveClass('border-emerald');
  });

  it('键盘 A 键选中第一个选项', async () => {
    render(<QuizCard question={mockQuestion} />);
    await userEvent.keyboard('a');
    expect(screen.getByText(/寓于特殊性/).closest('button')).toHaveAttribute('aria-selected', 'true');
  });

  it('判定后显示 AI 答疑按钮', async () => {
    render(<QuizCard question={mockQuestion} />);
    await userEvent.click(screen.getByText(/寓于特殊性/));
    expect(screen.getByText(/AI 深度解析/)).toBeVisible();
  });

  it('判定后 Enter 键触发下一题', async () => {
    const onNext = vi.fn();
    render(<QuizCard question={mockQuestion} onNext={onNext} />);
    await userEvent.click(screen.getByText(/寓于特殊性/));
    await userEvent.keyboard('{Enter}');
    expect(onNext).toHaveBeenCalledOnce();
  });
});
```

### 3.6 Zustand Store 测试

```typescript
// features/quiz/useQuizStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useQuizStore } from './useQuizStore';

describe('useQuizStore', () => {
  beforeEach(() => {
    useQuizStore.setState(useQuizStore.getInitialState());
  });

  it('submitAnswer 答对 → correctCount 递增', () => {
    useQuizStore.getState().setQuestions([mockQuestion]);
    useQuizStore.getState().submitAnswer('A'); // 正确
    expect(useQuizStore.getState().correctCount).toBe(1);
    expect(useQuizStore.getState().currentResult).toBe('correct');
  });

  it('submitAnswer 答错 → wrongCount 递增，触发错题回调', () => {
    const onMistake = vi.fn();
    useQuizStore.getState().setOnMistake(onMistake);
    useQuizStore.getState().setQuestions([mockQuestion]);
    useQuizStore.getState().submitAnswer('C'); // 错误
    expect(useQuizStore.getState().wrongCount).toBe(1);
    expect(onMistake).toHaveBeenCalledWith(mockQuestion.id, 'C');
  });

  it('nextQuestion 推进到下一题', () => {
    useQuizStore.getState().setQuestions([mockQ1, mockQ2]);
    useQuizStore.getState().nextQuestion();
    expect(useQuizStore.getState().currentIndex).toBe(1);
  });

  it('最后一题后 nextQuestion → isComplete=true', () => {
    useQuizStore.getState().setQuestions([mockQ1]);
    useQuizStore.getState().submitAnswer('A');
    useQuizStore.getState().nextQuestion();
    expect(useQuizStore.getState().isComplete).toBe(true);
  });
});
```

---

## 4. E2E 测试 (Playwright)

仅覆盖最关键的用户全链路，MVP 维护 2~3 个 E2E 场景：

### 4.1 刷题全链路

```typescript
// e2e/quiz-flow.spec.ts
test('完整刷题流程: 答题 → 错题入库 → 重练消题', async ({ page }) => {
  await page.goto('/quiz?subject=politics');
  // 答错一题
  await page.click('text=矛盾特殊性可以脱离普遍性');
  await expect(page.locator('.border-rose')).toBeVisible();
  // 进入错题本验证
  await page.goto('/mistakes');
  await expect(page.locator('text=待消除')).toBeVisible();
  // 重练并连续答对 2 次
  await page.click('text=重做');
  await page.click('text=寓于特殊性');
  await page.click('text=重做');
  await page.click('text=寓于特殊性');
  await expect(page.locator('text=已掌握')).toBeVisible();
});
```

### 4.2 背诵打卡全链路

```typescript
// e2e/memory-flow.spec.ts
test('背诵流程: 翻转卡片 → 评级 → 完成打卡', async ({ page }) => {
  await page.goto('/memory');
  // 点击卡片翻转
  await page.click('[data-testid="flashcard"]');
  await expect(page.locator('[data-testid="card-back"]')).toBeVisible();
  // 点击"牢记"
  await page.click('text=牢记');
  // 验证进度更新
  await expect(page.locator('[data-testid="progress"]')).toContainText('1');
});
```

---

## 5. 自动化质量门禁

### 5.1 本地开发命令

```bash
# 全量单元+集成测试
pnpm test

# 带覆盖率报告
pnpm test:coverage

# 类型检查
pnpm type-check

# E2E 测试 (需先启动 dev server)
pnpm test:e2e
```

### 5.2 CI Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm type-check           # TypeScript 严格模式
      - run: pnpm lint                  # ESLint
      - run: pnpm test:coverage         # Vitest + 覆盖率
      - name: 覆盖率门禁
        run: |
          # 核心业务逻辑覆盖率 >= 80%
          # lib/algorithms/ 和 lib/utils/ 覆盖率 >= 90%
          pnpm check-coverage
```

### 5.3 覆盖率要求

| 目录 | 最低行覆盖率 | 说明 |
|---|---|---|
| `src/lib/algorithms/` | 90% | 核心算法：SM-2、错题状态机 |
| `src/lib/utils/` | 90% | 工具函数：报录比计算等 |
| `src/lib/validators/` | 85% | Zod schema 验证 |
| `src/features/` | 70% | 业务组件 + Store |
| `src/app/api/` | 75% | API Route Handler |
| 总体 | 75% | — |

---

## 6. 测试数据策略

### 6.1 Fixtures (静态测试数据)

```
src/
└── test/
    ├── fixtures/
    │   ├── questions.ts        # 各科目、各题型样例题
    │   ├── schools.ts          # 院校与报录比样例数据
    │   ├── cards.ts            # 记忆卡片样例
    │   └── users.ts            # 测试用户 (admin + user)
    ├── helpers/
    │   ├── create-mock-request.ts  # NextRequest 工厂
    │   └── setup-test-db.ts        # 测试数据库初始化与清理
    └── setup.ts                    # Vitest globalSetup
```

### 6.2 数据库测试隔离

- 每个测试套件 (describe block) 在事务中执行，结束时 rollback——测试间完全隔离，无需清理。
- 使用 Supabase 的测试项目（与生产/开发项目分离），连接串走 `TEST_DATABASE_URL` 环境变量。
