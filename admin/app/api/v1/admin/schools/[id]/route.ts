import { z } from "zod";

import { handleApiRequest } from "@/lib/api/handler";
import { readUuidParam } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { readAndValidateJson } from "@/lib/api/validation";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { AdminSchoolService } from "@/lib/services/admin/admin-school-service";
import { PrismaAdminSchoolRepository } from "@/lib/services/admin/prisma-admin-school-repository";

const updateSchoolSchema = z.strictObject({
  name: z.string().trim().min(1).max(100).optional(),
  province: z.string().trim().min(1).max(50).nullish(),
  region: z.string().trim().min(1).max(50).nullish(),
  is985: z.boolean().optional(),
  is211: z.boolean().optional(),
  isDoubleFirstClass: z.boolean().optional(),
  isSelfMarking: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  version: z.number().int().min(1),
});

/** 院校更新（契约 ADMIN-SCH-03）：乐观锁 version；审计。 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "admin:schools:write");

    const { id } = await params;
    const input = await readAndValidateJson(request, updateSchoolSchema);
    const service = new AdminSchoolService(new PrismaAdminSchoolRepository());
    const updated = await service.update(
      actor,
      readUuidParam(id),
      {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.province !== undefined ? { province: input.province ?? null } : {}),
        ...(input.region !== undefined ? { region: input.region ?? null } : {}),
        ...(input.is985 !== undefined ? { is985: input.is985 } : {}),
        ...(input.is211 !== undefined ? { is211: input.is211 } : {}),
        ...(input.isDoubleFirstClass !== undefined
          ? { isDoubleFirstClass: input.isDoubleFirstClass }
          : {}),
        ...(input.isSelfMarking !== undefined
          ? { isSelfMarking: input.isSelfMarking }
          : {}),
        ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
        version: input.version,
      },
      context.requestId,
    );

    return createSuccessResponse(context.requestId, updated);
  });
}
