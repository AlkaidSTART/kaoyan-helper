import { describe, expect, it } from "vitest";

import { AppError } from "../../../api/errors";
import { AdminUserService } from "../admin-user-service";
import type {
  AdminUserRecord,
  AdminUserRepository,
  BanUserInput,
} from "../admin-user-service";

const now = new Date("2026-09-26T00:00:00Z");

const actor = {
  user: { id: "admin-1", email: "a@t.dev", nickname: "管理员", role: "admin", isBanned: false },
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

function fakeRepo(rows: AdminUserRecord[]): AdminUserRepository & { bans: unknown[] } {
  const bans: unknown[] = [];
  const store = [...rows];

  return {
    bans,
    async listUsers() {
      return { rows: store, total: store.length };
    },
    async findUserById(id) {
      return store.find((row) => row.id === id) ?? null;
    },
    async countActiveAdmins() {
      return store.filter((row) => row.role === "admin" && !row.isBanned).length;
    },
    async setUserBanned(params) {
      bans.push(params);
      const row = store.find((item) => item.id === params.userId);

      if (!row) {
        throw new AppError("NOT_FOUND");
      }

      return { ...row, isBanned: params.isBanned, bannedUntil: params.bannedUntil };
    },
    async getUserStats() {
      return {
        questionAttempts: 1,
        mistakeRecords: 2,
        cardProgresses: 3,
        checkIns: 4,
        aiCalls: 5,
      };
    },
  };
}

describe("AdminUserService 封禁边界", () => {
  it("不能封禁自己（422）", async () => {
    const repo = fakeRepo([userRow({ id: "admin-1", role: "admin" })]);
    const service = new AdminUserService(repo);

    await expect(
      service.ban(actor, "admin-1", { reason: "r", expiresAt: null, requestId: null }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("最后一名有效管理员受保护（409）", async () => {
    const repo = fakeRepo([userRow({ id: "admin-2", role: "admin" })]);
    const service = new AdminUserService(repo);

    await expect(
      service.ban(actor, "admin-2", { reason: "r", expiresAt: null, requestId: null }),
    ).rejects.toMatchObject({ code: "LAST_ADMIN_PROTECTED" });
  });

  it("封禁成功并写审计", async () => {
    const repo = fakeRepo([userRow({ id: "u-1" }), userRow({ id: "admin-2", role: "admin" })]);
    const service = new AdminUserService(repo);
    const input: BanUserInput = { reason: "违规", expiresAt: null, requestId: "req-1" };
    const detail = await service.ban(actor, "u-1", input);

    expect(detail.isBanned).toBe(true);
    expect(detail.stats.aiCalls).toBe(5);
    expect(repo.bans[0]).toMatchObject({ userId: "u-1", isBanned: true, reason: "违规" });
  });

  it("目标不存在返回 404", async () => {
    const service = new AdminUserService(fakeRepo([]));

    await expect(
      service.ban(actor, "u-x", { reason: "r", expiresAt: null, requestId: null }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("解封幂等", async () => {
    const repo = fakeRepo([userRow({ id: "u-1", isBanned: true })]);
    const service = new AdminUserService(repo);
    const first = await service.unban(actor, "u-1", { reason: "复核", requestId: null });
    const second = await service.unban(actor, "u-1", { reason: "复核", requestId: null });

    expect(first.isBanned).toBe(false);
    expect(second.isBanned).toBe(false);
    expect(repo.bans).toHaveLength(2);
  });
});
