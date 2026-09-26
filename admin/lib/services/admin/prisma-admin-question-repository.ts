import { Prisma, type PrismaClient } from "@/generated/prisma/client";

import { AppError, ERROR_CODES } from "../../api/errors";
import { getPrismaClient } from "../../db/prisma";
import { mapAdminPrismaError } from "./prisma-error-mapper";
import type {
  AdminAuditContext,
  AdminQuestionListFilters,
  AdminQuestionRecord,
  AdminQuestionRepository,
  CreateAdminQuestionInput,
  ReviewQuestionParams,
  SoftDeleteInput,
  UpdateAdminQuestionInput,
} from "./admin-question-service";

const creatorInclude = {
  creator: { select: { id: true, nickname: true, email: true } },
} as const;

/** Prisma 实现的管理端题库仓储；写操作与审计日志同事务提交。 */
export class PrismaAdminQuestionRepository implements AdminQuestionRepository {
  private readonly injectedClient?: PrismaClient;

  private resolvedClient?: PrismaClient;

  constructor(client?: PrismaClient) {
    this.injectedClient = client;
  }

  private get client(): PrismaClient {
    if (!this.resolvedClient) {
      this.resolvedClient = this.injectedClient ?? getPrismaClient();
    }

    return this.resolvedClient;
  }

  async listQuestions(
    filters: AdminQuestionListFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: AdminQuestionRecord[]; total: number }> {
    return this.run(async () => {
      const where: Prisma.QuestionWhereInput = {
        ...(filters.includeDeleted ? {} : { isDeleted: false }),
        ...(filters.subject !== null ? { subject: filters.subject } : {}),
        ...(filters.source !== null ? { source: filters.source } : {}),
        ...(filters.reviewStatus !== null ? { reviewStatus: filters.reviewStatus } : {}),
        ...(filters.isApproved !== null ? { isApproved: filters.isApproved } : {}),
        ...(filters.search !== null
          ? { stem: { contains: filters.search, mode: Prisma.QueryMode.insensitive } }
          : {}),
      };

      const [rows, total] = await this.client.$transaction([
        this.client.question.findMany({
          where,
          include: creatorInclude,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.client.question.count({ where }),
      ]);

      return { rows: rows as unknown as AdminQuestionRecord[], total };
    });
  }

  async findQuestionById(questionId: string): Promise<AdminQuestionRecord | null> {
    return this.run(async () => {
      const row = await this.client.question.findUnique({
        where: { id: questionId },
        include: creatorInclude,
      });

      return row ? (row as unknown as AdminQuestionRecord) : null;
    });
  }

  async createQuestion(input: CreateAdminQuestionInput & {
    actorId: string;
    requestId: string | null;
    now: Date;
  }): Promise<AdminQuestionRecord> {
    return this.run(async () => {
      const row = await this.client.$transaction(async (tx) => {
        const created = await tx.question.create({
          data: {
            subject: input.subject,
            chapter: input.chapter,
            year: input.year,
            type: input.type,
            stem: input.stem,
            options: JSON.parse(JSON.stringify(input.options)) as Prisma.InputJsonValue,
            answer: input.answer,
            explanation: input.explanation,
            difficulty: input.difficulty,
            source: "official",
            visibility: input.visibility,
            // 管理员创建即官方已批准内容（ADR-6），不走 UGC 待审核。
            reviewStatus: "approved",
            isApproved: true,
            reviewedById: input.actorId,
            reviewedAt: input.now,
            creatorId: input.actorId,
          },
          include: creatorInclude,
        });

        await tx.adminAuditLog.create({
          data: {
            actorId: input.actorId,
            action: "question.create",
            resourceType: "question",
            resourceId: created.id,
            requestId: input.requestId,
            metadata: { subject: input.subject, type: input.type },
          },
        });

        return created;
      });

      return row as unknown as AdminQuestionRecord;
    });
  }

  async updateQuestion(
    questionId: string,
    input: UpdateAdminQuestionInput,
    audit: AdminAuditContext,
    now: Date,
  ): Promise<AdminQuestionRecord> {
    return this.run(async () => {
      const row = await this.client.$transaction(async (tx) => {
        const existing = await tx.question.findUnique({ where: { id: questionId } });

        if (!existing || existing.isDeleted) {
          throw new AppError(ERROR_CODES.NOT_FOUND);
        }

        if (existing.version !== input.version) {
          throw new AppError(ERROR_CODES.CONFLICT);
        }

        const data: Prisma.QuestionUncheckedUpdateInput = {
          ...(input.subject !== undefined ? { subject: input.subject } : {}),
          ...(input.chapter !== undefined ? { chapter: input.chapter } : {}),
          ...(input.year !== undefined ? { year: input.year } : {}),
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.stem !== undefined ? { stem: input.stem } : {}),
          ...(input.options !== undefined
            ? { options: JSON.parse(JSON.stringify(input.options)) as Prisma.InputJsonValue }
            : {}),
          ...(input.answer !== undefined ? { answer: input.answer } : {}),
          ...(input.explanation !== undefined ? { explanation: input.explanation } : {}),
          ...(input.difficulty !== undefined ? { difficulty: input.difficulty } : {}),
          ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
          ...(input.reviewStatus !== undefined
            ? {
                reviewStatus: input.reviewStatus,
                isApproved: input.reviewStatus === "approved",
                reviewedById: audit.actorId,
                reviewedAt: now,
              }
            : {}),
          version: { increment: 1 },
        };

        const updated = await tx.question.update({
          where: { id: questionId },
          data,
          include: creatorInclude,
        });

        // 发布/审核状态变更必须审计（契约 §11.2）。
        await tx.adminAuditLog.create({
          data: {
            actorId: audit.actorId,
            action: "question.update",
            resourceType: "question",
            resourceId: questionId,
            requestId: audit.requestId,
            metadata: {
              changedFields: Object.keys(input).filter((field) => field !== "version"),
              reviewStatus: updated.reviewStatus,
            },
          },
        });

        return updated;
      });

      return row as unknown as AdminQuestionRecord;
    });
  }

  async softDeleteQuestion(
    questionId: string,
    input: SoftDeleteInput,
    audit: AdminAuditContext,
    now: Date,
  ): Promise<void> {
    await this.run(async () => {
      await this.client.$transaction(async (tx) => {
        const existing = await tx.question.findUnique({ where: { id: questionId } });

        if (!existing || existing.isDeleted) {
          throw new AppError(ERROR_CODES.NOT_FOUND);
        }

        if (existing.version !== input.version) {
          throw new AppError(ERROR_CODES.CONFLICT);
        }

        await tx.question.update({
          where: { id: questionId },
          data: {
            isDeleted: true,
            deletedReason: input.reason,
            version: { increment: 1 },
          },
        });

        await tx.adminAuditLog.create({
          data: {
            actorId: audit.actorId,
            action: "question.delete",
            resourceType: "question",
            resourceId: questionId,
            requestId: audit.requestId,
            metadata: {
              reason: input.reason,
              version: input.version,
              deletedAt: now.toISOString(),
            },
          },
        });
      });
    });
  }

  async reviewQuestion(params: ReviewQuestionParams): Promise<AdminQuestionRecord> {
    return this.run(async () => {
      const row = await this.client.$transaction(async (tx) => {
        const existing = await tx.question.findUnique({
          where: { id: params.questionId },
        });

        if (!existing || existing.isDeleted) {
          throw new AppError(ERROR_CODES.NOT_FOUND);
        }

        if (existing.reviewStatus !== "pending") {
          throw new AppError(ERROR_CODES.UGC_ALREADY_REVIEWED);
        }

        if (existing.version !== params.version) {
          throw new AppError(ERROR_CODES.CONFLICT);
        }

        const updated = await tx.question.update({
          where: { id: params.questionId },
          data: {
            reviewStatus: params.outcome,
            isApproved: params.outcome === "approved",
            reviewedById: params.actorId,
            reviewedAt: params.now,
            reviewNote: params.note,
            version: { increment: 1 },
          },
          include: creatorInclude,
        });

        await tx.adminAuditLog.create({
          data: {
            actorId: params.actorId,
            action: params.outcome === "approved" ? "ugc.approve" : "ugc.reject",
            resourceType: "question",
            resourceId: params.questionId,
            requestId: params.requestId,
            metadata: {
              note: params.note,
              version: params.version,
              creatorId: existing.creatorId,
            },
          },
        });

        return updated;
      });

      return row as unknown as AdminQuestionRecord;
    });
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw mapAdminPrismaError(error);
    }
  }
}
