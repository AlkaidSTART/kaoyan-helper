import type { PrismaClient } from "@/generated/prisma/client";

import { getPrismaClient } from "../../db/prisma";
import type {
  AdminActivityListFilters,
  AdminActivityRecord,
  AdminActivityRepository,
} from "./admin-activity-service";

/**
 * 用户活动查询仓储（契约 ADMIN-ACT-01）。
 * 只读：userId/type 精确筛选，固定 createdAt 倒序分页。
 */
export class PrismaAdminActivityRepository implements AdminActivityRepository {
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

  async listActivities(
    filters: AdminActivityListFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: AdminActivityRecord[]; total: number }> {
    const where = {
      ...(filters.userId !== null ? { userId: filters.userId } : {}),
      ...(filters.type !== null ? { type: filters.type } : {}),
    };

    const [rows, total] = await Promise.all([
      this.client.userActivity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          type: true,
          summary: true,
          createdAt: true,
          user: { select: { id: true, email: true, nickname: true } },
        },
      }),
      this.client.userActivity.count({ where }),
    ]);

    return { rows, total };
  }
}
