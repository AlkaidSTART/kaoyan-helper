import { handleApiRequest } from "@/lib/api/handler";
import { readUuidParam } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { AdminSchoolService } from "@/lib/services/admin/admin-school-service";
import { PrismaAdminSchoolRepository } from "@/lib/services/admin/prisma-admin-school-repository";

/** 导入确认（契约 ADMIN-SCH-07）：仅 validated 且未过期任务可确认。 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "admin:schools:write");

    const { jobId } = await params;
    const service = new AdminSchoolService(new PrismaAdminSchoolRepository());
    const result = await service.confirmImport(
      actor,
      readUuidParam(jobId),
      context.requestId,
    );

    return createSuccessResponse(context.requestId, result);
  });
}
