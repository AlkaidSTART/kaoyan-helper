import { z } from "zod";

import { handleApiRequest } from "@/lib/api/handler";
import { readUuidParam } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { readAndValidateJson } from "@/lib/api/validation";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { MistakeService } from "@/lib/services/mistakes/mistake-service";
import { PrismaMistakeRepository } from "@/lib/services/mistakes/prisma-mistake-repository";

const redoSchema = z.strictObject({
  answer: z.string().trim().min(1).max(200),
  attemptId: z.uuid(),
});

/** MIS-03 服务端判题并推进错题状态机；连对达到 2 进入 mastered。 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "mistake:write:own");

    const { id } = await params;
    const input = await readAndValidateJson(request, redoSchema);
    const service = new MistakeService(new PrismaMistakeRepository());
    const result = await service.redo(actor.user.id, readUuidParam(id), {
      answer: input.answer,
      attemptId: input.attemptId,
    });

    return createSuccessResponse(context.requestId, result);
  });
}
