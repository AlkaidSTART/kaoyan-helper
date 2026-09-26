import { Prisma, PrismaClient } from "@/generated/prisma/client";

import { AppError, ERROR_CODES } from "../../api/errors";
import { PrismaClientConfigurationError, getPrismaClient } from "../../db/prisma";
import type { AiRepository, AiUsageRow } from "./quota";

/**
 * Prisma 实现的 AI 用量仓储。`ai_usage_daily` 唯一约束 (user_id, usage_date)
 * 兜底并发；配额消耗使用条件更新（call_count = 期望值），失败即并发冲突。
 */
export class PrismaAiRepository implements AiRepository {
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

  async findUsage(userId: string, usageDate: Date): Promise<AiUsageRow | null> {
    const row = await this.run(() =>
      this.client.aiUsageDaily.findUnique({
        where: { userId_usageDate: { userId, usageDate } },
      }),
    );

    if (!row) {
      return null;
    }

    return {
      callCount: row.callCount,
      promptTokens: row.promptTokens,
      completionTokens: row.completionTokens,
    };
  }

  async consumeQuota(params: {
    userId: string;
    usageDate: Date;
    promptTokens: number;
    completionTokens: number;
    expectedCallCount: number;
  }): Promise<boolean> {
    return this.run(async () => {
      const updated = await this.client.aiUsageDaily.updateMany({
        where: {
          userId: params.userId,
          usageDate: params.usageDate,
          callCount: params.expectedCallCount,
        },
        data: {
          callCount: { increment: 1 },
          promptTokens: { increment: params.promptTokens },
          completionTokens: { increment: params.completionTokens },
        },
      });

      if (updated.count > 0) {
        return true;
      }

      const existing = await this.client.aiUsageDaily.findUnique({
        where: {
          userId_usageDate: { userId: params.userId, usageDate: params.usageDate },
        },
      });

      if (existing) {
        return false;
      }

      // 当日无行：创建并写入首次调用。
      await this.client.aiUsageDaily.create({
        data: {
          userId: params.userId,
          usageDate: params.usageDate,
          callCount: 1,
          promptTokens: params.promptTokens,
          completionTokens: params.completionTokens,
        },
      });

      return true;
    });
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
