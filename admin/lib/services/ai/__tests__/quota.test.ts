import { describe, expect, it } from "vitest";

import { AppError, ERROR_CODES } from "../../../api/errors";
import { assertDailyQuota, usageDateFor } from "../quota";

describe("assertDailyQuota", () => {
  it("returns remaining quota for a fresh day", () => {
    expect(assertDailyQuota(null)).toBe(30);
    expect(assertDailyQuota({ callCount: 29, promptTokens: 0, completionTokens: 0 })).toBe(1);
  });

  it("throws 429 DAILY_LIMIT_EXCEEDED when the quota is exhausted", () => {
    try {
      assertDailyQuota({ callCount: 30, promptTokens: 0, completionTokens: 0 });

      throw new Error("should have thrown");
    } catch (error) {
      expect((error as AppError).code).toBe(ERROR_CODES.DAILY_LIMIT_EXCEEDED);
      expect((error as AppError).status).toBe(429);
    }
  });
});

describe("usageDateFor", () => {
  it("maps UTC instants to the Asia/Shanghai calendar day", () => {
    const beforeMidnight = new Date("2026-09-26T16:00:00Z");
    const afterMidnight = new Date("2026-09-26T15:59:00Z");

    expect(usageDateFor(beforeMidnight, "Asia/Shanghai").getUTCMonth()).toBe(8);
    expect(usageDateFor(beforeMidnight, "Asia/Shanghai").getUTCDate()).toBe(27);
    expect(usageDateFor(afterMidnight, "Asia/Shanghai").getUTCDate()).toBe(26);
  });
});
