import { handleApiRequest } from "@/lib/api/handler";
import { createPaginationMeta, parsePagination } from "@/lib/api/pagination";
import { searchParamsToObject } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { AdminSchoolService } from "@/lib/services/admin/admin-school-service";
import { PrismaAdminSchoolRepository } from "@/lib/services/admin/prisma-admin-school-repository";

/** 院校列表（契约 ADMIN-SCH-01）：含未发布数据；只读，不提供创建与导入。 */
export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "admin:schools:read");

    const query = searchParamsToObject(request.url);
    const pagination = parsePagination(new URL(request.url));
    const service = new AdminSchoolService(new PrismaAdminSchoolRepository());
    const { rows, total } = await service.list(
      actor,
      {
        keyword: query.keyword?.trim() || null,
        province: query.province?.trim() || null,
        region: query.region?.trim() || null,
      },
      pagination.page,
      pagination.pageSize,
    );

    return createSuccessResponse(context.requestId, rows, {
      pagination: createPaginationMeta(pagination.page, pagination.pageSize, total),
    });
  });
}
