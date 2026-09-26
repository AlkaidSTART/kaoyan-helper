import { AppError, ERROR_CODES } from "../../api/errors";
import { calendarDayInTimeZone, formatCalendarDay } from "../../domain/time";

export const AI_DAILY_LIMIT = 30;

export interface AiUsageRow {
  callCount: number;
  promptTokens: number;
  completionTokens: number;
}

export interface AiRepository {
  /** 返回当日用量；不存在时按 0 处理，不预建行。 */
  findUsage(userId: string, usageDate: Date): Promise<AiUsageRow | null>;

  /**
   * 配额消耗：usage_date 唯一约束兜底并发，单事务 upsert 累加。
   * `expectedCallCount` 用于条件更新：并发下其他请求已消耗配额时返回 false。
   */
  consumeQuota(params: {
    userId: string;
    usageDate: Date;
    promptTokens: number;
    completionTokens: number;
    expectedCallCount: number;
  }): Promise<boolean>;
}

/** 计算用户当日（目标时区）用量日期与剩余配额；耗尽抛 429 `DAILY_LIMIT_EXCEEDED`。 */
export function assertDailyQuota(usage: AiUsageRow | null): number {
  const callCount = usage?.callCount ?? 0;

  if (callCount >= AI_DAILY_LIMIT) {
    throw new AppError(ERROR_CODES.DAILY_LIMIT_EXCEEDED, {
      details: { dailyLimit: AI_DAILY_LIMIT },
    });
  }

  return AI_DAILY_LIMIT - callCount;
}

export function usageDateFor(now: Date, timeZone: string): Date {
  const day = calendarDayInTimeZone(now, timeZone);

  return new Date(Date.UTC(day.year, day.month - 1, day.day));
}

export function usageDateKey(now: Date, timeZone: string): string {
  return formatCalendarDay(calendarDayInTimeZone(now, timeZone));
}
