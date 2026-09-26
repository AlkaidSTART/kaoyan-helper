import { z } from "zod";

import { handleApiRequest } from "@/lib/api/handler";
import { readUuidParam } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { readAndValidateJson } from "@/lib/api/validation";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { AdminUserService } from "@/lib/services/admin/admin-user-service";
import { PrismaAdminUserRepository } from "@/lib/services/admin/prisma-admin-user-repository";

const unbanSchema = z.strictObject({
  reason: z.string().trim().min(1).max(500),
});

/** 解封用户（契约 ADMIN-USER-04）：幂等，重复调用返回当前状态。 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "admin:users:ban");

    const { id } = await params;
    const input = await readAndValidateJson(request, unbanSchema);
    const service = new AdminUserService(new PrismaAdminUserRepository());
    const detail = await service.unban(actor, readUuidParam(id), {
      reason: input.reason,
      requestId: context.requestId,
    });

    return createSuccessResponse(context.requestId, detail);
  });
}
