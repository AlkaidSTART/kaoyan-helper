import { handleApiRequest } from "@/lib/api/handler";
import { readUuidParam } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { AdminQuestionService } from "@/lib/services/admin/admin-question-service";
import { PrismaAdminQuestionRepository } from "@/lib/services/admin/prisma-admin-question-repository";

/** 完整题目详情（契约 ADMIN-Q-02）：含答案、解析与审核字段；只读，不提供编辑。 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "admin:questions:read");

    const { id } = await params;
    const service = new AdminQuestionService(new PrismaAdminQuestionRepository());
    const detail = await service.getDetail(actor, readUuidParam(id));

    return createSuccessResponse(context.requestId, detail);
  });
}
