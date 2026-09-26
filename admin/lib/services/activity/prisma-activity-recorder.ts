import { getPrismaClient } from "../../db/prisma";

import type { ActivityRecorder, RecordActivityInput } from "./activity-recorder";

/**
 * Prisma 实现的用户活动采集（p1 admin-readonly-activity ADR-3）。
 * best-effort：任何采集失败只记录日志，绝不向调用方抛错，
 * 保证答题 / 复习 / 登录主流程不受埋点故障影响。
 */
export class PrismaActivityRecorder implements ActivityRecorder {
  private readonly onError: (error: unknown) => void;

  constructor(onError: (error: unknown) => void = defaultOnError) {
    this.onError = onError;
  }

  async record(input: RecordActivityInput): Promise<void> {
    try {
      const client = getPrismaClient();

      await client.userActivity.create({
        data: {
          userId: input.userId,
          type: input.type,
          summary: (input.summary ?? {}) as Record<string, unknown>,
        },
      });
    } catch (error) {
      this.onError(error);
    }
  }
}

function defaultOnError(error: unknown): void {
  console.error("[activity-recorder] 采集用户活动失败", error);
}
