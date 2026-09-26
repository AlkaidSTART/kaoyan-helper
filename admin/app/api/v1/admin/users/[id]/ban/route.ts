import { z } from "zod";

import { handleApiRequest } from "@/lib/api/handler";
import { readUuidParam } from "@/lib/api/params";
import { AppError, ERROR_CODES } from "@/lib/api/errors";
import { createSuccessResponse } from "@/lib/api/response";
import { readAndValidateJson } from "@/lib/api/validation";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { AdminUserService } from "@/lib/services/admin/admin-user-service";
import { PrismaAdminUserRepository } from "@/lib/services/admin/prisma-admin-user-repository";

const banSchema = z.strictObject({
  reason: z.string().trim().min(1).max(500),
  expiresAt: z.string().trim().min(1).max(50).optional(),
});

/** 封禁用户（契约 ADMIN-USER-03）：不能封自己、不能封最后一名有效管理员。 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "admin:users:ban");

    const { id } = await params;
    const input = await readAndValidateJson(request, banSchema);
    const service = new AdminUserService(new PrismaAdminUserRepository());

    let expiresAt: Date | null = null;

    if (input.expiresAt !== undefined) {
      expiresAt = new Date(input.expiresAt);

      if (Number.isNaN(expiresAt.getTime())) {
        throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
          details: { field: "expiresAt" },
        });
      }
    }

    const detail = await service.ban(actor, readUuidParam(id), {
      reason: input.reason,
      expiresAt,
      requestId: context.requestId,
    });

    return createSuccessResponse(context.requestId, detail);
  });
}
