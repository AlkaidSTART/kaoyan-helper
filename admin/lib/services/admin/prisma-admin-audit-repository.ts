import type { PrismaClient } from "@/generated/prisma/client";

import { getPrismaClient } from "../../db/prisma";
import type {
  AdminAuditListFilters,
  AdminAuditLogRecord,
  AdminAuditRepository,
} from "./admin-audit-service";

/**
 * 审计日志查询仓储（契约 ADMIN-AUDIT-01）。
 * 只读：action/resourceType/actorId 精确筛选，固定 createdAt 倒序分页。
 */
export class PrismaAdminAuditRepository implements AdminAuditRepository {
  private readonly injectedClient?: PrismaClient;

  private resolvedClient?: PrismaClient;

  constructor(client?: PrismaClient) {
    this.injectedClient = client;
  }

  private get client(): PrismaClient {
    if (!this.resolvedClient) {
      this.resolvedClient = this.injectedClient ?? getPrismaClient();
    }

    return this.resolvedClient;
  }

  async listAuditLogs(
    filters: AdminAuditListFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: AdminAuditLogRecord[]; total: number }> {
    const where = {
      ...(filters.action !== null ? { action: filters.action } : {}),
      ...(filters.resourceType !== null ? { resourceType: filters.resourceType } : {}),
      ...(filters.actorId !== null ? { actorId: filters.actorId } : {}),
    };

    const [rows, total] = await Promise.all([
      this.client.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          action: true,
          resourceType: true,
          resourceId: true,
          requestId: true,
          metadata: true,
          createdAt: true,
          actor: { select: { id: true, email: true, nickname: true } },
        },
      }),
      this.client.adminAuditLog.count({ where }),
    ]);

    return { rows, total };
  }
}
