import { z } from "zod";

import { handleApiRequest } from "@/lib/api/handler";
import { readUuidParam } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { readAndValidateJson } from "@/lib/api/validation";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { MistakeService } from "@/lib/services/mistakes/mistake-service";
import { PrismaMistakeRepository } from "@/lib/services/mistakes/prisma-mistake-repository";

const statusSchema = z.strictObject({
  status: z.literal("active"),
  version: z.number().int().min(1),
});

/** MIS-04 仅允许 mastered -> active，同时清零连对与掌握时间。 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "mistake:write:own");

    const { id } = await params;
    const body = await readAndValidateJson(request, statusSchema);
    const service = new MistakeService(new PrismaMistakeRepository());
    const mistake = await service.reactivate(
      actor.user.id,
      readUuidParam(id),
      body.status,
      body.version,
    );

    return createSuccessResponse(context.requestId, mistake);
  });
}
