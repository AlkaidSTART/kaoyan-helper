import { formatUtcTimestamp } from "../../api/response";

import { assertAdminActor, type AdminActor } from "./admin-actor";

export interface AdminAuditListFilters {
  action: string | null;
  resourceType: string | null;
  actorId: string | null;
}

export interface AdminAuditActorSummary {
  id: string;
  email: string;
  nickname: string | null;
}

export interface AdminAuditLogRecord {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  requestId: string | null;
  /** 写入侧已脱敏的变更摘要（admin-backend-api ADR-2），查询侧原样透出。 */
  metadata: unknown;
  createdAt: Date;
  actor: AdminAuditActorSummary;
}

export interface AdminAuditLogDto {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  requestId: string | null;
  metadata: unknown;
  createdAt: string;
  actor: AdminAuditActorSummary;
}

export interface AdminAuditRepository {
  listAuditLogs(
    filters: AdminAuditListFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: AdminAuditLogRecord[]; total: number }>;
}

/**
 * 审计日志查询（契约 ADMIN-AUDIT-01）。
 * 只读接口：固定 createdAt 倒序分页；metadata 不做二次加工；
 * 无时间范围筛选（最小改动，回溯以最近操作为主场景）。
 */
export class AdminAuditService {
  private readonly repository: AdminAuditRepository;

  constructor(repository: AdminAuditRepository) {
    this.repository = repository;
  }

  async list(
    actor: AdminActor,
    filters: AdminAuditListFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: AdminAuditLogDto[]; total: number }> {
    assertAdminActor(actor);

    const { rows, total } = await this.repository.listAuditLogs(filters, page, pageSize);

    return { rows: rows.map(toAdminAuditLogDto), total };
  }
}

export function toAdminAuditLogDto(row: AdminAuditLogRecord): AdminAuditLogDto {
  return {
    id: row.id,
    action: row.action,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    requestId: row.requestId,
    metadata: row.metadata,
    createdAt: formatUtcTimestamp(row.createdAt),
    actor: row.actor,
  };
}
