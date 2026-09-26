import { AppError, ERROR_CODES } from "../../api/errors";
import { formatUtcTimestamp } from "../../api/response";
import { calendarDayInTimeZone, formatCalendarDay } from "../../domain/time";
import { computeSm2, type CardRating } from "../../domain/sm2";
import type { ActivityRecorder } from "../activity/activity-recorder";

export interface FlashcardFilters {
  category: string | null;
  source: string | null;
  search: string | null;
}

export interface FlashcardRow {
  id: string;
  source: string;
  creatorId: string | null;
  category: string;
  front: string;
  back: string;
  tags: string[];
  isDeleted: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CardProgressRow {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  dueAt: Date;
  lastRating: string | null;
  version: number;
}

export interface FlashcardDto {
  id: string;
  source: string;
  category: string;
  front: string;
  back: string;
  tags: string[];
  isMine: boolean;
  createdAt: string;
}

export interface DueItemDto {
  card: FlashcardDto;
  progress: {
    repetitions: number;
    intervalDays: number;
    easeFactor: number;
    dueAt: string;
    lastRating: string | null;
  } | null;
}

export interface DueListDto {
  items: DueItemDto[];
  dueRemaining: number;
  serverTime: string;
}

export interface ProgressDto {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  dueAt: string;
  lastRating: string | null;
  version: number;
}

export interface ReviewResultDto {
  progress: ProgressDto;
  dueRemaining: number;
  checkIn: { checkInDate: string } | null;
}

export interface CheckInRow {
  checkInDate: Date;
  createdAt: Date;
}

export interface CheckInDto {
  checkInDate: string;
  createdAt: string;
}

export interface CreateCardInput {
  category: string;
  front: string;
  back: string;
  tags: string[];
}

export interface ReviewInput {
  rating: CardRating;
  idempotencyKey: string;
}

export interface FlashcardRepository {
  listCards(
    userId: string,
    filters: FlashcardFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: FlashcardRow[]; total: number }>;

  findCardById(cardId: string): Promise<FlashcardRow | null>;

  findProgress(userId: string, cardId: string): Promise<CardProgressRow | null>;

  /** 到期卡片（无进度或 due_at <= now），按 due_at asc、无进度优先。 */
  listDueCards(
    userId: string,
    limit: number,
    now: Date,
  ): Promise<{ items: { card: FlashcardRow; progress: CardProgressRow | null }[]; remaining: number }>;

  createCard(userId: string, input: CreateCardInput): Promise<FlashcardRow>;

  /**
   * 复习事务：SM-2 计算进度 upsert + 幂等事件 + （当日无剩余到期卡时）打卡。
   * 同一 (userId, idempotencyKey) 重复调用返回首次结果。
   */
  reviewCard(params: {
    userId: string;
    card: FlashcardRow;
    progress: CardProgressRow | null;
    rating: CardRating;
    idempotencyKey: string;
    now: Date;
    timeZone: string;
  }): Promise<{
    replayed: boolean;
    progress: CardProgressRow;
    dueRemaining: number;
    checkIn: CheckInRow | null;
  }>;

  listCheckIns(
    userId: string,
    fromDate: string | null,
    toDate: string | null,
    page: number,
    pageSize: number,
  ): Promise<{ rows: CheckInRow[]; total: number }>;
}

export const MAX_DUE_LIMIT = 50;

export const DEFAULT_DUE_LIMIT = 20;

export class FlashcardService {
  private readonly repository: FlashcardRepository;

  private readonly timeZone: string;

  private readonly activityRecorder: ActivityRecorder | null;

  constructor(repository: FlashcardRepository, timeZone: string, activityRecorder?: ActivityRecorder) {
    this.repository = repository;
    this.timeZone = timeZone;
    this.activityRecorder = activityRecorder ?? null;
  }

  async listDue(userId: string, limit: number): Promise<DueListDto> {
    const now = new Date();
    const { items, remaining } = await this.repository.listDueCards(userId, limit, now);

    return {
      items: items.map((item) => ({
        card: toCardDto(item.card, userId),
        progress: item.progress ? toProgressSummary(item.progress) : null,
      })),
      dueRemaining: remaining,
      serverTime: formatUtcTimestamp(now),
    };
  }

  async list(
    userId: string,
    filters: FlashcardFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: FlashcardRow[]; total: number }> {
    return this.repository.listCards(userId, filters, page, pageSize);
  }

  async create(userId: string, input: CreateCardInput): Promise<FlashcardDto> {
    const row = await this.repository.createCard(userId, input);

    return toCardDto(row, userId);
  }

  async review(
    userId: string,
    cardId: string,
    input: ReviewInput,
  ): Promise<ReviewResultDto> {
    const card = await this.repository.findCardById(cardId);

    if (!card || card.isDeleted || !(card.source === "system" || card.creatorId === userId)) {
      throw new AppError(ERROR_CODES.NOT_FOUND);
    }

    const progress = await this.repository.findProgress(userId, cardId);
    const now = new Date();

    if (progress && progress.dueAt.getTime() > now.getTime()) {
      throw new AppError(ERROR_CODES.CARD_NOT_DUE);
    }

    const result = await this.repository.reviewCard({
      userId,
      card,
      progress,
      rating: input.rating,
      idempotencyKey: input.idempotencyKey,
      now,
      timeZone: this.timeZone,
    });

    // 观测旁路（p1 admin-readonly-activity ADR-3）：recorder 自吞异常，不影响复习结果。
    await this.activityRecorder?.record({
      userId,
      type: "card_review",
      summary: { cardId, rating: input.rating },
    });

    return {
      progress: toProgressDto(result.progress),
      dueRemaining: result.dueRemaining,
      checkIn: result.checkIn
        ? { checkInDate: formatCalendarDay(calendarDayInTimeZone(result.checkIn.checkInDate, this.timeZone)) }
        : null,
    };
  }

  async listCheckIns(
    userId: string,
    fromDate: string | null,
    toDate: string | null,
    page: number,
    pageSize: number,
  ): Promise<{ rows: CheckInDto[]; total: number; streakDays: number }> {
    const { rows, total } = await this.repository.listCheckIns(
      userId,
      fromDate,
      toDate,
      page,
      pageSize,
    );

    return {
      rows: rows.map((row) => ({
        checkInDate: formatCalendarDay(calendarDayInTimeZone(row.checkInDate, this.timeZone)),
        createdAt: formatUtcTimestamp(row.createdAt),
      })),
      total,
      streakDays: computeStreak(
        rows.map((row) => formatCalendarDay(calendarDayInTimeZone(row.checkInDate, this.timeZone))),
      ),
    };
  }
}

/** 连续打卡：从今天（或昨天）往回连续计数。 */
export function computeStreak(dates: string[]): number {
  const unique = [...new Set(dates)].sort().reverse();
  const today = formatCalendarDay(
    calendarDayInTimeZone(new Date(), DEFAULT_TIMEZONE_FALLBACK),
  );

  if (unique.length === 0) {
    return 0;
  }

  const dayMs = 86_400_000;
  const toDayNumber = (value: string): number =>
    Math.floor(Date.parse(`${value}T00:00:00Z`) / dayMs);

  let cursor = toDayNumber(today);
  const first = toDayNumber(unique[0]);

  // 今天尚未打卡时，从昨天开始计数。
  if (first !== cursor) {
    if (first !== cursor - 1) {
      return 0;
    }

    cursor -= 1;
  }

  let streak = 0;

  for (const value of unique) {
    const day = toDayNumber(value);

    if (day !== cursor) {
      break;
    }

    streak += 1;
    cursor -= 1;
  }

  return streak;
}

const DEFAULT_TIMEZONE_FALLBACK = "Asia/Shanghai";

export function toCardDto(row: FlashcardRow, actorId: string): FlashcardDto {
  return {
    id: row.id,
    source: row.source,
    category: row.category,
    front: row.front,
    back: row.back,
    tags: row.tags,
    isMine: row.creatorId === actorId,
    createdAt: formatUtcTimestamp(row.createdAt),
  };
}

export function toProgressSummary(row: CardProgressRow) {
  return {
    repetitions: row.repetitions,
    intervalDays: row.intervalDays,
    easeFactor: row.easeFactor,
    dueAt: formatUtcTimestamp(row.dueAt),
    lastRating: row.lastRating,
  };
}

export function toProgressDto(row: CardProgressRow): ProgressDto {
  return {
    ...toProgressSummary(row),
    version: row.version,
  };
}

export { computeSm2 };
