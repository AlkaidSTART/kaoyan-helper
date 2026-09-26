import { handleApiRequest } from "@/lib/api/handler";
import { readDateParam, searchParamsToObject } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { AdminDashboardService } from "@/lib/services/admin/admin-dashboard-service";
import { PrismaAdminDashboardRepository } from "@/lib/services/admin/prisma-admin-dashboard-repository";

const DAY_MS = 86_400_000;
const DEFAULT_RANGE_DAYS = 7;

/** 管理看板聚合（契约 ADMIN-DASH-01）：默认最近 7 天（UTC 日界）。 */
export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "admin:dashboard:read");

    const query = searchParamsToObject(request.url);
    const today = new Date().toISOString().slice(0, 10);
    const defaultFrom = new Date(Date.now() - (DEFAULT_RANGE_DAYS - 1) * DAY_MS)
      .toISOString()
      .slice(0, 10);
    const service = new AdminDashboardService(new PrismaAdminDashboardRepository());
    const summary = await service.getSummary({
      from: readDateParam(query.from ?? null, "from") ?? defaultFrom,
      to: readDateParam(query.to ?? null, "to") ?? today,
      timeZone: query.timezone?.trim() || "Asia/Shanghai",
    });

    return createSuccessResponse(context.requestId, summary);
  });
}
