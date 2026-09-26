import { describe, expect, it } from "vitest";

import { AppError, ERROR_CODES } from "../../api/errors";
import { judgeAnswer, nextMistakeState } from "../judging";

const singleChoice = {
  type: "single_choice",
  options: [
    { key: "A", content: "质量互变规律" },
    { key: "B", content: "对立统一规律" },
  ],
  answer: "B",
};

describe("judgeAnswer", () => {
  it("judges a single choice answer case-insensitively", () => {
    expect(judgeAnswer(singleChoice, "b")).toEqual({ isCorrect: true, normalizedAnswer: "B" });
    expect(judgeAnswer(singleChoice, "A").isCorrect).toBe(false);
  });

  it("rejects answers outside the option keys", () => {
    expect(() => judgeAnswer(singleChoice, "C")).toThrowError(AppError);
    expect(() => judgeAnswer(singleChoice, "CC")).toThrowError(AppError);
    expect(() => judgeAnswer(singleChoice, "")).toThrowError(AppError);
    try {
      judgeAnswer(singleChoice, "Z");
    } catch (error) {
      expect((error as AppError).code).toBe(ERROR_CODES.ANSWER_INVALID);
    }
  });

  it("sorts multiple choice keys before comparing", () => {
    const multi = {
      type: "multiple_choice",
      options: [
        { key: "A", content: "1" },
        { key: "B", content: "2" },
        { key: "C", content: "3" },
      ],
      answer: "AC",
    };

    expect(judgeAnswer(multi, "CA")).toEqual({ isCorrect: true, normalizedAnswer: "AC" });
    expect(judgeAnswer(multi, "ABC").isCorrect).toBe(false);
    expect(judgeAnswer(multi, "A").isCorrect).toBe(false);
  });

  it("compares fill blank answers after trimming", () => {
    const blank = { type: "fill_blank", options: [], answer: "对立统一规律" };

    expect(judgeAnswer(blank, " 对立统一规律 ")).toEqual({
      isCorrect: true,
      normalizedAnswer: "对立统一规律",
    });
    expect(judgeAnswer(blank, "量变质变规律").isCorrect).toBe(false);
  });
});

describe("nextMistakeState", () => {
  const now = new Date("2026-09-26T10:00:00Z");

  it("creates an active mistake on the first wrong answer", () => {
    expect(nextMistakeState(null, false, now)).toEqual({
      status: "active",
      errorCount: 1,
      consecutiveCorrect: 0,
      masteredAt: null,
    });
  });

  it("increments error count and resets streak on repeated mistakes", () => {
    expect(
      nextMistakeState({ status: "active", errorCount: 2, consecutiveCorrect: 1 }, false, now),
    ).toEqual({
      status: "active",
      errorCount: 3,
      consecutiveCorrect: 0,
      masteredAt: null,
    });
  });

  it("advances the streak on redo success and masters at two", () => {
    const first = nextMistakeState({ status: "active", errorCount: 1, consecutiveCorrect: 0 }, true, now);

    expect(first).toMatchObject({ status: "active", consecutiveCorrect: 1, masteredAt: null });

    const second = nextMistakeState(
      { status: "active", errorCount: 1, consecutiveCorrect: first.consecutiveCorrect },
      true,
      now,
    );

    expect(second.status).toBe("mastered");
    expect(second.masteredAt).toEqual(now);
  });

  it("keeps mastered state once reached", () => {
    const next = nextMistakeState({ status: "mastered", errorCount: 3, consecutiveCorrect: 2 }, true, now);

    expect(next.status).toBe("mastered");
    expect(next.consecutiveCorrect).toBe(3);
  });
});
