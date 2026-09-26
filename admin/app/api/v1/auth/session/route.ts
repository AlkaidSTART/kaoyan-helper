import { handleApiRequest } from "@/lib/api/handler";
import { AuthService } from "@/lib/auth/auth-service";
import { actorFromSession, actorFromUserSession } from "@/lib/auth/actor";
import { readBearerToken } from "@/lib/auth/bearer";
import { readSessionCookie } from "@/lib/auth/cookie";
import { PrismaAuthRepository } from "@/lib/auth/prisma-auth-repository";
import { PrismaUserSessionRepository } from "@/lib/auth/prisma-user-session-repository";
import { UserSessionService } from "@/lib/auth/user-session-service";

export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const bearerToken = readBearerToken(request);

    // Flutter 分支：Bearer access token。
    if (bearerToken !== null) {
      const service = new UserSessionService({
        repository: new PrismaUserSessionRepository(),
      });

      return actorFromUserSession(await service.getSession(bearerToken));
    }

    // Admin 分支：HttpOnly Cookie。
    const service = new AuthService({
      repository: new PrismaAuthRepository(),
    });

    return actorFromSession(
      await service.getSession(readSessionCookie(request.headers.get("cookie"))),
    );
  });
}
