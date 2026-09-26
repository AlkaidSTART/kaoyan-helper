/** 默认业务时区：配额、打卡与倒计时均按中国标准时间计算自然日。 */
export const DEFAULT_TIMEZONE = "Asia/Shanghai";

/** 倒计时口径：初试日按 `examYear - 1` 年 12 月 21 日（时区当地日历日）估算。 */
export const EXAM_MONTH = 12;

export const EXAM_DAY = 21;

export interface CalendarDay {
  year: number;
  month: number;
  day: number;
}

/** 校验 IANA 时区名；非法时区由调用方映射 422 `VALIDATION_FAILED`。 */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });

    return true;
  } catch {
    return false;
  }
}

/** 把 UTC 时刻映射到目标时区的日历日（YYYY-MM-DD）。 */
export function calendarDayInTimeZone(date: Date, timeZone: string): CalendarDay {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const read = (type: string): number =>
    Number(parts.find((part) => part.type === type)?.value);

  return { year: read("year"), month: read("month"), day: read("day") };
}

export function formatCalendarDay(day: CalendarDay): string {
  return `${day.year}-${String(day.month).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`;
}

function toUtcFromCalendar(day: CalendarDay, timeZone: string): Date {
  // 用该时区当日 12:00 反推 UTC 时刻，避免 DST 边界偏移。
  const guess = Date.UTC(day.year, day.month - 1, day.day, 12, 0, 0);
  const offsetMinutes = getOffsetMinutes(new Date(guess), timeZone);

  return new Date(guess - offsetMinutes * 60_000);
}

function getOffsetMinutes(date: Date, timeZone: string): number {
  const day = calendarDayInTimeZone(date, timeZone);
  const asUtc = Date.UTC(day.year, day.month - 1, day.day, 12, 0, 0);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const read = (type: string): number =>
    Number(parts.find((part) => part.type === type)?.value);

  const asTz = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    read("hour") % 24,
    read("minute"),
    read("second"),
  );

  return (asTz - asUtc) / 60_000;
}

/** 目标时区当日起点的 UTC 时刻。 */
export function startOfDayInTimeZone(date: Date, timeZone: string): Date {
  const day = calendarDayInTimeZone(date, timeZone);

  return toUtcFromCalendar(day, timeZone);
}

/** 两个 UTC 时刻在目标时区的日历日差（右侧减左侧）。 */
export function calendarDayDifference(from: Date, to: Date, timeZone: string): number {
  const utcFrom = Date.UTC(
    calendarDayInTimeZone(from, timeZone).year,
    calendarDayInTimeZone(from, timeZone).month - 1,
    calendarDayInTimeZone(from, timeZone).day,
  );
  const utcTo = Date.UTC(
    calendarDayInTimeZone(to, timeZone).year,
    calendarDayInTimeZone(to, timeZone).month - 1,
    calendarDayInTimeZone(to, timeZone).day,
  );

  return Math.round((utcTo - utcFrom) / 86_400_000);
}

/** 初试日（目标时区当日起点）；`examYear` 为入学年份，考试在其前一年 12 月。 */
export function examStartOfDay(examYear: number, timeZone: string): Date {
  return toUtcFromCalendar(
    { year: examYear - 1, month: EXAM_MONTH, day: EXAM_DAY },
    timeZone,
  );
}
