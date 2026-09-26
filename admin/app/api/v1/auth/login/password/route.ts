import { z } from "zod";

import { handleApiRequest } from "@/lib/api/handler";
import { createSuccessResponse } from "@/lib/api/response";
import { readAndValidateJson } from "@/lib/api/validation";
import { AuthService } from "@/lib/auth/auth-service";
import {
  applySessionCookie,
  serializeClearedSessionCookie,
  serializeSessionCookie,
  shouldUseSecureCookie,
} from "@/lib/auth/cookie";
import { PrismaAuthRepository } from "@/lib/auth/prisma-auth-repository";
import { SESSION_TTL_SECONDS } from "@/lib/auth/session-token";

const passwordLoginSchema = z.strictObject({
  email: z.email().max(320),
  password: z.string().min(1).max(128),
  clientType: z.string().min(1).max(64),
  deviceName: z.string().trim().min(1).max(200).optional(),
});

export async function POST(request: Request): Promise<Response> {
  const secure = shouldUseSecureCookie();
  const response = await handleApiRequest(request, async (context) => {
    const input = await readAndValidateJson(request, passwordLoginSchema);
    const service = new AuthService({
      repository: new PrismaAuthRepository(),
    });
    const result = await service.loginWithPassword({
      email: input.email,
      password: input.password,
      clientType: input.clientType,
      deviceName: input.deviceName ?? null,
    });

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
