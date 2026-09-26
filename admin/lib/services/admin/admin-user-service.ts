import { AppError, ERROR_CODES } from "../../api/errors";
import { formatUtcTimestamp } from "../../api/response";

import { assertAdminActor, type AdminActor } from "./admin-actor";

export interface AdminUserListFilters {
  keyword: string | null;
  role: string | null;
  isBanned: boolean | null;
}

export interface AdminUserRecord {
  id: string;
  email: string;
  nickname: string | null;
  avatarUrl: string | null;
  examYear: number | null;
  role: string;
  isBanned: boolean;
  bannedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminUserStats {
  questionAttempts: number;
  mistakeRecords: number;
  cardProgresses: number;
  checkIns: number;
  aiCalls: number;
}

export interface AdminUserSummaryDto {
  id: string;
  email: string;
  nickname: string | null;
  avatarUrl: string | null;
  role: string;
  isBanned: boolean;
  bannedUntil: string | null;
  examYear: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserDetailDto extends AdminUserSummaryDto {
  stats: AdminUserStats;
}

export interface AdminUserRepository {
  listUsers(
    filters: AdminUserListFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: AdminUserRecord[]; total: number }>;

  findUserById(userId: string): Promise<AdminUserRecord | null>;

  getUserStats(userId: string): Promise<AdminUserStats>;
}

/**
 * 管理端用户服务（契约 ADMIN-USER-01 ~ 02，只读）。
 * 管理端定位为观察台（p0 admin-readonly-activity），不提供封禁等变更能力。
 */
export class AdminUserService {
  private readonly repository: AdminUserRepository;

  constructor(repository: AdminUserRepository) {
    this.repository = repository;
  }

  async list(
    actor: AdminActor,
    filters: AdminUserListFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: AdminUserSummaryDto[]; total: number }> {
    assertAdminActor(actor);

    const { rows, total } = await this.repository.listUsers(filters, page, pageSize);

    return { rows: rows.map(toAdminUserDto), total };
  }

  async getDetail(actor: AdminActor, userId: string): Promise<AdminUserDetailDto> {
    assertAdminActor(actor);

    const user = await this.repository.findUserById(userId);

    if (!user) {
      throw new AppError(ERROR_CODES.NOT_FOUND);
    }

    const stats = await this.repository.getUserStats(userId);

    return { ...toAdminUserDto(user), stats };
  }
}

export function toAdminUserDto(row: AdminUserRecord): AdminUserSummaryDto {
  return {
    id: row.id,
    email: row.email,
    nickname: row.nickname,
    avatarUrl: row.avatarUrl,
    role: row.role,
    isBanned: row.isBanned,
    bannedUntil: row.bannedUntil === null ? null : formatUtcTimestamp(row.bannedUntil),
    examYear: row.examYear,
    createdAt: formatUtcTimestamp(row.createdAt),
    updatedAt: formatUtcTimestamp(row.updatedAt),
  };
}
