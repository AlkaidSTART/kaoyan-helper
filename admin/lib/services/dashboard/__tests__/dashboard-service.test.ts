import { describe, expect, it } from "vitest";

import { ERROR_CODES } from "../../../api/errors";
import type { DashboardRepository } from "../dashboard-service";
import { computeDaysUntilExam, DashboardService } from "../dashboard-service";

function fakeRepository(): DashboardRepository {
  return {
    countTodayAttempts: async () => 32,
    countActiveMistakes: async () => 5,
    countDueCards: async () => 12,
    countReviewedCards: async () => 120,
    listRecentCheckInDates: async () => [
      new Date("2026-09-26T00:00:00Z"),
      new Date("2026-09-25T00:00:00Z"),
    ],
    findPrimaryTarget: async () => ({
      schoolId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      schoolName: "示例大学",
      majorCode: "085400",
      majorName: "电子信息",
    }),
  };
}

describe("DashboardService.getSummary", () => {
  it("aggregates only the caller's data", async () => {
    const service = new DashboardService(fakeRepository());

    const summary = await service.getSummary(
      {
        id: "11111111-1111-4111-8111-111111111111",
        email: "user@example.com",
        nickname: null,
        examYear: 2027,
      },
      "Asia/Shanghai",
    );

    expect(summary).toMatchObject({
      todayQuestionCount: 32,
      activeMistakeCount: 5,
      dueCardCount: 12,
      totalReviewedCards: 120,
      streakDays: 2,
      primaryTarget: { schoolName: "示例大学" },
    });
  });

  it("rejects invalid timezones with 422", async () => {
    const service = new DashboardService(fakeRepository());

    await expect(
      service.getSummary(
        { id: "x", email: "", nickname: null, examYear: null },
        "Not/AZone",
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED, status: 422 });
  });
});

describe("computeDaysUntilExam", () => {
  it("counts calendar days to Dec 21 of examYear - 1", () => {
    const now = new Date("2026-09-26T10:00:00Z");

    expect(computeDaysUntilExam(2027, now, "Asia/Shanghai")).toBe(86);
  });

  it("returns null without an exam year or after the exam", () => {
    expect(computeDaysUntilExam(null, new Date(), "Asia/Shanghai")).toBeNull();
    expect(
      computeDaysUntilExam(2026, new Date("2027-01-01T00:00:00Z"), "Asia/Shanghai"),
    ).toBeNull();
  });
});
