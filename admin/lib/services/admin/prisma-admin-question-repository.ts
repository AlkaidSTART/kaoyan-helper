import { Prisma, type PrismaClient } from "@/generated/prisma/client";

import { AppError } from "../../api/errors";
import { getPrismaClient } from "../../db/prisma";
import { mapAdminPrismaError } from "./prisma-error-mapper";
import type {
  AdminQuestionListFilters,
  AdminQuestionRecord,
  AdminQuestionRepository,
} from "./admin-question-service";

const creatorInclude = {
  creator: { select: { id: true, nickname: true, email: true } },
} as const;

/** Prisma 实现的管理端题库仓储（只读）。 */
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
