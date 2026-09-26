import { describe, expect, it, vi } from "vitest";

import type { AuthUserRecord } from "../../../auth/auth-repository";
import type { UserSessionRepository } from "../../../auth/user-session-repository";
import { UserSessionService } from "../../../auth/user-session-service";
import { AdminActivityService } from "../../admin/admin-activity-service";
import type {
  AdminActivityRecord,
  AdminActivityRepository,
} from "../../admin/admin-activity-service";
import type { ActivityRecorder, RecordActivityInput } from "../activity-recorder";

const USER_A = "11111111-1111-4111-8111-111111111111";

function fakeRecorder(): ActivityRecorder & { records: RecordActivityInput[] } {
  const records: RecordActivityInput[] = [];

  return {
    records,
    async record(input) {
      records.push(input);
    },
  };
}

describe("活动埋点挂点", () => {
  it("答题判题成功后记录 question_attempt", async () => {
    const { QuizService } = await import("../../quiz/quiz-service");
    const recorder = fakeRecorder();
    const repository = {
      findQuestionById: async () => ({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        source: "official",
        reviewStatus: "approved",
        isDeleted: false,
        creatorId: null,
        type: "single_choice",
        options: [
          { key: "A", content: "质量互变规律" },
          { key: "B", content: "对立统一规律" },
        ],
        answer: "B",
        explanation: "解析",
      }),
      submitAnswer: async () => ({ mistake: null }),
    } as unknown as ConstructorParameters<typeof QuizService>[0];

    const service = new QuizService(repository, recorder);
    const result = await service.submitAnswer(USER_A, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", {
      answer: "b",
      attemptId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    });

    expect(result.isCorrect).toBe(true);
    expect(recorder.records).toEqual([
      {
        userId: USER_A,
        type: "question_attempt",
        summary: { questionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", isCorrect: true },
      },
    ]);
  });

  it("卡片复习成功后记录 card_review", async () => {
    const { FlashcardService } = await import("../../flashcards/flashcard-service");
    const recorder = fakeRecorder();
    const repository = {
      findCardById: async () => ({
        id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        source: "system",
        creatorId: null,
        isDeleted: false,
      }),
      findProgress: async () => null,
      reviewCard: async (params: { rating: string; now: Date }) => ({
        replayed: false,
        progress: {
          repetitions: 1,
          intervalDays: 1,
          easeFactor: 2.6,
          dueAt: new Date(params.now.getTime() + 86_400_000),
          lastRating: params.rating,
          version: 2,
        },
        dueRemaining: 0,
        checkIn: null,
      }),
    } as unknown as ConstructorParameters<typeof FlashcardService>[0];

    const service = new FlashcardService(repository, "Asia/Shanghai", recorder);
    await service.review(USER_A, "cccccccc-cccc-4ccc-8ccc-cccccccccccc", {
      rating: "remembered",
      idempotencyKey: "idem-key-0001",
    });

    expect(recorder.records).toEqual([
      {
        userId: USER_A,
        type: "card_review",
        summary: { cardId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", rating: "remembered" },
      },
    ]);
  });

  it("登录会话建立后记录 login", async () => {
    const recorder = fakeRecorder();
    const repository = {
      createSession: async () => ({}),
    } as unknown as UserSessionRepository;

    const service = new UserSessionService({ repository, activityRecorder: recorder });
    await service.createSessionPair(userRecord(), {
      clientType: "flutter",
      deviceName: "iPhone 15",
    });

    expect(recorder.records).toEqual([
      {
        userId: USER_A,
        type: "login",
        summary: { clientType: "flutter", deviceName: "iPhone 15" },
      },
    ]);
  });

  it("未注入 recorder 时主流程照常", async () => {
    const { QuizService } = await import("../../quiz/quiz-service");
    const repository = {
      findQuestionById: async () => null,
    } as unknown as ConstructorParameters<typeof QuizService>[0];

    const service = new QuizService(repository);

    await expect(
      service.submitAnswer(USER_A, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", {
        answer: "b",
        attemptId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      }),
    ).rejects.toMatchObject({ code: "QUESTION_NOT_ACCESSIBLE" });
  });
});

describe("PrismaActivityRecorder best-effort", () => {
  it("采集失败只记日志，不向调用方抛错", async () => {
    vi.doMock("../../../db/prisma", () => ({
      getPrismaClient: () => ({
        userActivity: {
          create: async () => {
            throw new Error("db down");
          },
        },
      }),
    }));

    const onError = vi.fn();
    const { PrismaActivityRecorder } = await import("../prisma-activity-recorder");
    const recorder = new PrismaActivityRecorder(onError);

    await expect(
      recorder.record({ userId: USER_A, type: "login", summary: {} }),
    ).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledTimes(1);

    vi.doUnmock("../../../db/prisma");
    vi.resetModules();
  });
});

describe("AdminActivityService 查询", () => {
  const actor = {
    user: { id: "admin-1", email: "a@t.dev", nickname: "管理员", role: "admin", isBanned: false },
  };

  const nonAdminActor = {
    user: { id: "u-9", email: "u@t.dev", nickname: "考生", role: "user", isBanned: false },
  };

  function recordRow(overrides: Partial<AdminActivityRecord> = {}): AdminActivityRecord {
    return {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      type: "login",
      summary: { clientType: "flutter" },
      createdAt: new Date("2026-09-26T08:30:00Z"),
      user: { id: USER_A, email: "u@t.dev", nickname: "考生" },
      ...overrides,
    };
  }

  it("映射 DTO 并透传筛选条件", async () => {
    const captured: unknown[] = [];
    const repository: AdminActivityRepository = {
      async listActivities(filters) {
        captured.push(filters);

        return {
          rows: [recordRow({ type: "question_attempt" })],
          total: 1,
        };
      },
    };
    const service = new AdminActivityService(repository);
    const { rows, total } = await service.list(
      actor,
      { userId: USER_A, type: "question_attempt" },
      1,
      20,
    );

    expect(captured[0]).toEqual({ userId: USER_A, type: "question_attempt" });
    expect(total).toBe(1);
    expect(rows[0]).toEqual({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      type: "question_attempt",
      summary: { clientType: "flutter" },
      occurredAt: "2026-09-26T08:30:00Z",
      user: { id: USER_A, email: "u@t.dev", nickname: "考生" },
    });
  });

  it("非管理员触发 ADMIN_REQUIRED", async () => {
    const service = new AdminActivityService({
      async listActivities() {
        return { rows: [], total: 0 };
      },
    });

    await expect(
      service.list(nonAdminActor, { userId: null, type: null }, 1, 20),
    ).rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
  });
});

function userRecord(): AuthUserRecord {
  return {
    id: USER_A,
    email: "u@t.dev",
    nickname: "考生",
    avatarUrl: null,
    examYear: 2027,
    role: "user",
    isBanned: false,
    bannedUntil: null,
    createdAt: new Date("2026-09-01T00:00:00Z"),
    updatedAt: new Date("2026-09-01T00:00:00Z"),
  };
}
