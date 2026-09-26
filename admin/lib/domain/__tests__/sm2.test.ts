import { describe, expect, it } from "vitest";

import { computeSm2 } from "../sm2";

const now = new Date("2026-09-26T10:00:00Z");

describe("computeSm2", () => {
  it("resets interval and repetitions on forgot", () => {
    const result = computeSm2({ repetitions: 3, intervalDays: 10, easeFactor: 2.5 }, "forgot", now);

    expect(result).toEqual({
      repetitions: 0,
      intervalDays: 0,
      easeFactor: 2.3,
      dueAt: now,
    });
  });

  it("clamps ease factor at 1.3 for repeated forgot", () => {
    const result = computeSm2({ repetitions: 0, intervalDays: 0, easeFactor: 1.35 }, "forgot", now);

    expect(result.easeFactor).toBe(1.3);
  });

  it("schedules one day and lowers ease on fuzzy", () => {
    const result = computeSm2({ repetitions: 4, intervalDays: 15, easeFactor: 2.5 }, "fuzzy", now);

    expect(result).toMatchObject({ repetitions: 0, intervalDays: 1, easeFactor: 2.4 });
    expect(result.dueAt.getTime()).toBe(now.getTime() + 86_400_000);
  });

  it("follows 1 -> 3 -> interval * ease on remembered", () => {
    const first = computeSm2(null, "remembered", now);

    expect(first).toMatchObject({ repetitions: 1, intervalDays: 1, easeFactor: 2.6 });

    const second = computeSm2(
      { repetitions: first.repetitions, intervalDays: first.intervalDays, easeFactor: first.easeFactor },
      "remembered",
      now,
    );

    expect(second).toMatchObject({ repetitions: 2, intervalDays: 3, easeFactor: 2.7 });

    const third = computeSm2(
      { repetitions: second.repetitions, intervalDays: second.intervalDays, easeFactor: second.easeFactor },
      "remembered",
      now,
    );

    expect(third.intervalDays).toBe(8);
  });
});
