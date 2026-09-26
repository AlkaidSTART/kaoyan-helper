import { describe, expect, it, vi } from "vitest";

import { AdminStatsService } from "../admin-stats-service";
import type { AdminUserStatsRepository } from "../admin-stats-service";

const DAY_MS = 86_400_000;

function fakeRepo(overrides: { total?: number; range?: number; prev?: number } = {}) {
  const countTotalUsers = vi.fn(async () => overrides.total ?? 1_284);
  const countUsersRegistered = vi.fn(async () => overrides.range ?? 66);

  return {
    repository: { countTotalUsers, countUsersRegistered } as AdminUserStatsRepository,
    countTotalUsers,
    countUsersRegistered,
  };
}

describe("AdminStatsService（ADMIN-STAT-01）", () => {
  it("返回累计与区间新增，且前一窗口为紧邻等长区间", async () => {
    const { repository, countUsersRegistered } = fakeRepo({ total: 1_284, range: 66 });
    const service = new AdminStatsService(repository);
    const stats = await service.getUserStats({
      from: "2026-09-20",
      to: "2026-09-26",
      timeZone: "Asia/Shanghai",
    });

    expect(stats).toEqual({ totalUsers: 1_284, newUsers: 66, prevNewUsers: 66 });

    const [rangeArgs, prevArgs] = countUsersRegistered.mock.calls;
    expect(rangeArgs?.[0].toISOString()).toBe("2026-09-20T00:00:00.000Z");
    expect(rangeArgs?.[1].toISOString()).toBe("2026-09-27T00:00:00.000Z");
    expect(prevArgs?.[0].toISOString()).toBe("2026-09-13T00:00:00.000Z");
    expect(prevArgs?.[1].toISOString()).toBe("2026-09-20T00:00:00.000Z");
  });

  it("单日区间的前一窗口为前一天", async () => {
    const { repository, countUsersRegistered } = fakeRepo();
    const service = new AdminStatsService(repository);
    await service.getUserStats({
      from: "2026-09-26",
      to: "2026-09-26",
      timeZone: "Asia/Shanghai",
    });

    const [rangeArgs, prevArgs] = countUsersRegistered.mock.calls;
    expect(rangeArgs?.[1].getTime() - rangeArgs?.[0].getTime()).toBe(DAY_MS);
    expect(prevArgs?.[0].toISOString()).toBe("2026-09-25T00:00:00.000Z");
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
