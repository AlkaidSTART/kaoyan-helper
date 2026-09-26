import { AppError, ERROR_CODES } from "@/lib/api/errors";
import { handleApiRequest } from "@/lib/api/handler";
import { searchParamsToObject } from "@/lib/api/params";
import { getActor, requirePermission } from "@/lib/auth/actor";
import {
  DEFAULT_DUE_LIMIT,
  MAX_DUE_LIMIT,
  FlashcardService,
} from "@/lib/services/flashcards/flashcard-service";
import { PrismaFlashcardRepository } from "@/lib/services/flashcards/prisma-flashcard-repository";

/** FC-01 到期卡片：limit 1~50，默认 20。 */
export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const actor = await getActor(request);

    requirePermission(actor, "flashcard:read");

    const { limit } = searchParamsToObject(request.url);
    let dueLimit = DEFAULT_DUE_LIMIT;

    if (limit !== undefined) {
      const parsed = Number(limit);

      if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_DUE_LIMIT) {
        throw new AppError(ERROR_CODES.VALIDATION_FAILED, { details: { field: "limit" } });
      }

      dueLimit = parsed;
    }

    const service = new FlashcardService(new PrismaFlashcardRepository(), "Asia/Shanghai");

    return service.listDue(actor.user.id, dueLimit);
  });
}
