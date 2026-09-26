import { z } from "zod";

import { handleApiRequest } from "@/lib/api/handler";
import { createSuccessResponse } from "@/lib/api/response";
import { MemoryRateLimiter, consumeRateLimit } from "@/lib/api/rate-limit";
import { readAndValidateJson } from "@/lib/api/validation";
import { EmailCodeAuthService } from "@/lib/auth/email-code-auth-service";
import { SupabaseEmailOtpClient } from "@/lib/auth/otp-client";
import { PrismaAuthRepository } from "@/lib/auth/prisma-auth-repository";
import { PrismaUserSessionRepository } from "@/lib/auth/prisma-user-session-repository";

const sendCodeSchema = z.strictObject({
  email: z.email().max(320),
  purpose: z.literal("login"),
});

const emailRateLimiter = new MemoryRateLimiter();
const ipRateLimiter = new MemoryRateLimiter();

/** 发送频率：同一邮箱 60s 一条，同一 IP 每分钟最多 10 条。 */
const EMAIL_SEND_WINDOW_MS = 60_000;
const IP_SEND_WINDOW_MS = 60_000;
const IP_SEND_LIMIT = 10;

function readClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");

  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const input = await readAndValidateJson(request, sendCodeSchema);
    const normalizedEmail = input.email.trim().toLowerCase();

    await consumeRateLimit(ipRateLimiter, `send-code:ip:${readClientIp(request)}`, {
      limit: IP_SEND_LIMIT,
      windowMs: IP_SEND_WINDOW_MS,
    });
    await consumeRateLimit(emailRateLimiter, `send-code:email:${normalizedEmail}`, {
      limit: 1,
      windowMs: EMAIL_SEND_WINDOW_MS,
    });

    const service = new EmailCodeAuthService({
      otpClient: new SupabaseEmailOtpClient(),
      userRepository: new PrismaUserSessionRepository(),
      adminSessionRepository: new PrismaAuthRepository(),
    });
    const result = await service.sendCode(normalizedEmail);

    return createSuccessResponse(context.requestId, {
      expiresInSeconds: result.expiresInSeconds,
      retryAfterSeconds: result.retryAfterSeconds,
    });
  });
}
