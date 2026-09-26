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

export async function POST(request: Request): Promise<Response> {
  const secure = shouldUseSecureCookie();
  const response = await handleApiRequest(request, async (context) => {
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
