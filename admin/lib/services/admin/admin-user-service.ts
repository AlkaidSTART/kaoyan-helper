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

export interface BanUserInput {
  reason: string;
  expiresAt: Date | null;
  requestId: string | null;
}

export interface UnbanUserInput {
  reason: string;
  requestId: string | null;
}

export interface SetUserBannedParams {
  actorId: string;
  userId: string;
  isBanned: boolean;
  bannedUntil: Date | null;
  reason: string;
  requestId: string | null;
  now: Date;
}

export interface AdminUserRepository {
  listUsers(
    filters: AdminUserListFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: AdminUserRecord[]; total: number }>;

  findUserById(userId: string): Promise<AdminUserRecord | null>;

  /** role=admin 且未封禁的有效管理员数量（最后管理员保护用）。 */
  countActiveAdmins(): Promise<number>;

  /** 封禁/解封：用户状态更新与审计日志同事务提交。 */
  setUserBanned(params: SetUserBannedParams): Promise<AdminUserRecord>;

  getUserStats(userId: string): Promise<AdminUserStats>;
}

/**
 * 管理端用户服务（契约 ADMIN-USER-01 ~ 04）。
 * 封禁边界：不可封禁自己（422）；不可封禁最后一名有效管理员（409 LAST_ADMIN_PROTECTED）；
 * 解封幂等。封禁即时生效：getActor 每次读库，不缓存角色。
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

  async ban(
    actor: AdminActor,
    userId: string,
    input: BanUserInput,
  ): Promise<AdminUserDetailDto> {
    assertAdminActor(actor);

    if (userId === actor.user.id) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
        message: "不能封禁自己",
        details: { field: "userId" },
      });
    }

    const target = await this.repository.findUserById(userId);

    if (!target) {
      throw new AppError(ERROR_CODES.NOT_FOUND);
    }

    if (target.role === "admin" && !target.isBanned) {
      const activeAdmins = await this.repository.countActiveAdmins();

      if (activeAdmins <= 1) {
        throw new AppError(ERROR_CODES.LAST_ADMIN_PROTECTED);
      }
    }

    const row = await this.repository.setUserBanned({
      actorId: actor.user.id,
      userId,
      isBanned: true,
      bannedUntil: input.expiresAt,
      reason: input.reason,
      requestId: input.requestId,
      now: new Date(),
    });

    return this.toDetail(row);
  }

  /** 幂等：已解封用户重复调用仍返回当前状态并记录审计。 */
  async unban(
    actor: AdminActor,
    userId: string,
    input: UnbanUserInput,
  ): Promise<AdminUserDetailDto> {
    assertAdminActor(actor);

    const target = await this.repository.findUserById(userId);

    if (!target) {
      throw new AppError(ERROR_CODES.NOT_FOUND);
    }

    const row = await this.repository.setUserBanned({
      actorId: actor.user.id,
      userId,
      isBanned: false,
      bannedUntil: null,
      reason: input.reason,
      requestId: input.requestId,
      now: new Date(),
    });

    return this.toDetail(row);
  }

  private async toDetail(row: AdminUserRecord): Promise<AdminUserDetailDto> {
    const stats = await this.repository.getUserStats(row.id);

    return { ...toAdminUserDto(row), stats };
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
