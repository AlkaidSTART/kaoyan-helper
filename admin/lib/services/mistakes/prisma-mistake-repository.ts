import { Prisma, PrismaClient } from "@/generated/prisma/client";

import { AppError, ERROR_CODES } from "../../api/errors";
import { PrismaClientConfigurationError, getPrismaClient } from "../../db/prisma";
import { nextMistakeState } from "../../domain/judging";
import type {
  MistakeFilters,
  MistakeRepository,
  MistakeRow,
  RedoInput,
} from "./mistake-service";

type Tx = Prisma.TransactionClient;

/**
 * Prisma 实现的错题仓储。重做在单事务内完成：
 * attempt 唯一约束兜底幂等 → 错题状态机按判题结果推进。
 */
export class PrismaMistakeRepository implements MistakeRepository {
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

  async listMistakes(
    userId: string,
    filters: MistakeFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: MistakeRow[]; total: number }> {
    const where: Prisma.MistakeRecordWhereInput = {
      userId,
      ...(filters.status !== null ? { status: filters.status } : {}),
      ...(filters.subject !== null ? { question: { subject: filters.subject } } : {}),
    };

    const [rows, total] = await this.run(() =>
      this.client.$transaction([
        this.client.mistakeRecord.findMany({
          where,
          include: {
            question: {
              select: {
                id: true,
                subject: true,
                chapter: true,
                year: true,
                type: true,
                stem: true,
                options: true,
                answer: true,
                explanation: true,
                difficulty: true,
                source: true,
              },
            },
          },
          orderBy: [{ lastWrongAt: "desc" }, { id: "asc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.client.mistakeRecord.count({ where }),
      ]),
    );

    return { rows: rows as unknown as MistakeRow[], total };
  }

  async findMistakeById(mistakeId: string): Promise<MistakeRow | null> {
    const row = await this.run(() =>
      this.client.mistakeRecord.findUnique({
        where: { id: mistakeId },
        include: {
          question: {
            select: {
              id: true,
              subject: true,
              chapter: true,
              year: true,
              type: true,
              stem: true,
              options: true,
              answer: true,
              explanation: true,
              difficulty: true,
              source: true,
            },
          },
        },
      }),
    );

    return row ? (row as unknown as MistakeRow) : null;
  }

  async redoMistake(params: RedoInput & {
    userId: string;
    mistakeId: string;
    questionId: string;
    normalizedAnswer: string;
    isCorrect: boolean;
    answeredAt: Date;
  }): Promise<{ replayed: boolean; mistake: MistakeRow | null }> {
    const { userId, mistakeId, questionId, normalizedAnswer, isCorrect, attemptId, answeredAt } =
      params;

    const row = await this.run(() =>
      this.client.$transaction(async (tx: Tx) => {
        const existingAttempt = await tx.questionAttempt.findUnique({
          where: { userId_attemptId: { userId, attemptId } },
        });

        if (existingAttempt) {
          const mistake = await tx.mistakeRecord.findUnique({ where: { id: mistakeId } });

          return { replayed: true, mistake };
        }

        const mistakeBefore = await tx.mistakeRecord.findUnique({ where: { id: mistakeId } });

        if (!mistakeBefore) {
          throw new AppError(ERROR_CODES.MISTAKE_NOT_FOUND);
        }

        const next = nextMistakeState(
          {
            status: mistakeBefore.status,
            errorCount: mistakeBefore.errorCount,
            consecutiveCorrect: mistakeBefore.consecutiveCorrect,
          },
          isCorrect,
          answeredAt,
        );

        await tx.mistakeRecord.update({
          where: { id: mistakeId },
          data: {
            status: next.status,
            errorCount: next.errorCount,
            consecutiveCorrect: next.consecutiveCorrect,
            lastWrongAt: isCorrect ? mistakeBefore.lastWrongAt : answeredAt,
            masteredAt: next.masteredAt,
            version: { increment: 1 },
          },
        });

        await tx.questionAttempt.create({
          data: {
            attemptId,
            userId,
            questionId,
            answer: normalizedAnswer,
            isCorrect,
            result: { mistakeId },
          },
        });

        const mistake = await tx.mistakeRecord.findUnique({
          where: { id: mistakeId },
          include: {
            question: {
              select: {
                id: true,
                subject: true,
                chapter: true,
                year: true,
                type: true,
                stem: true,
                options: true,
                answer: true,
                explanation: true,
                difficulty: true,
                source: true,
              },
            },
          },
        });

        return { replayed: false, mistake };
      }),
    );

    return { replayed: row.replayed, mistake: (row.mistake ?? null) as MistakeRow | null };
  }

  async reactivateMistake(userId: string, mistakeId: string, version: number): Promise<MistakeRow> {
    const row = await this.run(() =>
      this.client.$transaction(async (tx: Tx) => {
        const existing = await tx.mistakeRecord.findUnique({ where: { id: mistakeId } });

        if (!existing || existing.userId !== userId) {
          throw new AppError(ERROR_CODES.MISTAKE_NOT_FOUND);
        }

        if (existing.version !== version) {
          throw new AppError(ERROR_CODES.CONFLICT);
        }

        await tx.mistakeRecord.update({
          where: { id: mistakeId },
          data: {
            status: "active",
            consecutiveCorrect: 0,
            masteredAt: null,
            version: { increment: 1 },
          },
        });

        return tx.mistakeRecord.findUnique({
          where: { id: mistakeId },
          include: {
            question: {
              select: {
                id: true,
                subject: true,
                chapter: true,
                year: true,
                type: true,
                stem: true,
                options: true,
                answer: true,
                explanation: true,
                difficulty: true,
                source: true,
              },
            },
          },
        });
      }),
    );

    return row as unknown as MistakeRow;
  }

  async deleteMistake(userId: string, mistakeId: string, version: number): Promise<void> {
    await this.run(() =>
      this.client.$transaction(async (tx: Tx) => {
        const existing = await tx.mistakeRecord.findUnique({ where: { id: mistakeId } });

        if (!existing || existing.userId !== userId) {
          throw new AppError(ERROR_CODES.MISTAKE_NOT_FOUND);
        }

        if (existing.version !== version) {
          throw new AppError(ERROR_CODES.CONFLICT);
        }

        await tx.mistakeRecord.delete({ where: { id: mistakeId } });
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
