import type { PrismaClient } from "@/generated/prisma/client";

import { getPrismaClient } from "../../db/prisma";
import type { AdminUserStatsRepository } from "./admin-stats-service";

/** 注册统计仓储（契约 ADMIN-STAT-01）：只读聚合，按 `User.createdAt` 统计。 */
export class PrismaAdminStatsRepository implements AdminUserStatsRepository {
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

  async countTotalUsers(): Promise<number> {
    return this.client.user.count();
  }

  async countUsersRegistered(from: Date, toExclusive: Date): Promise<number> {
    return this.client.user.count({
      where: { createdAt: { gte: from, lt: toExclusive } },
    });
  }
}
