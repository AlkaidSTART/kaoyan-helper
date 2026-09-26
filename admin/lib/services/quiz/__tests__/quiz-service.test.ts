import { describe, expect, it, vi } from "vitest";

import { ERROR_CODES } from "../../../api/errors";
import type {
  CreateQuestionInput,
  QuestionFilters,
  QuestionRow,
  QuizRepository,
} from "../quiz-service";
import { QuizService } from "../quiz-service";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";

function questionRow(overrides: Partial<QuestionRow> = {}): QuestionRow {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    subject: "politics",
    chapter: "马克思主义基本原理",
    year: 2024,
    type: "single_choice",
    stem: "唯物辩证法的实质和核心是（ ）",
    options: [
      { key: "A", content: "质量互变规律" },
      { key: "B", content: "对立统一规律" },
    ],
    answer: "B",
    explanation: "对立统一规律揭示了事物发展的源泉和动力。",
    difficulty: "medium",
    source: "official",
    visibility: "public",
    reviewStatus: "approved",
    isApproved: true,
    creatorId: null,
    isDeleted: false,
    version: 1,
    createdAt: new Date("2026-09-20T08:00:00Z"),
    updatedAt: new Date("2026-09-20T08:00:00Z"),
    ...overrides,
  };
}

function fakeRepository(row: QuestionRow | null = questionRow()): QuizRepository & {
  submitSpy: ReturnType<typeof vi.fn>;
} {
  const submitSpy = vi.fn(
    async (params: { isCorrect: boolean; attemptId: string }) => ({
      mistake: params.isCorrect
        ? null
        : {
            id: "mmmmmmmm-mmmm-4mmm-8mmm-mmmmmmmmmmmm",
            status: "active",
            errorCount: 1,
            consecutiveCorrect: 0,
            masteredAt: null,
          },
    }),
  );

  return {
    submitSpy,
    listQuestions: async () => ({ rows: [row], total: 1 }),
    findQuestionById: async () => row,
    submitAnswer: submitSpy,
    createQuestion: async (_userId: string, input: CreateQuestionInput) =>
      questionRow({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        source: "ugc",
        visibility: input.visibility,
        reviewStatus: "pending",
        isApproved: false,
        creatorId: _userId,
      }),
    updateQuestion: async (_userId: string, _id: string, input: { version: number }) =>
      questionRow({ version: input.version + 1, stem: "更新后的题干" }),
    softDeleteQuestion: async () => undefined,
  } as unknown as QuizRepository & { submitSpy: ReturnType<typeof vi.fn> };
}

describe("QuizService.getDetail", () => {
  it("returns the answer for approved official questions", async () => {
    const service = new QuizService(fakeRepository());
    const detail = await service.getDetail(USER_A, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");

    expect(detail.answer).toBe("B");
    expect(detail.explanation).not.toBeNull();
  });

  it("hides inaccessible questions with 404", async () => {
    const service = new QuizService(
      fakeRepository(questionRow({ reviewStatus: "pending", source: "ugc", creatorId: USER_B })),
    );

    await expect(
      service.getDetail(USER_A, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
    ).rejects.toMatchObject({ code: ERROR_CODES.QUESTION_NOT_ACCESSIBLE, status: 404 });
  });

  it("lets the creator read their own pending question", async () => {
    const service = new QuizService(
      fakeRepository(questionRow({ source: "ugc", reviewStatus: "pending", creatorId: USER_A })),
    );

    await expect(
      service.getDetail(USER_A, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
    ).resolves.toMatchObject({ isMine: true });
  });
});

describe("QuizService.submitAnswer", () => {
  it("delegates judging to the repository transaction and returns the verdict", async () => {
    const repository = fakeRepository();
    const service = new QuizService(repository);

    const result = await service.submitAnswer(USER_A, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", {
      answer: "b",
      attemptId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    });

    expect(result.isCorrect).toBe(true);
    expect(result.correctAnswer).toBe("B");
    expect(repository.submitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_A,
        isCorrect: true,
        attemptId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      }),
    );
  });

  it("attaches the mistake snapshot for wrong answers", async () => {
    const service = new QuizService(fakeRepository());
    const result = await service.submitAnswer(USER_A, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", {
      answer: "A",
      attemptId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    });

    expect(result.isCorrect).toBe(false);
    expect(result.mistake).toMatchObject({ status: "active", errorCount: 1 });
  });
});

describe("QuizService.create", () => {
  it("creates UGC questions in pending review", async () => {
    const service = new QuizService(fakeRepository());
    const created = await service.create(USER_A, {
      subject: "english",
      chapter: null,
      year: 2025,
      type: "single_choice",
      stem: "题干",
      options: [{ key: "A", content: "选项" }],
      answer: "A",
      explanation: null,
      difficulty: null,
      visibility: "public",
    });

    expect(created).toMatchObject({ source: "ugc", reviewStatus: "pending", isMine: true });
  });
});

describe("QuizService.update", () => {
  it("rejects updates to other users' questions with 404", async () => {
    const service = new QuizService(
      fakeRepository(questionRow({ source: "ugc", creatorId: USER_B })),
    );

    await expect(
      service.update(USER_A, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", { version: 1 }),
    ).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND, status: 404 });
  });
});

describe("QuizService.remove", () => {
  it("passes the version through for optimistic locking", async () => {
    const repository = fakeRepository(
      questionRow({ source: "ugc", creatorId: USER_A, version: 3 }),
    );
    const softDeleteSpy = vi.spyOn(repository, "softDeleteQuestion");
    const service = new QuizService(repository);

    await service.remove(USER_A, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", 3);

    expect(softDeleteSpy).toHaveBeenCalledWith(
      USER_A,
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      3,
    );
  });
});

describe("QuizService.list", () => {
  it(" forwards scope filters to the repository", async () => {
    const repository = fakeRepository();
    const listSpy = vi.spyOn(repository, "listQuestions");
    const service = new QuizService(repository);
    const filters: QuestionFilters = {
      scope: "mine",
      subject: "politics",
      chapter: null,
      year: null,
      type: null,
      difficulty: null,
      search: null,
    };

    await service.list(USER_A, filters, 1, 20);

    expect(listSpy).toHaveBeenCalledWith(USER_A, filters, 1, 20);
  });
});
