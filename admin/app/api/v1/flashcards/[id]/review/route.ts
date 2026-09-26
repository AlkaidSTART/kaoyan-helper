import { z } from "zod";

import { handleApiRequest } from "@/lib/api/handler";
import { readUuidParam } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { readAndValidateJson } from "@/lib/api/validation";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { PrismaActivityRecorder } from "@/lib/services/activity/prisma-activity-recorder";
import { FlashcardService } from "@/lib/services/flashcards/flashcard-service";
import { PrismaFlashcardRepository } from "@/lib/services/flashcards/prisma-flashcard-repository";

const reviewSchema = z.strictObject({
  rating: z.enum(["forgot", "fuzzy", "remembered"]),
  idempotencyKey: z.string().trim().min(8).max(128),
});

/** FC-04 SM-2 计算完全在服务端事务内执行；同一 idempotencyKey 幂等返回首次结果。 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "flashcard:review:own");

    const { id } = await params;
    const input = await readAndValidateJson(request, reviewSchema);
    const service = new FlashcardService(
      new PrismaFlashcardRepository(),
      "Asia/Shanghai",
      new PrismaActivityRecorder(),
    );
    const result = await service.review(actor.user.id, readUuidParam(id), {
      rating: input.rating,
      idempotencyKey: input.idempotencyKey,
    });

    return createSuccessResponse(context.requestId, result);
  });
}
