import { handleApiRequest } from "@/lib/api/handler";
import { AuthService } from "@/lib/auth/auth-service";
import { readSessionCookie } from "@/lib/auth/cookie";
import { PrismaAuthRepository } from "@/lib/auth/prisma-auth-repository";

export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const service = new AuthService({
      repository: new PrismaAuthRepository(),
    });

    return service.getSession(readSessionCookie(request.headers.get("cookie")));
  });
}
