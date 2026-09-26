import { handleApiRequest } from "@/lib/api/handler";
import { searchParamsToObject } from "@/lib/api/params";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { DashboardService } from "@/lib/services/dashboard/dashboard-service";
import { PrismaDashboardRepository } from "@/lib/services/dashboard/prisma-dashboard-repository";

export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const actor = await getActor(request);

    requirePermission(actor, "dashboard:self:read");

    const { timezone } = searchParamsToObject(request.url);
    const service = new DashboardService(new PrismaDashboardRepository());

    return service.getSummary(
      {
        id: actor.user.id,
        email: actor.user.email,
        nickname: actor.user.nickname,
        examYear: actor.user.examYear,
      },
      timezone ?? "Asia/Shanghai",
    );
  });
}
