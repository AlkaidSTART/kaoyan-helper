import { Prisma, type PrismaClient } from "@/generated/prisma/client";

import { AppError } from "../../api/errors";
import { getPrismaClient } from "../../db/prisma";
import { mapAdminPrismaError } from "./prisma-error-mapper";
import type {
  AdminUserListFilters,
  AdminUserRecord,
  AdminUserRepository,
  AdminUserStats,
} from "./admin-user-service";

/**
 * Prisma 实现的管理端用户仓储（只读）。
 */
export class PrismaAdminUserRepository implements AdminUserRepository {
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

  async listUsers(
    filters: AdminUserListFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: AdminUserRecord[]; total: number }> {
    return this.run(async () => {
      const where: Prisma.UserWhereInput = {
        ...(filters.keyword !== null
          ? {
              OR: [
                { email: { contains: filters.keyword, mode: Prisma.QueryMode.insensitive } },
                { nickname: { contains: filters.keyword, mode: Prisma.QueryMode.insensitive } },
              ],
            }
          : {}),
        ...(filters.role !== null ? { role: filters.role } : {}),
        ...(filters.isBanned !== null ? { isBanned: filters.isBanned } : {}),
      };

      const [rows, total] = await this.client.$transaction([
        this.client.user.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.client.user.count({ where }),
      ]);

      return { rows: rows as AdminUserRecord[], total };
    });
  }

  async findUserById(userId: string): Promise<AdminUserRecord | null> {
    return this.run(async () => {
      const row = await this.client.user.findUnique({ where: { id: userId } });

      return row ? (row as AdminUserRecord) : null;
    });
  }

  async getUserStats(userId: string): Promise<AdminUserStats> {
    return this.run(async () => {
      const [questionAttempts, mistakeRecords, cardProgresses, checkIns, aiUsage] =
        await this.client.$transaction([
          this.client.questionAttempt.count({ where: { userId } }),
          this.client.mistakeRecord.count({ where: { userId } }),
          this.client.cardProgress.count({ where: { userId } }),
          this.client.checkInRecord.count({ where: { userId } }),
          this.client.aiUsageDaily.aggregate({
            where: { userId },
            _sum: { callCount: true },
          }),
        ]);

      return {
        questionAttempts,
        mistakeRecords,
        cardProgresses,
        checkIns,
        aiCalls: aiUsage._sum.callCount ?? 0,
      };
    });
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw mapAdminPrismaError(error);
    }
  }
}
