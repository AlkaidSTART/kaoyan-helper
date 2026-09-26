import { z } from "zod";

import { handleApiRequest } from "@/lib/api/handler";
import { readUuidParam } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { readAndValidateJson } from "@/lib/api/validation";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { MistakeService } from "@/lib/services/mistakes/mistake-service";
import { PrismaMistakeRepository } from "@/lib/services/mistakes/prisma-mistake-repository";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApiRequest(request, async () => {
    const actor = await getActor(request);

    requirePermission(actor, "mistake:read:own");

    const { id } = await params;
    const service = new MistakeService(new PrismaMistakeRepository());

    return service.getDetail(actor.user.id, readUuidParam(id));
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "mistake:write:own");

    const { id } = await params;
    const body = await readAndValidateJson(
      request,
      z.strictObject({ version: z.number().int().min(1) }),
    );
    const service = new MistakeService(new PrismaMistakeRepository());

    await service.remove(actor.user.id, readUuidParam(id), body.version);

    return createSuccessResponse(context.requestId, null);
  });
}
