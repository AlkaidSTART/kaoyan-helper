import { AppError, ERROR_CODES } from "../../api/errors";
import { formatUtcTimestamp } from "../../api/response";
import type { QuestionOption } from "../../domain/judging";
import { toOptions } from "../quiz/quiz-service";

export type { QuestionOption } from "../../domain/judging";

import { assertAdminActor, type AdminActor } from "./admin-actor";

export interface AdminQuestionListFilters {
  subject: string | null;
  source: string | null;
  reviewStatus: string | null;
  isApproved: boolean | null;
  includeDeleted: boolean;
  search: string | null;
}

export interface AdminQuestionCreator {
  id: string;
  nickname: string | null;
  email: string;
}

export interface AdminQuestionRecord {
  id: string;
  subject: string;
  chapter: string | null;
  year: number | null;
  type: string;
  stem: string;
  options: unknown;
  answer: string;
  explanation: string | null;
  difficulty: string | null;
  source: string;
  visibility: string;
  reviewStatus: string;
  isApproved: boolean;
  reviewedById: string | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  creatorId: string | null;
  isDeleted: boolean;
  deletedReason: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  creator: AdminQuestionCreator | null;
}

export interface AdminQuestionDto {
  id: string;
  subject: string;
  chapter: string | null;
  year: number | null;
  type: string;
  stem: string;
  options: QuestionOption[];
  answer: string;
  explanation: string | null;
  difficulty: string | null;
  source: string;
  isPublic: boolean;
  reviewStatus: string;
  isApproved: boolean;
  reviewedAt: string | null;
  reviewNote: string | null;
  isDeleted: boolean;
  deletedReason: string | null;
  creator: AdminQuestionCreator | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminQuestionRepository {
  listQuestions(
    filters: AdminQuestionListFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: AdminQuestionRecord[]; total: number }>;

  findQuestionById(questionId: string): Promise<AdminQuestionRecord | null>;
}

const UGC_SOURCE = "ugc";

/**
 * 管理端题库与 UGC 只读查询服务（契约 ADMIN-Q-01 ~ 02、ADMIN-UGC-01）。
 * 管理端可读答案与解析；管理端定位为观察台（p0 admin-readonly-activity），
 * 不提供创建/编辑/软删/审核等变更能力。
 */
export class AdminQuestionService {
  private readonly repository: AdminQuestionRepository;

  constructor(repository: AdminQuestionRepository) {
    this.repository = repository;
  }

  async list(
    actor: AdminActor,
    filters: AdminQuestionListFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: AdminQuestionDto[]; total: number }> {
    assertAdminActor(actor);

    const { rows, total } = await this.repository.listQuestions(filters, page, pageSize);

    return { rows: rows.map(toAdminQuestionDto), total };
  }

  /** 管理端详情含已删除题目（审计需要）；不存在返回 404。 */
  async getDetail(actor: AdminActor, questionId: string): Promise<AdminQuestionDto> {
    assertAdminActor(actor);

    const row = await this.repository.findQuestionById(questionId);

    if (!row) {
      throw new AppError(ERROR_CODES.NOT_FOUND);
    }

    return toAdminQuestionDto(row);
  }

  async listUgc(
    actor: AdminActor,
    filters: { reviewStatus: string | null; source: string | null },
    page: number,
    pageSize: number,
  ): Promise<{ rows: AdminQuestionDto[]; total: number }> {
    assertAdminActor(actor);

    const { rows, total } = await this.repository.listQuestions(
      {
        subject: null,
        source: filters.source ?? UGC_SOURCE,
        reviewStatus: filters.reviewStatus ?? "pending",
        isApproved: null,
        includeDeleted: false,
        search: null,
      },
      page,
      pageSize,
    );

    return { rows: rows.map(toAdminQuestionDto), total };
  }
}

export function toAdminQuestionDto(row: AdminQuestionRecord): AdminQuestionDto {
  return {
    id: row.id,
    subject: row.subject,
    chapter: row.chapter,
    year: row.year,
    type: row.type,
    stem: row.stem,
    options: toOptions(row.options),
    answer: row.answer,
    explanation: row.explanation,
    difficulty: row.difficulty,
    source: row.source,
    isPublic: row.visibility === "public",
    reviewStatus: row.reviewStatus,
    isApproved: row.isApproved,
    reviewedAt: row.reviewedAt === null ? null : formatUtcTimestamp(row.reviewedAt),
    reviewNote: row.reviewNote,
    isDeleted: row.isDeleted,
    deletedReason: row.deletedReason,
    creator: row.creator,
    version: row.version,
    createdAt: formatUtcTimestamp(row.createdAt),
    updatedAt: formatUtcTimestamp(row.updatedAt),
  };
}
