import { z } from "zod";

import { handleApiRequest } from "@/lib/api/handler";
import { createSuccessResponse } from "@/lib/api/response";
import { AuthService } from "@/lib/auth/auth-service";
import {
  applySessionCookie,
  readSessionCookie,
  serializeClearedSessionCookie,
  shouldUseSecureCookie,
} from "@/lib/auth/cookie";
import { PrismaAuthRepository } from "@/lib/auth/prisma-auth-repository";
import { PrismaUserSessionRepository } from "@/lib/auth/prisma-user-session-repository";
import { UserSessionService } from "@/lib/auth/user-session-service";
import { readOptionalAndValidateJson } from "@/lib/api/validation";

const logoutSchema = z.strictObject({
  refreshToken: z.string().min(1).max(128).optional(),
});

export async function POST(request: Request): Promise<Response> {
  const secure = shouldUseSecureCookie();
  const clearedCookie = serializeClearedSessionCookie(secure);
  const response = await handleApiRequest(request, async (context) => {
    const body = await readOptionalAndValidateJson(request, logoutSchema);

    // Flutter 分支：撤销用户会话；缺失/无效 refreshToken 保持幂等成功。
    if (body?.refreshToken) {
      const service = new UserSessionService({
        repository: new PrismaUserSessionRepository(),
      });

      await service.logout(body.refreshToken);

      return createSuccessResponse(context.requestId, null);
    }

    // Admin 分支：撤销 Cookie 会话并清除 Cookie；重复退出保持幂等。
    const service = new AuthService({
      repository: new PrismaAuthRepository(),
    });

    await service.logout(readSessionCookie(request.headers.get("cookie")));

    return applySessionCookie(createSuccessResponse(context.requestId, null), clearedCookie);
  });

  if (response.status >= 400) {
    applySessionCookie(response, clearedCookie);
  }

  return response;
}
