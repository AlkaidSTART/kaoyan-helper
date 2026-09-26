import { createPaginationMeta, parsePagination } from "@/lib/api/pagination";
import { handleApiRequest } from "@/lib/api/handler";
import { readDateParam, searchParamsToObject } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { FlashcardService } from "@/lib/services/flashcards/flashcard-service";
import { PrismaFlashcardRepository } from "@/lib/services/flashcards/prisma-flashcard-repository";

/** FC-05 打卡记录仅本人可见；from/to 为 YYYY-MM-DD（含边界）。 */
export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "flashcard:read");

    const query = searchParamsToObject(request.url);
    const pagination = parsePagination(new URL(request.url));
    const service = new FlashcardService(new PrismaFlashcardRepository(), "Asia/Shanghai");
    const { rows, total, streakDays } = await service.listCheckIns(
      actor.user.id,
      readDateParam(query.from ?? null, "from"),
      readDateParam(query.to ?? null, "to"),
      pagination.page,
      pagination.pageSize,
    );

    return createSuccessResponse(
      context.requestId,
      { items: rows, streakDays },
      { pagination: createPaginationMeta(pagination.page, pagination.pageSize, total) },
    );
  });
}
