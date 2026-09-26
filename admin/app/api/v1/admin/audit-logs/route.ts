import { AppError, ERROR_CODES } from "@/lib/api/errors";
import { handleApiRequest } from "@/lib/api/handler";
import { createPaginationMeta, parsePagination } from "@/lib/api/pagination";
import { isValidUuid, searchParamsToObject } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { AdminAuditService } from "@/lib/services/admin/admin-audit-service";
import { PrismaAdminAuditRepository } from "@/lib/services/admin/prisma-admin-audit-repository";

/** 审计日志查询（契约 ADMIN-AUDIT-01）：action/resourceType/actorId 筛选，固定 createdAt 倒序。 */
export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "admin:audit:read");

    const query = searchParamsToObject(request.url);
    const pagination = parsePagination(new URL(request.url));
    const actorId = query.actorId?.trim() || null;

    if (actorId !== null && !isValidUuid(actorId)) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, { details: { field: "actorId" } });
    }

    const service = new AdminAuditService(new PrismaAdminAuditRepository());
    const { rows, total } = await service.list(
      actor,
      {
        action: query.action?.trim() || null,
        resourceType: query.resourceType?.trim() || null,
        actorId,
      },
      pagination.page,
      pagination.pageSize,
    );

    return createSuccessResponse(context.requestId, rows, {
      pagination: createPaginationMeta(pagination.page, pagination.pageSize, total),
    });
  });
}
