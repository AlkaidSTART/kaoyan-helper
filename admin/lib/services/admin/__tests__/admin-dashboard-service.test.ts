import { describe, expect, it } from "vitest";

import { AdminDashboardService } from "../admin-dashboard-service";
import type { AdminDashboardRepository } from "../admin-dashboard-service";

function fakeRepo(): AdminDashboardRepository {
  return {
    async countDistinctAttemptUsers() {
      return 42;
    },
    async countQuestionAnswers() {
      return 1_234;
    },
    async sumAiUsage() {
      return { calls: 216, costEstimate: 1.23 };
    },
    async listTopMistakes() {
      return [{ questionId: "q-1", stem: "题干", errorCount: 7 }];
    },
    async countTotalUsers() {
      return 1_284;
    },
    async countPendingUgc() {
      return 8;
    },
  };
}

const service = new AdminDashboardService(fakeRepo());

describe("AdminDashboardService 窗口校验", () => {
  it("默认最近 7 天由路由层传入；服务端校验聚合结果", async () => {
    const result = await service.getSummary({
      from: "2026-09-20",
      to: "2026-09-26",
      timeZone: "Asia/Shanghai",
    });

    expect(result).toMatchObject({
      dau: 42,
      wau: 42,
      questionAnswers: 1_234,
      aiCalls: 216,
      aiCostEstimate: 1.23,
      totalUsers: 1_284,
      pendingUgcCount: 8,
    });
    expect(result.topMistakes[0]).toMatchObject({ questionId: "q-1", errorCount: 7 });
  });

  it("非法时区返回 422", async () => {
    await expect(
      service.getSummary({ from: "2026-09-20", to: "2026-09-26", timeZone: "Mars/Olympus" }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("to 早于 from 返回 422", async () => {
    await expect(
      service.getSummary({ from: "2026-09-26", to: "2026-09-20", timeZone: "Asia/Shanghai" }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("区间超过 90 天返回 422", async () => {
    await expect(
      service.getSummary({ from: "2026-01-01", to: "2026-09-26", timeZone: "Asia/Shanghai" }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });
});
