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

export async function POST(request: Request): Promise<Response> {
  const secure = shouldUseSecureCookie();
  const clearedCookie = serializeClearedSessionCookie(secure);
  const response = await handleApiRequest(request, async (context) => {
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
