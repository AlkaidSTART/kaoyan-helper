import { formatUtcTimestamp } from "../../api/response";

import { assertAdminActor, type AdminActor } from "./admin-actor";

export interface AdminActivityListFilters {
  userId: string | null;
  type: string | null;
}

export interface AdminActivityUserSummary {
  id: string;
  email: string;
  nickname: string | null;
}

export interface AdminActivityRecord {
  id: string;
  type: string;
  summary: unknown;
  createdAt: Date;
  user: AdminActivityUserSummary;
}

export interface AdminActivityDto {
  id: string;
  type: string;
  summary: unknown;
  occurredAt: string;
  user: AdminActivityUserSummary;
}

export interface AdminActivityRepository {
  listActivities(
    filters: AdminActivityListFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: AdminActivityRecord[]; total: number }>;
}

/**
 * 用户活动查询（契约 ADMIN-ACT-01）。
 * 只读接口：固定 createdAt 倒序分页；summary 原样透出不二次加工；
 * 无时间范围筛选（与审计日志查询同口径，回溯以最近行为主场景）。
 */
export class AdminActivityService {
  private readonly repository: AdminActivityRepository;

  constructor(repository: AdminActivityRepository) {
    this.repository = repository;
  }

  async list(
    actor: AdminActor,
    filters: AdminActivityListFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: AdminActivityDto[]; total: number }> {
    assertAdminActor(actor);

    const { rows, total } = await this.repository.listActivities(filters, page, pageSize);

    return { rows: rows.map(toAdminActivityDto), total };
  }
}

export function toAdminActivityDto(row: AdminActivityRecord): AdminActivityDto {
  return {
    id: row.id,
    type: row.type,
    summary: row.summary,
    occurredAt: formatUtcTimestamp(row.createdAt),
    user: row.user,
  };
}
