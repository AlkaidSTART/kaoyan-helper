import { describe, expect, it } from "vitest";

import { AdminUserService } from "../admin-user-service";
import type {
  AdminUserRecord,
  AdminUserRepository,
  AdminUserStats,
} from "../admin-user-service";

const now = new Date("2026-09-26T00:00:00Z");

const actor = {
  user: { id: "admin-1", email: "a@t.dev", nickname: "管理员", role: "admin", isBanned: false },
};

const nonAdminActor = {
  user: { id: "u-9", email: "u@t.dev", nickname: "考生", role: "user", isBanned: false },
};

const STATS: AdminUserStats = {
  questionAttempts: 1,
  mistakeRecords: 2,
  cardProgresses: 3,
  checkIns: 4,
  aiCalls: 5,
};

function userRow(overrides: Partial<AdminUserRecord> = {}): AdminUserRecord {
  return {
    id: "u-1",
    email: "u@t.dev",
    nickname: "考生",
    avatarUrl: null,
    examYear: 2027,
    role: "user",
    isBanned: false,
    bannedUntil: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function fakeRepo(rows: AdminUserRecord[]): AdminUserRepository {
  const store = [...rows];

  return {
    async listUsers() {
      return { rows: store, total: store.length };
    },
    async findUserById(id) {
      return store.find((row) => row.id === id) ?? null;
    },
    async getUserStats() {
      return STATS;
    },
  };
}

describe("AdminUserService 只读查询", () => {
  it("列表透传仓储并映射 DTO（封禁状态与时间戳）", async () => {
    const service = new AdminUserService(fakeRepo([userRow({ isBanned: true })]));
    const { rows, total } = await service.list(actor, {
      keyword: null,
      role: null,
      isBanned: null,
    });

    expect(total).toBe(1);
    expect(rows[0].isBanned).toBe(true);
    expect(rows[0].createdAt).toBe("2026-09-26T00:00:00Z");
  });

  it("详情附带学习统计", async () => {
    const service = new AdminUserService(fakeRepo([userRow()]));
    const detail = await service.getDetail(actor, "u-1");

    expect(detail.stats).toEqual(STATS);
  });

  it("目标不存在返回 404", async () => {
    const service = new AdminUserService(fakeRepo([]));

    await expect(service.getDetail(actor, "u-x")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("非管理员触发 ADMIN_REQUIRED", async () => {
    const service = new AdminUserService(fakeRepo([userRow()]));

    await expect(
      service.list(nonAdminActor, { keyword: null, role: null, isBanned: null }),
    ).rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
  });
});
