import { AppError, ERROR_CODES } from "@/lib/api/errors";
import { handleApiRequest } from "@/lib/api/handler";
import { createPaginationMeta, parsePagination } from "@/lib/api/pagination";
import { isValidUuid, searchParamsToObject } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { AdminActivityService } from "@/lib/services/admin/admin-activity-service";
import { PrismaAdminActivityRepository } from "@/lib/services/admin/prisma-admin-activity-repository";
import { ACTIVITY_TYPES } from "@/lib/services/activity/activity-recorder";

/** 用户活动查询（契约 ADMIN-ACT-01）：userId/type 筛选，固定 createdAt 倒序；只读。 */
export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "admin:activity:read");

    const query = searchParamsToObject(request.url);
    const pagination = parsePagination(new URL(request.url));
    const userId = query.userId?.trim() || null;
    const type = query.type?.trim() || null;

    if (userId !== null && !isValidUuid(userId)) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, { details: { field: "userId" } });
    }

    if (type !== null && !ACTIVITY_TYPES.includes(type as never)) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, { details: { field: "type" } });
    }

    const service = new AdminActivityService(new PrismaAdminActivityRepository());
    const { rows, total } = await service.list(
      actor,
      { userId, type },
      pagination.page,
      pagination.pageSize,
    );

    return createSuccessResponse(context.requestId, rows, {
      pagination: createPaginationMeta(pagination.page, pagination.pageSize, total),
    });
  });
}
