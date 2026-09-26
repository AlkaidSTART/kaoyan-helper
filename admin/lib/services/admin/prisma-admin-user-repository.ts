import { Prisma, type PrismaClient } from "@/generated/prisma/client";

import { AppError } from "../../api/errors";
import { getPrismaClient } from "../../db/prisma";
import { mapAdminPrismaError } from "./prisma-error-mapper";
import type {
  AdminUserListFilters,
  AdminUserRecord,
  AdminUserRepository,
  AdminUserStats,
  SetUserBannedParams,
} from "./admin-user-service";

/**
 * Prisma 实现的管理端用户仓储。
 * 封禁/解封在事务内同步写入 `admin_audit_logs`（契约 §11.2 高风险写同事务审计）。
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

  async countActiveAdmins(): Promise<number> {
    return this.run(() =>
      this.client.user.count({ where: { role: "admin", isBanned: false } }),
    );
  }

  async setUserBanned(params: SetUserBannedParams): Promise<AdminUserRecord> {
    return this.run(async () => {
      const row = await this.client.$transaction(async (tx) => {
        const updated = await tx.user.update({
          where: { id: params.userId },
          data: {
            isBanned: params.isBanned,
            bannedUntil: params.bannedUntil,
          },
        });

        await tx.adminAuditLog.create({
          data: {
            actorId: params.actorId,
            action: params.isBanned ? "user.ban" : "user.unban",
            resourceType: "user",
            resourceId: params.userId,
            requestId: params.requestId,
            metadata: {
              reason: params.reason,
              bannedUntil:
                params.bannedUntil === null ? null : params.bannedUntil.toISOString(),
            },
          },
        });

        return updated;
      });

      return row as AdminUserRecord;
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
