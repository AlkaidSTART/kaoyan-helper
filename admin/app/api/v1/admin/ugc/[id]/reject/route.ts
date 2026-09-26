import { z } from "zod";

import { handleApiRequest } from "@/lib/api/handler";
import { readUuidParam } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { readAndValidateJson } from "@/lib/api/validation";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { AdminQuestionService } from "@/lib/services/admin/admin-question-service";
import { PrismaAdminQuestionRepository } from "@/lib/services/admin/prisma-admin-question-repository";

const rejectSchema = z.strictObject({
  reason: z.string().trim().min(1).max(500),
  version: z.number().int().min(1),
});

/** 驳回 UGC（契约 ADMIN-UGC-03）：reason 必填；仅 pending 可驳回。 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "admin:ugc:review");

    const { id } = await params;
    const input = await readAndValidateJson(request, rejectSchema);
    const service = new AdminQuestionService(new PrismaAdminQuestionRepository());
    const updated = await service.reject(
      actor,
      readUuidParam(id),
      { reason: input.reason, version: input.version },
      context.requestId,
    );

    return createSuccessResponse(context.requestId, updated);
  });
}
