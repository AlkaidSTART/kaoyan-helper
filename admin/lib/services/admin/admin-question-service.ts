import { AppError, ERROR_CODES } from "../../api/errors";
import { formatUtcTimestamp } from "../../api/response";
import type { QuestionOption } from "../../domain/judging";
import { toOptions } from "../quiz/quiz-service";

export type { QuestionOption } from "../../domain/judging";

import { assertAdminActor, type AdminActor } from "./admin-actor";

export interface AdminAuditContext {
  actorId: string;
  requestId: string | null;
}

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

export interface CreateAdminQuestionInput {
  subject: string;
  chapter: string | null;
  year: number | null;
  type: string;
  stem: string;
  options: QuestionOption[];
  answer: string;
  explanation: string | null;
  difficulty: string | null;
  visibility: "private" | "public";
}

export interface UpdateAdminQuestionInput {
  subject?: string;
  chapter?: string | null;
  year?: number | null;
  type?: string;
  stem?: string;
  options?: QuestionOption[];
  answer?: string;
  explanation?: string | null;
  difficulty?: string | null;
  visibility?: "private" | "public";
  reviewStatus?: "pending" | "approved" | "rejected";
  version: number;
}

export interface SoftDeleteInput {
  reason: string;
  version: number;
}

export interface ApproveUgcInput {
  note: string | null;
  version: number;
}

export interface RejectUgcInput {
  reason: string;
  version: number;
}

export interface ReviewQuestionParams {
  questionId: string;
  actorId: string;
  outcome: "approved" | "rejected";
  note: string | null;
  version: number;
  requestId: string | null;
  now: Date;
}

export interface AdminQuestionRepository {
  listQuestions(
    filters: AdminQuestionListFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: AdminQuestionRecord[]; total: number }>;

  findQuestionById(questionId: string): Promise<AdminQuestionRecord | null>;

  createQuestion(input: CreateAdminQuestionInput & {
    actorId: string;
    requestId: string | null;
    now: Date;
  }): Promise<AdminQuestionRecord>;

  updateQuestion(
    questionId: string,
    input: UpdateAdminQuestionInput,
    audit: AdminAuditContext,
    now: Date,
  ): Promise<AdminQuestionRecord>;

  softDeleteQuestion(
    questionId: string,
    input: SoftDeleteInput,
    audit: AdminAuditContext,
    now: Date,
  ): Promise<void>;

  reviewQuestion(params: ReviewQuestionParams): Promise<AdminQuestionRecord>;
}

const UGC_SOURCE = "ugc";

/**
 * 管理端题库与 UGC 审核服务（契约 ADMIN-Q-01 ~ 05、ADMIN-UGC-01 ~ 03）。
 * 管理端可读答案与解析；创建即官方已批准内容；删除为软删除；
 * 审核仅 pending 可操作，乐观锁冲突 409；所有写操作与审计同事务。
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

  async create(
    actor: AdminActor,
    input: CreateAdminQuestionInput,
    requestId: string | null,
  ): Promise<AdminQuestionDto> {
    assertAdminActor(actor);

    const row = await this.repository.createQuestion({
      ...input,
      actorId: actor.user.id,
      requestId,
      now: new Date(),
    });

    return toAdminQuestionDto(row);
  }

  async update(
    actor: AdminActor,
    questionId: string,
    input: UpdateAdminQuestionInput,
    requestId: string | null,
  ): Promise<AdminQuestionDto> {
    assertAdminActor(actor);

    await this.requireQuestion(questionId);

    const row = await this.repository.updateQuestion(
      questionId,
      input,
      { actorId: actor.user.id, requestId },
      new Date(),
    );

    return toAdminQuestionDto(row);
  }

  async remove(
    actor: AdminActor,
    questionId: string,
    input: SoftDeleteInput,
    requestId: string | null,
  ): Promise<void> {
    assertAdminActor(actor);

    await this.requireQuestion(questionId);

    await this.repository.softDeleteQuestion(
      questionId,
      input,
      { actorId: actor.user.id, requestId },
      new Date(),
    );
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

  async approve(
    actor: AdminActor,
    questionId: string,
    input: ApproveUgcInput,
    requestId: string | null,
  ): Promise<AdminQuestionDto> {
    return this.review(actor, questionId, "approved", input.note, input.version, requestId);
  }

  async reject(
    actor: AdminActor,
    questionId: string,
    input: RejectUgcInput,
    requestId: string | null,
  ): Promise<AdminQuestionDto> {
    return this.review(actor, questionId, "rejected", input.reason, input.version, requestId);
  }

  private async review(
    actor: AdminActor,
    questionId: string,
    outcome: "approved" | "rejected",
    note: string | null,
    version: number,
    requestId: string | null,
  ): Promise<AdminQuestionDto> {
    assertAdminActor(actor);

    const question = await this.requireQuestion(questionId);

    if (question.source !== UGC_SOURCE) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
        details: { field: "source" },
      });
    }

    return toAdminQuestionDto(
      await this.repository.reviewQuestion({
        questionId,
        actorId: actor.user.id,
        outcome,
        note,
        version,
        requestId,
        now: new Date(),
      }),
    );
  }

  private async requireQuestion(questionId: string): Promise<AdminQuestionRecord> {
    const row = await this.repository.findQuestionById(questionId);

    if (!row || row.isDeleted) {
      throw new AppError(ERROR_CODES.NOT_FOUND);
    }

    return row;
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
