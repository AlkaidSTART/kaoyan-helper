import { createPaginationMeta, parsePagination } from "@/lib/api/pagination";
import { handleApiRequest } from "@/lib/api/handler";
import { searchParamsToObject } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { MistakeService, toMistakeDto } from "@/lib/services/mistakes/mistake-service";
import { PrismaMistakeRepository } from "@/lib/services/mistakes/prisma-mistake-repository";

export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "mistake:read:own");

    const query = searchParamsToObject(request.url);
    const pagination = parsePagination(new URL(request.url));
    const service = new MistakeService(new PrismaMistakeRepository());
    const { rows, total } = await service.list(
      actor.user.id,
      {
        status: query.status?.trim() === "mastered" ? "mastered" : query.status?.trim() === "active" ? "active" : null,
        subject: query.subject?.trim() || null,
      },
      pagination.page,
      pagination.pageSize,
    );

    return createSuccessResponse(
      context.requestId,
      rows.map((row) => toMistakeDto(row)),
      { pagination: createPaginationMeta(pagination.page, pagination.pageSize, total) },
    );
  });
}
