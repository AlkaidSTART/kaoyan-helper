import { z } from "zod";

import { handleApiRequest } from "@/lib/api/handler";
import { readUuidParam } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { readAndValidateJson } from "@/lib/api/validation";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { AdminSchoolService } from "@/lib/services/admin/admin-school-service";
import { PrismaAdminSchoolRepository } from "@/lib/services/admin/prisma-admin-school-repository";

const updateProgramSchema = z.strictObject({
  majorName: z.string().trim().min(1).max(100).optional(),
  studyMode: z.string().trim().min(1).max(50).nullish(),
  planEnrollment: z.number().int().min(0).max(100_000).nullish(),
  minScore: z.number().min(0).max(1_000).nullish(),
  avgScore: z.number().min(0).max(1_000).nullish(),
  isPublished: z.boolean().optional(),
  version: z.number().int().min(1),
});

/** 专业记录更新（契约 ADMIN-SCH-05）：乐观锁 version。 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; programId: string }> },
): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "admin:schools:write");

    const { id, programId } = await params;
    const input = await readAndValidateJson(request, updateProgramSchema);
    const service = new AdminSchoolService(new PrismaAdminSchoolRepository());
    const program = await service.updateProgram(
      actor,
      readUuidParam(id),
      readUuidParam(programId),
      {
        ...(input.majorName !== undefined ? { majorName: input.majorName } : {}),
        ...(input.studyMode !== undefined ? { studyMode: input.studyMode ?? null } : {}),
        ...(input.planEnrollment !== undefined
          ? { planEnrollment: input.planEnrollment ?? null }
          : {}),
        ...(input.minScore !== undefined ? { minScore: input.minScore ?? null } : {}),
        ...(input.avgScore !== undefined ? { avgScore: input.avgScore ?? null } : {}),
        ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
        version: input.version,
      },
      context.requestId,
    );

    return createSuccessResponse(context.requestId, program);
  });
}
