import { describe, expect, it } from "vitest";

import {
  calendarDayInTimeZone,
  calendarDayDifference,
  examStartOfDay,
  formatCalendarDay,
  isValidTimeZone,
} from "../time";

describe("time", () => {
  it("maps UTC instants to the timezone calendar day", () => {
    const utc = new Date("2026-09-26T17:30:00Z");

    expect(formatCalendarDay(calendarDayInTimeZone(utc, "Asia/Shanghai"))).toBe("2026-09-27");
    expect(formatCalendarDay(calendarDayInTimeZone(utc, "UTC"))).toBe("2026-09-26");
  });

  it("rejects invalid timezones", () => {
    expect(isValidTimeZone("Asia/Shanghai")).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
  });

  it("computes calendar day differences across DST-free zones", () => {
    const from = new Date("2026-09-26T10:00:00Z");
    const to = new Date("2026-12-21T00:00:00Z");

    expect(calendarDayDifference(from, to, "Asia/Shanghai")).toBe(86);
  });

  it("places the estimated exam start on Dec 21 of examYear - 1", () => {
    const start = examStartOfDay(2027, "Asia/Shanghai");

    expect(formatCalendarDay(calendarDayInTimeZone(start, "Asia/Shanghai"))).toBe("2026-12-21");
  });
});
