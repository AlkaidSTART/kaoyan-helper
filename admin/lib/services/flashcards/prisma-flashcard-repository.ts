import { Prisma, PrismaClient } from "@/generated/prisma/client";

import { AppError, ERROR_CODES } from "../../api/errors";
import { PrismaClientConfigurationError, getPrismaClient } from "../../db/prisma";
import { calendarDayInTimeZone, formatCalendarDay } from "../../domain/time";
import { computeSm2, type CardRating } from "../../domain/sm2";
import type {
  CheckInRow,
  CreateCardInput,
  FlashcardFilters,
  FlashcardRepository,
  FlashcardRow,
  CardProgressRow,
  ReviewInput,
} from "./flashcard-service";

/**
 * Prisma 实现的闪卡仓储。
 * 复习事务：幂等事件唯一约束 → SM-2 进度 upsert → 当日无剩余到期卡时写打卡。
 */
export class PrismaFlashcardRepository implements FlashcardRepository {
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

  async listCards(
    userId: string,
    filters: FlashcardFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: FlashcardRow[]; total: number }> {
    const where: Prisma.FlashcardWhereInput = {
      isDeleted: false,
      OR: [{ source: "system" }, { creatorId: userId }],
      ...(filters.category !== null ? { category: filters.category } : {}),
      ...(filters.source !== null ? { source: filters.source } : {}),
      ...(filters.search !== null
        ? {
            OR: [
              { front: { contains: filters.search, mode: Prisma.QueryMode.insensitive } },
              { back: { contains: filters.search, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.run(() =>
      this.client.$transaction([
        this.client.flashcard.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.client.flashcard.count({ where }),
      ]),
    );

    return { rows: rows as unknown as FlashcardRow[], total };
  }

  async findCardById(cardId: string): Promise<FlashcardRow | null> {
    const row = await this.run(() => this.client.flashcard.findUnique({ where: { id: cardId } }));

    return row ? (row as unknown as FlashcardRow) : null;
  }

  async findProgress(userId: string, cardId: string): Promise<CardProgressRow | null> {
    const row = await this.run(() =>
      this.client.cardProgress.findUnique({
        where: { userId_cardId: { userId, cardId } },
      }),
    );

    return row ? toProgress(row) : null;
  }

  async listDueCards(
    userId: string,
    limit: number,
    now: Date,
  ): Promise<{
    items: { card: FlashcardRow; progress: CardProgressRow | null }[];
    remaining: number;
  }> {
    const accessibleWhere: Prisma.FlashcardWhereInput = {
      isDeleted: false,
      OR: [{ source: "system" }, { creatorId: userId }],
    };

    const dueProgresses = await this.run(() =>
      this.client.cardProgress.findMany({
        where: { userId, dueAt: { lte: now }, card: accessibleWhere },
        include: { card: true },
        orderBy: [{ dueAt: "asc" }, { cardId: "asc" }],
      }),
    );

    const reviewedCardIds = new Set(dueProgresses.map((row) => row.cardId));

    const newCards = await this.run(() =>
      this.client.flashcard.findMany({
        where: { ...accessibleWhere, id: { notIn: [...reviewedCardIds] } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }),
    );

    const items: { card: FlashcardRow; progress: CardProgressRow | null }[] = [
      ...dueProgresses.map((row) => ({
        card: row.card as unknown as FlashcardRow,
        progress: toProgress(row),
      })),
      ...newCards.map((card) => ({
        card: card as unknown as FlashcardRow,
        progress: null,
      })),
    ];

    return {
      items: items.slice(0, limit),
      remaining: items.length,
    };
  }

  async createCard(userId: string, input: CreateCardInput): Promise<FlashcardRow> {
    const row = await this.run(() =>
      this.client.flashcard.create({
        data: {
          source: "ugc",
          creatorId: userId,
          category: input.category,
          front: input.front,
          back: input.back,
          tags: input.tags,
        },
      }),
    );

    return row as unknown as FlashcardRow;
  }

  async reviewCard(params: ReviewInput & {
    userId: string;
    card: FlashcardRow;
    progress: CardProgressRow | null;
    now: Date;
    timeZone: string;
  }): Promise<{
    replayed: boolean;
    progress: CardProgressRow;
    dueRemaining: number;
    checkIn: CheckInRow | null;
  }> {
    const { userId, card, progress, rating, idempotencyKey, now, timeZone } = params;

    return this.run(async () => {
      const replayed = await this.client.cardReviewEvent.findUnique({
        where: { userId_idempotencyKey: { userId, idempotencyKey } },
      });

      if (replayed) {
        const storedProgress = await this.client.cardProgress.findUnique({
          where: { userId_cardId: { userId, cardId: card.id } },
        });
        const storedResult = replayed.result as {
          dueRemaining: number;
          checkIn: { checkInDate: string } | null;
        };

        if (!storedProgress) {
          throw new AppError(ERROR_CODES.INTERNAL_ERROR);
        }

        return {
          replayed: true,
          progress: toProgress(storedProgress),
          dueRemaining: storedResult.dueRemaining,
          checkIn: storedResult.checkIn
            ? ({ checkInDate: new Date(`${storedResult.checkIn.checkInDate}T00:00:00Z`) } as CheckInRow)
            : null,
        };
      }

      const next = computeSm2(progress, rating, now);

      const result = await this.client.$transaction(async (tx) => {
        const upserted = await tx.cardProgress.upsert({
          where: { userId_cardId: { userId, cardId: card.id } },
          create: {
            userId,
            cardId: card.id,
            repetitions: next.repetitions,
            intervalDays: next.intervalDays,
            easeFactor: next.easeFactor,
            dueAt: next.dueAt,
            lastRating: rating,
          },
          update: {
            repetitions: next.repetitions,
            intervalDays: next.intervalDays,
            easeFactor: next.easeFactor,
            dueAt: next.dueAt,
            lastRating: rating,
            version: { increment: 1 },
          },
        });

        await tx.cardReviewEvent.create({
          data: {
            userId,
            cardId: card.id,
            idempotencyKey,
            rating,
            result: {},
          },
        });

        const todayLocal = calendarDayInTimeZone(now, timeZone);
        const todayDate = new Date(Date.UTC(todayLocal.year, todayLocal.month - 1, todayLocal.day));

        const dueRemaining = await tx.cardProgress.count({
          where: { userId, dueAt: { lte: now } },
        });

        let checkIn: CheckInRow | null = null;

        // 完成当日最后一张到期卡片：同一事务 upsert 打卡，每日唯一。
        if (dueRemaining === 0) {
          const existing = await tx.checkInRecord.findUnique({
            where: { userId_checkInDate: { userId, checkInDate: todayDate } },
          });

          if (existing) {
            checkIn = {
              checkInDate: existing.checkInDate,
              createdAt: existing.createdAt,
            };
          } else {
            const created = await tx.checkInRecord.create({
              data: { userId, checkInDate: todayDate },
            });

            checkIn = {
              checkInDate: created.checkInDate,
              createdAt: created.createdAt,
            };
          }
        }

        return {
          progress: toProgress(upserted),
          dueRemaining,
          checkIn,
        };
      });

      await this.client.cardReviewEvent.update({
        where: { userId_idempotencyKey: { userId, idempotencyKey } },
        data: {
          result: {
            dueRemaining: result.dueRemaining,
            checkIn: result.checkIn
              ? { checkInDate: formatCalendarDay(calendarDayInTimeZone(result.checkIn.checkInDate, timeZone)) }
              : null,
          },
        },
      });

      return {
        replayed: false,
        progress: result.progress,
        dueRemaining: result.dueRemaining,
        checkIn: result.checkIn,
      };
    });
  }

  async listCheckIns(
    userId: string,
    fromDate: string | null,
    toDate: string | null,
    page: number,
    pageSize: number,
  ): Promise<{ rows: CheckInRow[]; total: number }> {
    const where: Prisma.CheckInRecordWhereInput = {
      userId,
      ...(fromDate !== null || toDate !== null
        ? {
            checkInDate: {
              ...(fromDate !== null ? { gte: new Date(`${fromDate}T00:00:00Z`) } : {}),
              ...(toDate !== null ? { lte: new Date(`${toDate}T00:00:00Z`) } : {}),
            },
          }
        : {}),
    };

    const [rows, total] = await this.run(() =>
      this.client.$transaction([
        this.client.checkInRecord.findMany({
          where,
          orderBy: [{ checkInDate: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.client.checkInRecord.count({ where }),
      ]),
    );

    return { rows: rows as unknown as CheckInRow[], total };
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

function toProgress(row: {
  repetitions: number;
  intervalDays: number;
  easeFactor: Prisma.Decimal | number;
  dueAt: Date;
  lastRating: string | null;
  version: number;
}): CardProgressRow {
  return {
    repetitions: row.repetitions,
    intervalDays: row.intervalDays,
    easeFactor: Number(row.easeFactor),
    dueAt: row.dueAt,
    lastRating: row.lastRating,
    version: row.version,
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

export type { CardRating };
