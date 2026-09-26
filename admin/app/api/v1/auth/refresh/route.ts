import { z } from "zod";

import { handleApiRequest } from "@/lib/api/handler";
import { createSuccessResponse } from "@/lib/api/response";
import { AuthService } from "@/lib/auth/auth-service";
import {
  applySessionCookie,
  readSessionCookie,
  serializeClearedSessionCookie,
  serializeSessionCookie,
  shouldUseSecureCookie,
} from "@/lib/auth/cookie";
import { PrismaAuthRepository } from "@/lib/auth/prisma-auth-repository";
import { PrismaUserSessionRepository } from "@/lib/auth/prisma-user-session-repository";
import { UserSessionService } from "@/lib/auth/user-session-service";
import { readOptionalAndValidateJson } from "@/lib/api/validation";

const refreshSchema = z.strictObject({
  refreshToken: z.string().min(1).max(128).optional(),
});

export async function POST(request: Request): Promise<Response> {
  const secure = shouldUseSecureCookie();
  const response = await handleApiRequest(request, async (context) => {
    const body = await readOptionalAndValidateJson(request, refreshSchema);

    // Flutter 分支：body 携带 refreshToken，返回新 token 对。
    if (body?.refreshToken) {
      const service = new UserSessionService({
        repository: new PrismaUserSessionRepository(),
      });
      const tokens = await service.refresh(body.refreshToken);

      return createSuccessResponse(context.requestId, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        tokenType: "Bearer",
      });
    }

    // Admin 分支：从 HttpOnly Cookie 轮换会话。
    const service = new AuthService({
      repository: new PrismaAuthRepository(),
    });
    const result = await service.refresh(readSessionCookie(request.headers.get("cookie")));

    return applySessionCookie(
      createSuccessResponse(context.requestId, { expiresIn: result.expiresIn }),
      serializeSessionCookie({
        token: result.token,
        maxAgeSeconds: result.expiresIn,
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
