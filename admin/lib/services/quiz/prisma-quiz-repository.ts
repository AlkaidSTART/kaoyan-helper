import { Prisma, PrismaClient } from "@/generated/prisma/client";

import { AppError, ERROR_CODES } from "../../api/errors";
import { PrismaClientConfigurationError, getPrismaClient } from "../../db/prisma";
import { nextMistakeState } from "../../domain/judging";
import type {
  CreateQuestionInput,
  QuestionFilters,
  QuestionRow,
  QuizRepository,
  SubmitAnswerInput,
  SubmittedMistakeRow,
  UpdateQuestionInput,
} from "./quiz-service";

type Tx = Prisma.TransactionClient;

interface QuestionRowShape {
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
  creatorId: string | null;
  isDeleted: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Prisma 实现的题库仓储。
 * 判题事务：attempt 幂等（唯一约束 user_id + attempt_id）→ 冲突时返回首次结果；
 * 错题状态机在同一事务内 upsert（契约 §2.3 原子写入）。
 */
export class PrismaQuizRepository implements QuizRepository {
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
    userId: string,
    filters: QuestionFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: QuestionRow[]; total: number }> {
    const where: Prisma.QuestionWhereInput = {
      isDeleted: false,
      ...(filters.scope === "mine"
        ? { creatorId: userId }
        : { source: "official", reviewStatus: "approved" }),
      ...(filters.subject !== null ? { subject: filters.subject } : {}),
      ...(filters.chapter !== null ? { chapter: filters.chapter } : {}),
      ...(filters.year !== null ? { year: filters.year } : {}),
      ...(filters.type !== null ? { type: filters.type } : {}),
      ...(filters.difficulty !== null ? { difficulty: filters.difficulty } : {}),
      ...(filters.search !== null
        ? { stem: { contains: filters.search, mode: Prisma.QueryMode.insensitive } }
        : {}),
    };

    const [rows, total] = await this.run(() =>
      this.client.$transaction([
        this.client.question.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.client.question.count({ where }),
      ]),
    );

    return {
      rows: rows.map((row) => row as unknown as QuestionRowShape),
      total,
    };
  }

  async findQuestionById(questionId: string): Promise<QuestionRow | null> {
    const row = await this.run(() => this.client.question.findUnique({ where: { id: questionId } }));

    return row ? (row as unknown as QuestionRowShape) : null;
  }

  async submitAnswer(params: SubmitAnswerInput & {
    userId: string;
    question: QuestionRow;
    normalizedAnswer: string;
    isCorrect: boolean;
    answeredAt: Date;
  }): Promise<{ mistake: SubmittedMistakeRow | null }> {
    const { userId, question, normalizedAnswer, isCorrect, attemptId, answeredAt } = params;

    const mistakeRow = await this.run(() =>
      this.client.$transaction(async (tx) => {
        const existingAttempt = await tx.questionAttempt.findUnique({
          where: { userId_attemptId: { userId, attemptId } },
        });

        if (existingAttempt) {
          // 幂等重放：返回首次提交产生的错题快照，不再产生副作用。
          const stored = existingAttempt.result as { mistake: SubmittedMistakeRow | null };

          return stored.mistake;
        }

        const mistakeBefore = await tx.mistakeRecord.findUnique({
          where: { userId_questionId: { userId, questionId: question.id } },
        });

        let mistake: SubmittedMistakeRow | null = null;

        if (!isCorrect) {
          const next = nextMistakeState(
            mistakeBefore
              ? {
                  status: mistakeBefore.status,
                  errorCount: mistakeBefore.errorCount,
                  consecutiveCorrect: mistakeBefore.consecutiveCorrect,
                }
              : null,
            false,
            answeredAt,
          );

          const upserted = await tx.mistakeRecord.upsert({
            where: {
              userId_questionId: {
                userId,
                questionId: question.id,
              },
            },
            create: {
              userId,
              questionId: question.id,
              status: next.status,
              errorCount: next.errorCount,
              consecutiveCorrect: next.consecutiveCorrect,
              lastWrongAt: answeredAt,
              masteredAt: next.masteredAt,
            },
            update: {
              status: next.status,
              errorCount: next.errorCount,
              consecutiveCorrect: next.consecutiveCorrect,
              lastWrongAt: answeredAt,
              masteredAt: next.masteredAt,
            },
          });

          mistake = toMistakeRow(upserted);
        } else if (mistakeBefore && mistakeBefore.status === "active") {
          // 历史错题通过刷题答对：在统一判题服务中更新连对状态（契约 §6.3）。
          const next = nextMistakeState(
            {
              status: mistakeBefore.status,
              errorCount: mistakeBefore.errorCount,
              consecutiveCorrect: mistakeBefore.consecutiveCorrect,
            },
            true,
            answeredAt,
          );

          const updated = await tx.mistakeRecord.update({
            where: { id: mistakeBefore.id },
            data: {
              status: next.status,
              errorCount: next.errorCount,
              consecutiveCorrect: next.consecutiveCorrect,
              masteredAt: next.masteredAt,
            },
          });

          mistake = toMistakeRow(updated);
        }

        await tx.questionAttempt.create({
          data: {
            attemptId,
            userId,
            questionId: question.id,
            answer: normalizedAnswer,
            isCorrect,
            result: {
            mistake: mistake
              ? {
                  id: mistake.id,
                  status: mistake.status,
                  errorCount: mistake.errorCount,
                  consecutiveCorrect: mistake.consecutiveCorrect,
                  masteredAt: mistake.masteredAt === null ? null : mistake.masteredAt.toISOString(),
                }
              : null,
          },
          },
        });

        return mistake;
      }),
    );

    return { mistake: mistakeRow };
  }

  async createQuestion(userId: string, input: CreateQuestionInput): Promise<QuestionRow> {
    const row = await this.run(() =>
      this.client.question.create({
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
          source: "ugc",
          visibility: input.visibility,
          reviewStatus: "pending",
          isApproved: false,
          creatorId: userId,
        },
      }),
    );

    return row as unknown as QuestionRowShape;
  }

  async updateQuestion(
    userId: string,
    questionId: string,
    input: UpdateQuestionInput,
  ): Promise<QuestionRow> {
    const row = await this.run(() =>
      this.client.$transaction(async (tx) => {
        const existing = await tx.question.findUnique({ where: { id: questionId } });

        if (!existing || existing.isDeleted || existing.creatorId !== userId) {
          throw new AppError(ERROR_CODES.NOT_FOUND);
        }

        if (existing.version !== input.version) {
          throw new AppError(ERROR_CODES.CONFLICT);
        }

        // 公共题编辑后重新进入待审核（契约 QUIZ-05）。
        const nextVisibility = input.visibility ?? existing.visibility;
        const backToPending = nextVisibility === "public";

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
          version: { increment: 1 },
        };

        if (backToPending) {
          data.reviewStatus = "pending";
          data.isApproved = false;
          data.reviewedById = null;
          data.reviewedAt = null;
          data.reviewNote = null;
        }

        return tx.question.update({
          where: { id: questionId },
          data,
        });
      }),
    );

    return row as unknown as QuestionRowShape;
  }

  async softDeleteQuestion(userId: string, questionId: string, version: number): Promise<void> {
    await this.run(() =>
      this.client.$transaction(async (tx) => {
        const existing = await tx.question.findUnique({ where: { id: questionId } });

        if (!existing || existing.isDeleted || existing.creatorId !== userId) {
          throw new AppError(ERROR_CODES.NOT_FOUND);
        }

        if (existing.version !== version) {
          throw new AppError(ERROR_CODES.CONFLICT);
        }

        // 软删除保留行：他人错题的历史引用不受影响（契约 QUIZ-06）。
        await tx.question.update({
          where: { id: questionId },
          data: { isDeleted: true, version: { increment: 1 } },
        });
      }),
    );
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw mapPrismaError(error);
    }
  }
}

function toMistakeRow(row: {
  id: string;
  status: string;
  errorCount: number;
  consecutiveCorrect: number;
  masteredAt: Date | null;
}): SubmittedMistakeRow {
  return {
    id: row.id,
    status: row.status,
    errorCount: row.errorCount,
    consecutiveCorrect: row.consecutiveCorrect,
    masteredAt: row.masteredAt,
  };
}

function mapPrismaError(error: unknown): AppError {
  if (
    error instanceof PrismaClientConfigurationError ||
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    return new AppError(ERROR_CODES.DEPENDENCY_UNAVAILABLE, { cause: error });
  }

  return new AppError(ERROR_CODES.INTERNAL_ERROR, { cause: error });
}


export type { Tx };
