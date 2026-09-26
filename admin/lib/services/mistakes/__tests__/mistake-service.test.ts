import { describe, expect, it, vi } from "vitest";

import { ERROR_CODES } from "../../../api/errors";
import type { MistakeRepository, MistakeRow } from "../mistake-service";
import { MistakeService } from "../mistake-service";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const MISTAKE_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const QUESTION_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function mistakeRow(overrides: Partial<MistakeRow> = {}): MistakeRow {
  return {
    id: MISTAKE_ID,
    userId: USER_A,
    questionId: QUESTION_ID,
    status: "active",
    errorCount: 1,
    consecutiveCorrect: 0,
    lastWrongAt: new Date("2026-09-25T10:00:00Z"),
    masteredAt: null,
    version: 1,
    createdAt: new Date("2026-09-25T10:00:00Z"),
    updatedAt: new Date("2026-09-25T10:00:00Z"),
    question: {
      id: QUESTION_ID,
      subject: "politics",
      chapter: null,
      year: 2024,
      type: "single_choice",
      stem: "题干",
      options: [
        { key: "A", content: "甲" },
        { key: "B", content: "乙" },
      ],
      answer: "B",
      explanation: "解析",
      difficulty: "medium",
      source: "official",
    },
    ...overrides,
  };
}

function fakeRepository(row: MistakeRow, redoResult: MistakeRow = row): MistakeRepository & {
  redoSpy: ReturnType<typeof vi.fn>;
} {
  const redoSpy = vi.fn(async () => ({ replayed: false, mistake: redoResult }));

  return {
    redoSpy,
    listMistakes: async () => ({ rows: [row], total: 1 }),
    findMistakeById: async () => row,
    redoMistake: redoSpy,
    reactivateMistake: async (_userId: string, _id: string, version: number) =>
      ({ ...row, status: "active", consecutiveCorrect: 0, masteredAt: null, version: version + 1 }) as MistakeRow,
    deleteMistake: async () => undefined,
  } as unknown as MistakeRepository & { redoSpy: ReturnType<typeof vi.fn> };
}

describe("MistakeService ownership", () => {
  it("hides other users' mistakes with 404 MISTAKE_NOT_FOUND", async () => {
    const service = new MistakeService(
      fakeRepository(mistakeRow({ userId: USER_B })),
    );

    await expect(
      service.getDetail(USER_A, MISTAKE_ID),
    ).rejects.toMatchObject({ code: ERROR_CODES.MISTAKE_NOT_FOUND, status: 404 });
  });
});

describe("MistakeService.redo", () => {
  it("judges server-side and reports mastery", async () => {
    const mastered = mistakeRow({
      status: "mastered",
      consecutiveCorrect: 2,
      masteredAt: new Date("2026-09-26T10:00:00Z"),
    });
    const repository = fakeRepository(mistakeRow(), mastered);
    const service = new MistakeService(repository);

    const result = await service.redo(USER_A, MISTAKE_ID, {
      answer: "B",
      attemptId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    });

    expect(result.isCorrect).toBe(true);
    expect(result.mastered).toBe(true);
    expect(repository.redoSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_A,
        isCorrect: true,
        attemptId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      }),
    );
  });

  it("marks wrong redo answers without mastery", async () => {
    const stillActive = mistakeRow({ errorCount: 2, consecutiveCorrect: 0 });
    const service = new MistakeService(fakeRepository(mistakeRow(), stillActive));

    const result = await service.redo(USER_A, MISTAKE_ID, {
      answer: "A",
      attemptId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    });

    expect(result.isCorrect).toBe(false);
    expect(result.mastered).toBe(false);
  });
});

describe("MistakeService.reactivate", () => {
  it("only reactivates mastered mistakes", async () => {
    const service = new MistakeService(fakeRepository(mistakeRow({ status: "active" })));

    await expect(
      service.reactivate(USER_A, MISTAKE_ID, "active", 1),
    ).rejects.toMatchObject({ code: ERROR_CODES.CONFLICT, status: 409 });
  });

  it("clears streak and mastery time when reactivating", async () => {
    const service = new MistakeService(
      fakeRepository(mistakeRow({ status: "mastered", masteredAt: new Date() })),
    );

    await expect(
      service.reactivate(USER_A, MISTAKE_ID, "active", 1),
    ).resolves.toMatchObject({ status: "active", consecutiveCorrect: 0, masteredAt: null });
  });
});

describe("MistakeService.remove", () => {
  it("deletes only the mistake, not the question", async () => {
    const repository = fakeRepository(mistakeRow({ version: 2 }));
    const deleteSpy = vi.spyOn(repository, "deleteMistake");
    const service = new MistakeService(repository);

    await service.remove(USER_A, MISTAKE_ID, 2);

    expect(deleteSpy).toHaveBeenCalledWith(USER_A, MISTAKE_ID, 2);
  });
});
