import { handleApiRequest } from "@/lib/api/handler";
import { readUuidParam } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { AdminUserService } from "@/lib/services/admin/admin-user-service";
import { PrismaAdminUserRepository } from "@/lib/services/admin/prisma-admin-user-repository";

/** 用户详情 + 学习统计（契约 ADMIN-USER-02）。 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "admin:users:read");

    const { id } = await params;
    const service = new AdminUserService(new PrismaAdminUserRepository());
    const detail = await service.getDetail(actor, readUuidParam(id));

    return createSuccessResponse(context.requestId, detail);
  });
}
