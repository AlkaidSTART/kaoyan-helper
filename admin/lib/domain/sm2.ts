export type CardRating = "forgot" | "fuzzy" | "remembered";

export interface Sm2ProgressInput {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
}

export interface Sm2Result {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  /** 下次到期时刻（UTC）；interval 为 0 时等于 now（立即重学）。 */
  dueAt: Date;
}

const MIN_EASE_FACTOR = 1.3;

/**
 * SM-2 计算（契约 §9，服务端唯一事实源）：
 * - forgot：interval=0、repetitions=0、ef=max(1.3, ef-0.2)。
 * - fuzzy：interval=1、repetitions=0、ef=max(1.3, ef-0.1)。
 * - remembered：首次 1 天；第二次 3 天；之后 round(prevInterval × ef)、repetitions++、ef+=0.1。
 */
export function computeSm2(
  progress: Sm2ProgressInput | null,
  rating: CardRating,
  now: Date,
): Sm2Result {
  const current = progress ?? { repetitions: 0, intervalDays: 0, easeFactor: 2.5 };

  if (rating === "forgot") {
    return {
      repetitions: 0,
      intervalDays: 0,
      easeFactor: Math.max(MIN_EASE_FACTOR, round2(current.easeFactor - 0.2)),
      dueAt: now,
    };
  }

  if (rating === "fuzzy") {
    return {
      repetitions: 0,
      intervalDays: 1,
      easeFactor: Math.max(MIN_EASE_FACTOR, round2(current.easeFactor - 0.1)),
      dueAt: addDays(now, 1),
    };
  }

  const intervalDays =
    current.repetitions === 0 ? 1 : current.repetitions === 1 ? 3 : Math.round(current.intervalDays * current.easeFactor);
  const easeFactor = round2(current.easeFactor + 0.1);

  return {
    repetitions: current.repetitions + 1,
    intervalDays,
    easeFactor,
    dueAt: addDays(now, intervalDays),
  };
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
