import { Prisma, PrismaClient } from "@/generated/prisma/client";

import { AppError, ERROR_CODES } from "../../api/errors";
import { PrismaClientConfigurationError, getPrismaClient } from "../../db/prisma";
import type { DashboardRepository } from "./dashboard-service";

/** 打卡连击只需回看 60 天；数据库侧按日期倒序取一小段即可。 */
const RECENT_CHECK_IN_DAYS = 60;

/**
 * Prisma 实现的 Dashboard 聚合仓储：全部 count 聚合在数据库执行，
 * 不向服务层下发明细（契约 §5：“服务端聚合，不让客户端计算”）。
 */
export class PrismaDashboardRepository implements DashboardRepository {
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

  async countTodayAttempts(userId: string, dayStartUtc: Date): Promise<number> {
    return this.run(() =>
      this.client.questionAttempt.count({
        where: { userId, createdAt: { gte: dayStartUtc } },
      }),
    );
  }

  async countActiveMistakes(userId: string): Promise<number> {
    return this.run(() =>
      this.client.mistakeRecord.count({ where: { userId, status: "active" } }),
    );
  }

  async countDueCards(userId: string, now: Date): Promise<number> {
    return this.run(() =>
      this.client.cardProgress.count({
        where: { userId, dueAt: { lte: now } },
      }),
    );
  }

  async countReviewedCards(userId: string): Promise<number> {
    return this.run(() =>
      this.client.cardProgress.count({
        where: { userId, lastRating: { not: null } },
      }),
    );
  }

  async listRecentCheckInDates(userId: string, now: Date): Promise<Date[]> {
    const rows = await this.run(() =>
      this.client.checkInRecord.findMany({
        where: {
          userId,
          checkInDate: {
            lte: new Date(now.getTime() + RECENT_CHECK_IN_DAYS * 86_400_000),
          },
        },
        orderBy: { checkInDate: "desc" },
        take: RECENT_CHECK_IN_DAYS,
      }),
    );

    return rows.map((row) => row.checkInDate);
  }

  async findPrimaryTarget(userId: string): Promise<{
    schoolId: string;
    schoolName: string;
    majorCode: string | null;
    majorName: string | null;
  } | null> {
    const row = await this.run(() =>
      this.client.userTarget.findFirst({
        where: { userId, type: "primary" },
        include: { school: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      }),
    );

    if (!row) {
      return null;
    }

    return {
      schoolId: row.schoolId,
      schoolName: row.school.name,
      majorCode: row.majorCode,
      majorName: row.majorName,
    };
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw mapPrismaError(error);
    }
  }
}

function mapPrismaError(error: unknown): AppError {
  if (
    error instanceof PrismaClientConfigurationError ||
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    return new AppError(ERROR_CODES.DEPENDENCY_UNAVAILABLE, { cause: error });
  }

  return new AppError(ERROR_CODES.INTERNAL_ERROR, { cause: error });
}
