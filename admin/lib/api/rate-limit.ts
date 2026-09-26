import { AppError, ERROR_CODES } from "./errors";

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  now?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  consume(key: string, options: RateLimitOptions): Promise<RateLimitResult>;
}

interface FixedWindow {
  count: number;
  resetAt: number;
}

export class MemoryRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, FixedWindow>();

  async consume(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
    assertPositiveInteger(options.limit, "limit");
    assertPositiveInteger(options.windowMs, "windowMs");

    const now = options.now ?? Date.now();

    if (!Number.isSafeInteger(now) || now < 0) {
      throw new RangeError("now must be a non-negative safe integer");
    }

    const existing = this.windows.get(key);
    const window = !existing || now >= existing.resetAt
      ? { count: 0, resetAt: now + options.windowMs }
      : existing;

    if (window.count >= options.limit) {
      this.windows.set(key, window);

      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil((window.resetAt - now) / 1_000)),
      };
    }

    window.count += 1;
    this.windows.set(key, window);

    return {
      allowed: true,
      remaining: Math.max(0, options.limit - window.count),
      retryAfterSeconds: 0,
    };
  }
}

export function enforceRateLimit(result: RateLimitResult): RateLimitResult {
  if (!result.allowed) {
    throw new AppError(ERROR_CODES.RATE_LIMITED, {
      details: { retryAfterSeconds: result.retryAfterSeconds },
    });
  }

  return result;
}

export async function consumeRateLimit(
  limiter: RateLimiter,
  key: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  return enforceRateLimit(await limiter.consume(key, options));
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
}
