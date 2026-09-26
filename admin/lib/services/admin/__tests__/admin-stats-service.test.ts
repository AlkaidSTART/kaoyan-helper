import { describe, expect, it } from "vitest";

import { AdminStatsService } from "../admin-stats-service";
import type { AdminUserStatsRepository } from "../admin-stats-service";

function fakeRepo(overrides: { total?: number; range?: number } = {}) {
  const registeredCalls: Array<[Date, Date]> = [];
  const repository: AdminUserStatsRepository = {
    async countTotalUsers() {
      return overrides.total ?? 1_284;
    },
    async countUsersRegistered(from, toExclusive) {
      registeredCalls.push([from, toExclusive]);

      return overrides.range ?? 66;
    },
  };

  return { repository, registeredCalls };
}

describe("AdminStatsService（ADMIN-STAT-01）", () => {
  it("返回累计与区间新增，且前一窗口为紧邻等长区间", async () => {
    const { repository, registeredCalls } = fakeRepo({ total: 1_284, range: 66 });
    const service = new AdminStatsService(repository);
    const stats = await service.getUserStats({
      from: "2026-09-20",
      to: "2026-09-26",
      timeZone: "Asia/Shanghai",
    });

    expect(stats).toEqual({ totalUsers: 1_284, newUsers: 66, prevNewUsers: 66 });

    expect(registeredCalls).toHaveLength(2);
    expect(registeredCalls[0]?.[0].toISOString()).toBe("2026-09-20T00:00:00.000Z");
    expect(registeredCalls[0]?.[1].toISOString()).toBe("2026-09-27T00:00:00.000Z");
    expect(registeredCalls[1]?.[0].toISOString()).toBe("2026-09-13T00:00:00.000Z");
    expect(registeredCalls[1]?.[1].toISOString()).toBe("2026-09-20T00:00:00.000Z");
  });

  it("单日区间的前一窗口为前一天", async () => {
    const { repository, registeredCalls } = fakeRepo();
    const service = new AdminStatsService(repository);
    await service.getUserStats({
      from: "2026-09-26",
      to: "2026-09-26",
      timeZone: "Asia/Shanghai",
    });

    expect(registeredCalls).toHaveLength(2);
    expect(registeredCalls[0]?.[0].toISOString()).toBe("2026-09-26T00:00:00.000Z");
    expect(registeredCalls[0]?.[1].toISOString()).toBe("2026-09-27T00:00:00.000Z");
    expect(registeredCalls[1]?.[0].toISOString()).toBe("2026-09-25T00:00:00.000Z");
  });

  it("非法时区返回 422", async () => {
    const { repository } = fakeRepo();
    const service = new AdminStatsService(repository);

    await expect(
      service.getUserStats({ from: "2026-09-20", to: "2026-09-26", timeZone: "Mars/Olympus" }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("to 早于 from 返回 422", async () => {
    const { repository } = fakeRepo();
    const service = new AdminStatsService(repository);

    await expect(
      service.getUserStats({ from: "2026-09-26", to: "2026-09-20", timeZone: "Asia/Shanghai" }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("区间超过 90 天返回 422", async () => {
    const { repository } = fakeRepo();
    const service = new AdminStatsService(repository);

    await expect(
      service.getUserStats({ from: "2026-01-01", to: "2026-09-26", timeZone: "Asia/Shanghai" }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });
});
