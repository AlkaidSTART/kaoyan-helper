import { AppError, ERROR_CODES } from "../../api/errors";
import { formatUtcTimestamp } from "../../api/response";
import {
  calendarDayDifference,
  calendarDayInTimeZone,
  examStartOfDay,
  formatCalendarDay,
  isValidTimeZone,
} from "../../domain/time";

export interface DashboardSummaryDto {
  daysUntilExam: number | null;
  todayQuestionCount: number;
  activeMistakeCount: number;
  dueCardCount: number;
  streakDays: number;
  totalReviewedCards: number;
  primaryTarget: {
    schoolId: string;
    schoolName: string;
    majorCode: string | null;
    majorName: string | null;
  } | null;
}

export interface DashboardRepository {
  countTodayAttempts(userId: string, dayStartUtc: Date): Promise<number>;

  countActiveMistakes(userId: string): Promise<number>;

  countDueCards(userId: string, now: Date): Promise<number>;

  countReviewedCards(userId: string): Promise<number>;

  listRecentCheckInDates(userId: string, now: Date, timeZone: string): Promise<Date[]>;

  findPrimaryTarget(userId: string): Promise<{
    schoolId: string;
    schoolName: string;
    majorCode: string | null;
    majorName: string | null;
  } | null>;
}

export interface DashboardActor {
  id: string;
  email: string;
  nickname: string | null;
  examYear: number | null;
}

export class DashboardService {
  private readonly repository: DashboardRepository;

  constructor(repository: DashboardRepository) {
    this.repository = repository;
  }

  /**
   * 服务端聚合（契约 DASH-01）：只读本人数据，不下发明细。
   * 时区默认 Asia/Shanghai，非法时区返回 422 `VALIDATION_FAILED`。
   */
  async getSummary(actor: DashboardActor, timeZone: string): Promise<DashboardSummaryDto> {
    if (!isValidTimeZone(timeZone)) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
        details: { field: "timezone" },
      });
    }

    const now = new Date();
    const today = calendarDayInTimeZone(now, timeZone);
    const todayStart = new Date(Date.UTC(today.year, today.month - 1, today.day));

    const [todayQuestionCount, activeMistakeCount, dueCardCount, totalReviewedCards] =
      await Promise.all([
        this.repository.countTodayAttempts(actor.id, todayStart),
        this.repository.countActiveMistakes(actor.id),
        this.repository.countDueCards(actor.id, now),
        this.repository.countReviewedCards(actor.id),
      ]);

    const checkInDates = await this.repository.listRecentCheckInDates(actor.id, now, timeZone);
    const primaryTarget = await this.repository.findPrimaryTarget(actor.id);

    return {
      daysUntilExam: computeDaysUntilExam(actor.examYear, now, timeZone),
      todayQuestionCount,
      activeMistakeCount,
      dueCardCount,
      streakDays: computeStreakFromDates(
        checkInDates.map((date) => formatCalendarDay(calendarDayInTimeZone(date, timeZone))),
      ),
      totalReviewedCards,
      primaryTarget,
    };
  }
}

/** 倒计时口径：`examYear - 1` 年 12 月 21 日（当地日历日）；未设置或已过期返回 null。 */
export function computeDaysUntilExam(
  examYear: number | null,
  now: Date,
  timeZone: string,
): number | null {
  if (examYear === null) {
    return null;
  }

  const examStart = examStartOfDay(examYear, timeZone);

  if (examStart.getTime() <= now.getTime()) {
    return null;
  }

  return calendarDayDifference(now, examStart, timeZone);
}

/** 连续打卡：从今天（或昨天）往回连续计数。 */
export function computeStreakFromDates(dates: string[]): number {
  const unique = [...new Set(dates)].sort().reverse();

  if (unique.length === 0) {
    return 0;
  }

  const dayMs = 86_400_000;
  const toDayNumber = (value: string): number =>
    Math.floor(Date.parse(`${value}T00:00:00Z`) / dayMs);

  const today = toDayNumber(
    formatCalendarDay(calendarDayInTimeZone(new Date(), "Asia/Shanghai")),
  );
  let cursor = today;
  const first = toDayNumber(unique[0]);

  if (first !== cursor) {
    if (first !== cursor - 1) {
      return 0;
    }

    cursor -= 1;
  }

  let streak = 0;

  for (const value of unique) {
    const day = toDayNumber(value);

    if (day !== cursor) {
      break;
    }

    streak += 1;
    cursor -= 1;
  }

  return streak;
}

export function formatNow(now: Date): string {
  return formatUtcTimestamp(now);
}
