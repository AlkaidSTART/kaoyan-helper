import { describe, expect, it } from "vitest";

import { AppError, ERROR_CODES } from "../errors";
import {
  MemoryRateLimiter,
  consumeRateLimit,
  enforceRateLimit,
} from "../rate-limit";

describe("rate limiting", () => {
  it("allows requests within the fixed window", async () => {
    const limiter = new MemoryRateLimiter();

    await expect(
      limiter.consume("ip:127.0.0.1", { limit: 2, windowMs: 60_000, now: 1_000 }),
    ).resolves.toEqual({ allowed: true, remaining: 1, retryAfterSeconds: 0 });

    await expect(
      limiter.consume("ip:127.0.0.1", { limit: 2, windowMs: 60_000, now: 1_100 }),
    ).resolves.toEqual({ allowed: true, remaining: 0, retryAfterSeconds: 0 });
  });

  it("rejects requests over the limit and reports retry seconds", async () => {
    const limiter = new MemoryRateLimiter();

    await limiter.consume("user:1", { limit: 1, windowMs: 60_000, now: 1_000 });

    await expect(
      limiter.consume("user:1", { limit: 1, windowMs: 60_000, now: 11_000 }),
    ).resolves.toEqual({ allowed: false, remaining: 0, retryAfterSeconds: 50 });
  });

  it("keeps independent keys isolated", async () => {
    const limiter = new MemoryRateLimiter();

    await limiter.consume("key:a", { limit: 1, windowMs: 1_000, now: 0 });

    await expect(
      limiter.consume("key:b", { limit: 1, windowMs: 1_000, now: 0 }),
    ).resolves.toMatchObject({ allowed: true });
  });

  it("resets after the fixed window expires", async () => {
    const limiter = new MemoryRateLimiter();

    await limiter.consume("user:1", { limit: 1, windowMs: 1_000, now: 0 });

    await expect(
      limiter.consume("user:1", { limit: 1, windowMs: 1_000, now: 1_000 }),
    ).resolves.toMatchObject({ allowed: true, remaining: 0 });
  });

  it("maps an exceeded limit to a 429 AppError", () => {
    expect(() =>
      enforceRateLimit({ allowed: false, remaining: 0, retryAfterSeconds: 9 }),
    ).toThrow(AppError);

    try {
      enforceRateLimit({ allowed: false, remaining: 0, retryAfterSeconds: 9 });
    } catch (error) {
      expect(error).toMatchObject({
        code: ERROR_CODES.RATE_LIMITED,
        status: 429,
        details: { retryAfterSeconds: 9 },
      });
    }
  });

  it("combines consume and enforce", async () => {
    const limiter = new MemoryRateLimiter();
    const options = { limit: 1, windowMs: 1_000, now: 0 };

    await expect(consumeRateLimit(limiter, "key", options)).resolves.toMatchObject({
      allowed: true,
    });
    await expect(consumeRateLimit(limiter, "key", options)).rejects.toMatchObject({
      code: ERROR_CODES.RATE_LIMITED,
    });
  });
});
