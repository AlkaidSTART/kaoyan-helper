import { describe, expect, it, vi } from "vitest";

import { ERROR_CODES } from "../../../api/errors";
import type {
  CardProgressRow,
  FlashcardRepository,
  FlashcardRow,
} from "../flashcard-service";
import { computeStreak, FlashcardService } from "../flashcard-service";

const USER_A = "11111111-1111-4111-8111-111111111111";
const CARD_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function cardRow(overrides: Partial<FlashcardRow> = {}): FlashcardRow {
  return {
    id: CARD_ID,
    source: "system",
    creatorId: null,
    category: "politics",
    front: "对立统一规律",
    back: "唯物辩证法的实质和核心",
    tags: [],
    isDeleted: false,
    version: 1,
    createdAt: new Date("2026-09-01T00:00:00Z"),
    updatedAt: new Date("2026-09-01T00:00:00Z"),
    ...overrides,
  };
}

function progressRow(overrides: Partial<CardProgressRow> = {}): CardProgressRow {
  return {
    repetitions: 1,
    intervalDays: 1,
    easeFactor: 2.6,
    dueAt: new Date("2026-09-26T00:00:00Z"),
    lastRating: "remembered",
    version: 1,
    ...overrides,
  };
}

function fakeRepository(
  card: FlashcardRow | null = cardRow(),
  progress: CardProgressRow | null = null,
): FlashcardRepository & { reviewSpy: ReturnType<typeof vi.fn> } {
  const reviewSpy = vi.fn(async (params: { rating: string; now: Date }) => ({
    replayed: false,
    progress: {
      repetitions: 1,
      intervalDays: 1,
      easeFactor: 2.6,
      dueAt: new Date(params.now.getTime() + 86_400_000),
      lastRating: params.rating,
      version: 2,
    },
    dueRemaining: 0,
    checkIn: { checkInDate: params.now, createdAt: params.now },
  }));

  return {
    reviewSpy,
    listCards: async () => ({ rows: [card!], total: 1 }),
    findCardById: async () => card,
    findProgress: async () => progress,
    listDueCards: async () => ({ items: card ? [{ card, progress }] : [], remaining: card ? 1 : 0 }),
    createCard: async (userId: string, input: { category: string; front: string; back: string; tags: string[] }) =>
      cardRow({
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        source: "ugc",
        creatorId: userId,
        category: input.category,
        front: input.front,
        back: input.back,
        tags: input.tags,
      }),
    reviewCard: reviewSpy,
    listCheckIns: async () => ({ rows: [], total: 0 }),
  } as unknown as FlashcardRepository & { reviewSpy: ReturnType<typeof vi.fn> };
}

describe("FlashcardService.review", () => {
  it("rejects reviews for cards that are not yet due", async () => {
    const service = new FlashcardService(
      fakeRepository(cardRow(), progressRow({ dueAt: new Date("2999-01-01T00:00:00Z") })),
      "Asia/Shanghai",
    );

    await expect(
      service.review(USER_A, CARD_ID, { rating: "remembered", idempotencyKey: "key-12345678" }),
    ).rejects.toMatchObject({ code: ERROR_CODES.CARD_NOT_DUE, status: 409 });
  });

  it("reviews due cards and returns the check-in when nothing is left", async () => {
    const repository = fakeRepository(cardRow(), progressRow());
    const service = new FlashcardService(repository, "Asia/Shanghai");

    const result = await service.review(USER_A, CARD_ID, {
      rating: "remembered",
      idempotencyKey: "key-12345678",
    });

    expect(repository.reviewSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_A,
        rating: "remembered",
        idempotencyKey: "key-12345678",
        timeZone: "Asia/Shanghai",
      }),
    );
    expect(result.progress.lastRating).toBe("remembered");
    expect(result.dueRemaining).toBe(0);
    expect(result.checkIn).not.toBeNull();
  });

  it("hides other users' cards with 404", async () => {
    const service = new FlashcardService(
      fakeRepository(cardRow({ source: "ugc", creatorId: "99999999-9999-4999-8999-999999999999" })),
      "Asia/Shanghai",
    );

    await expect(
      service.review(USER_A, CARD_ID, { rating: "remembered", idempotencyKey: "key-12345678" }),
    ).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND, status: 404 });
  });
});

describe("FlashcardService.create", () => {
  it("creates UGC cards owned by the caller", async () => {
    const service = new FlashcardService(fakeRepository(), "Asia/Shanghai");

    const card = await service.create(USER_A, {
      category: "english",
      front: "abandon",
      back: "放弃",
      tags: ["词汇"],
    });

    expect(card).toMatchObject({ source: "ugc", isMine: true, tags: ["词汇"] });
  });
});

describe("computeStreak", () => {
  it("counts consecutive days ending today or yesterday", () => {
    const today = new Date();
    const day = (offset: number): string =>
      new Date(today.getTime() - offset * 86_400_000).toISOString().slice(0, 10);

    expect(computeStreak([])).toBe(0);
    expect(computeStreak([day(0), day(1), day(2)])).toBe(3);
    expect(computeStreak([day(1), day(2)])).toBe(2);
    expect(computeStreak([day(2), day(3)])).toBe(0);
    expect(computeStreak([day(0), day(2)])).toBe(1);
  });
});
