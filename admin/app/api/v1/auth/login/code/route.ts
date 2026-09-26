import { z } from "zod";

import { handleApiRequest } from "@/lib/api/handler";
import { createSuccessResponse } from "@/lib/api/response";
import { MemoryRateLimiter, consumeRateLimit } from "@/lib/api/rate-limit";
import { readAndValidateJson } from "@/lib/api/validation";
import { EmailCodeAuthService } from "@/lib/auth/email-code-auth-service";
import {
  applySessionCookie,
  serializeClearedSessionCookie,
  serializeSessionCookie,
  shouldUseSecureCookie,
} from "@/lib/auth/cookie";
import { SupabaseEmailOtpClient } from "@/lib/auth/otp-client";
import { PrismaAuthRepository } from "@/lib/auth/prisma-auth-repository";
import { PrismaUserSessionRepository } from "@/lib/auth/prisma-user-session-repository";
import { SESSION_TTL_SECONDS } from "@/lib/auth/session-token";

const loginCodeSchema = z.strictObject({
  email: z.email().max(320),
  code: z.string().trim().regex(/^\d{6}$/),
  clientType: z.enum(["flutter", "admin-web"]),
  deviceName: z.string().trim().min(1).max(200).optional(),
});

const ipRateLimiter = new MemoryRateLimiter();

const LOGIN_IP_WINDOW_MS = 60_000;
const LOGIN_IP_LIMIT = 20;

function readClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");

  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request): Promise<Response> {
  const secure = shouldUseSecureCookie();
  const response = await handleApiRequest(request, async (context) => {
    const input = await readAndValidateJson(request, loginCodeSchema);

    await consumeRateLimit(ipRateLimiter, `login-code:ip:${readClientIp(request)}`, {
      limit: LOGIN_IP_LIMIT,
      windowMs: LOGIN_IP_WINDOW_MS,
    });

    const service = new EmailCodeAuthService({
      otpClient: new SupabaseEmailOtpClient(),
      userRepository: new PrismaUserSessionRepository(),
      adminSessionRepository: new PrismaAuthRepository(),
    });
    const result = await service.loginWithCode({
      email: input.email,
      code: input.code,
      clientType: input.clientType,
      deviceName: input.deviceName ?? null,
    });

    if (result.mode === "flutter") {
      return createSuccessResponse(context.requestId, {
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        expiresIn: result.tokens.expiresIn,
        tokenType: "Bearer",
        user: result.user,
        permissions: result.permissions,
      });
    }

    return applySessionCookie(
      createSuccessResponse(context.requestId, { user: result.user }),
      serializeSessionCookie({
        token: result.token,
        maxAgeSeconds: SESSION_TTL_SECONDS,
        expiresAt: result.expiresAt,
        secure,
      }),
    );
  });

  if (response.status >= 400) {
    applySessionCookie(response, serializeClearedSessionCookie(secure));
  }

  return response;
}
