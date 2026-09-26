import { handleApiRequest } from "@/lib/api/handler";
import { createPaginationMeta, parsePagination } from "@/lib/api/pagination";
import { searchParamsToObject } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { AdminQuestionService } from "@/lib/services/admin/admin-question-service";
import { PrismaAdminQuestionRepository } from "@/lib/services/admin/prisma-admin-question-repository";

/** UGC 审核队列（契约 ADMIN-UGC-01）：默认 pending，含提交者摘要。 */
export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "admin:ugc:read");

    const query = searchParamsToObject(request.url);
    const pagination = parsePagination(new URL(request.url));
    const service = new AdminQuestionService(new PrismaAdminQuestionRepository());
    const { rows, total } = await service.listUgc(
      actor,
      {
        reviewStatus: query.reviewStatus?.trim() || null,
        source: query.source?.trim() || null,
      },
      pagination.page,
      pagination.pageSize,
    );

    return createSuccessResponse(context.requestId, rows, {
      pagination: createPaginationMeta(pagination.page, pagination.pageSize, total),
    });
  });
}
