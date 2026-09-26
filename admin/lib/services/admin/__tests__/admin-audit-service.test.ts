import { describe, expect, it, vi } from "vitest";

import { AdminAuditService } from "../admin-audit-service";
import type {
  AdminAuditListFilters,
  AdminAuditLogRecord,
  AdminAuditRepository,
} from "../admin-audit-service";

const adminActor = {
  user: { id: "admin-1", email: "a@t.dev", nickname: "管理员", role: "admin", isBanned: false },
};

const now = new Date("2026-09-26T00:00:00Z");

function auditRow(overrides: Partial<AdminAuditLogRecord> = {}): AdminAuditLogRecord {
  return {
    id: "log-1",
    action: "user.ban",
    resourceType: "user",
    resourceId: "u-1",
    requestId: "req-1",
    metadata: { reason: "违规发布" },
    createdAt: now,
    actor: { id: "admin-1", email: "a@t.dev", nickname: "管理员" },
    ...overrides,
  };
}

function fakeRepo(rows: AdminAuditLogRecord[], total = rows.length) {
  const listAuditLogs = vi.fn(
    async (_filters: AdminAuditListFilters, _page: number, _pageSize: number) => ({
      rows,
      total,
    }),
  );

  return { repository: { listAuditLogs } as AdminAuditRepository, listAuditLogs };
}

describe("AdminAuditService（ADMIN-AUDIT-01）", () => {
  it("筛选透传并映射 DTO（actor 摘要 + UTC 时间、metadata 原样）", async () => {
    const { repository, listAuditLogs } = fakeRepo([auditRow({ id: "log-2" })]);
    const service = new AdminAuditService(repository);
    const { rows, total } = await service.list(
      adminActor,
      { action: "user.ban", resourceType: "user", actorId: "11111111-1111-4111-8111-111111111111" },
      2,
      20,
    );

    expect(total).toBe(1);
    expect(listAuditLogs).toHaveBeenCalledWith(
      { action: "user.ban", resourceType: "user", actorId: "11111111-1111-4111-8111-111111111111" },
      2,
      20,
    );
    expect(rows[0]).toMatchObject({
      id: "log-2",
      action: "user.ban",
      createdAt: "2026-09-26T00:00:00.000Z",
      actor: { id: "admin-1", email: "a@t.dev" },
    });
    expect(rows[0].metadata).toEqual({ reason: "违规发布" });
  });

  it("非管理员触发 ADMIN_REQUIRED", async () => {
    const { repository } = fakeRepo([]);
    const service = new AdminAuditService(repository);
    const userActor = {
      user: { id: "u-9", email: "u@t.dev", nickname: "考生", role: "user", isBanned: false },
    };

    await expect(
      service.list(userActor, { action: null, resourceType: null, actorId: null }, 1, 20),
    ).rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
  });

  it("被封禁管理员触发 ADMIN_REQUIRED", async () => {
    const { repository } = fakeRepo([]);
    const service = new AdminAuditService(repository);
    const bannedActor = {
      user: { ...adminActor.user, isBanned: true },
    };

    await expect(
      service.list(bannedActor, { action: null, resourceType: null, actorId: null }, 1, 20),
    ).rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
  });
});
