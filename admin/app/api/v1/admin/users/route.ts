import { handleApiRequest } from "@/lib/api/handler";
import { createPaginationMeta, parsePagination } from "@/lib/api/pagination";
import { searchParamsToObject } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { AdminUserService } from "@/lib/services/admin/admin-user-service";
import { PrismaAdminUserRepository } from "@/lib/services/admin/prisma-admin-user-repository";

/** 用户列表（契约 ADMIN-USER-01）：搜索邮箱/昵称，角色与封禁状态筛选。 */
export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "admin:users:read");

    const query = searchParamsToObject(request.url);
    const pagination = parsePagination(new URL(request.url));
    const service = new AdminUserService(new PrismaAdminUserRepository());
    const { rows, total } = await service.list(
      actor,
      {
        keyword: query.keyword?.trim() || null,
        role: query.role?.trim() || null,
        isBanned:
          query.isBanned === "true" ? true : query.isBanned === "false" ? false : null,
      },
      pagination.page,
      pagination.pageSize,
    );

    return createSuccessResponse(context.requestId, rows, {
      pagination: createPaginationMeta(pagination.page, pagination.pageSize, total),
    });
  });
}
