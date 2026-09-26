import { AppError, ERROR_CODES } from "../../api/errors";
import { isValidTimeZone } from "../../domain/time";

import { parseUtcDay } from "./admin-dashboard-service";

export interface AdminUserStatsFilters {
  from: string;
  to: string;
  timeZone: string;
}

export interface AdminUserStatsDto {
  /** 累计注册用户数（含管理员）。 */
  totalUsers: number;
  /** `[from, to]` 区间内注册数（`User.createdAt`，UTC 日界）。 */
  newUsers: number;
  /** 紧邻等长前一窗口注册数，供前端直接计算环比。 */
  prevNewUsers: number;
}

export interface AdminUserStatsRepository {
  countTotalUsers(): Promise<number>;

  countUsersRegistered(from: Date, toExclusive: Date): Promise<number>;
}

const MAX_RANGE_DAYS = 90;
const DAY_MS = 86_400_000;

/**
 * 注册人数统计（契约 ADMIN-STAT-01）。
 * 口径与看板同构：`from`/`to` 为含端日 `YYYY-MM-DD`、UTC 日界切分、`timezone` 仅合法性校验、
 * 区间 ≤ 90 天；`prevNewUsers` 为紧邻等长前一窗口 `[from - N, from)`。
 */
export class AdminStatsService {
  private readonly repository: AdminUserStatsRepository;

  constructor(repository: AdminUserStatsRepository) {
    this.repository = repository;
  }

  async getUserStats(filters: AdminUserStatsFilters): Promise<AdminUserStatsDto> {
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
    const prevFrom = new Date(fromDay.getTime() - rangeDays * DAY_MS);

    const [totalUsers, newUsers, prevNewUsers] = await Promise.all([
      this.repository.countTotalUsers(),
      this.repository.countUsersRegistered(fromDay, toExclusive),
      this.repository.countUsersRegistered(prevFrom, fromDay),
    ]);

    return { totalUsers, newUsers, prevNewUsers };
  }
}
