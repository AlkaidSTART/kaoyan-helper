import { AppError, ERROR_CODES } from "../../api/errors";
import { isValidTimeZone } from "../../domain/time";
import { formatUtcTimestamp } from "../../api/response";

export interface AdminDashboardFilters {
  from: string;
  to: string;
  timeZone: string;
}

export interface TopMistakeItem {
  questionId: string;
  stem: string;
  errorCount: number;
}

export interface AdminDashboardDto {
  /** 区间内去重答题用户数。 */
  dau: number;
  /** 截至 `to` 的近 7 天去重答题用户数。 */
  wau: number;
  questionAnswers: number;
  aiCalls: number;
  aiCostEstimate: number;
  topMistakes: TopMistakeItem[];
}

export interface AdminDashboardRepository {
  countDistinctAttemptUsers(from: Date, toExclusive: Date): Promise<number>;

  countQuestionAnswers(from: Date, toExclusive: Date): Promise<number>;

  sumAiUsage(fromDay: Date, toDayExclusive: Date): Promise<{
    calls: number;
    costEstimate: number;
  }>;

  listTopMistakes(
    from: Date,
    toExclusive: Date,
    limit: number,
  ): Promise<TopMistakeItem[]>;
}

const MAX_RANGE_DAYS = 90;
const WEEK_DAYS = 7;
const TOP_MISTAKES_LIMIT = 10;
const DAY_MS = 86_400_000;

/**
 * 管理看板聚合（契约 ADMIN-DASH-01）。
 * 统计窗口按 UTC 日界切分（`from`/`to` 均为含端日的 `YYYY-MM-DD`）；
 * `timezone` 仅做合法性校验，供展示层使用，不参与聚合口径。
 * 只输出聚合数据与题目摘要，不含任何用户隐私明文。
 */
export class AdminDashboardService {
  private readonly repository: AdminDashboardRepository;

  constructor(repository: AdminDashboardRepository) {
    this.repository = repository;
  }

  async getSummary(filters: AdminDashboardFilters): Promise<AdminDashboardDto> {
    if (!isValidTimeZone(filters.timeZone)) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
        details: { field: "timezone" },
      });
    }

    const fromDay = parseUtcDay(filters.from, "from");
    const toDay = parseUtcDay(filters.to, "to");

    if (toDay.getTime() < fromDay.getTime()) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
        details: { field: "to" },
      });
    }

    const rangeDays = Math.round((toDay.getTime() - fromDay.getTime()) / DAY_MS) + 1;

    if (rangeDays > MAX_RANGE_DAYS) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
        details: { field: "to", message: "统计区间最长 90 天" },
      });
    }

    const toExclusive = new Date(toDay.getTime() + DAY_MS);
    const wauFrom = new Date(toExclusive.getTime() - WEEK_DAYS * DAY_MS);

    const [dau, questionAnswers, aiUsage, topMistakes, wau] = await Promise.all([
      this.repository.countDistinctAttemptUsers(fromDay, toExclusive),
      this.repository.countQuestionAnswers(fromDay, toExclusive),
      this.repository.sumAiUsage(fromDay, toExclusive),
      this.repository.listTopMistakes(fromDay, toExclusive, TOP_MISTAKES_LIMIT),
      this.repository.countDistinctAttemptUsers(wauFrom, toExclusive),
    ]);

    return {
      dau,
      wau,
      questionAnswers,
      aiCalls: aiUsage.calls,
      aiCostEstimate: aiUsage.costEstimate,
      topMistakes,
    };
  }
}

/** `YYYY-MM-DD` → UTC 零点；非法日期 422（路由层 readDateParam 已挡一层，此处兜底）。 */
export function parseUtcDay(value: string, field: "from" | "to"): Date {
  const date = new Date(`${value}T00:00:00Z`);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(date.getTime()) ||
    formatUtcTimestamp(date).slice(0, 10) !== value
  ) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      details: { field },
    });
  }

  return date;
}
