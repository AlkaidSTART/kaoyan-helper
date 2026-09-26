import { AppError, ERROR_CODES } from "@/lib/api/errors";
import { handleApiRequest } from "@/lib/api/handler";
import { readUuidParam, searchParamsToObject } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { AdminSchoolService } from "@/lib/services/admin/admin-school-service";
import { PrismaAdminSchoolRepository } from "@/lib/services/admin/prisma-admin-school-repository";

function parseYearFilter(raw: string | null): number | null {
  if (raw === null || raw.trim() === "") {
    return null;
  }

  const year = Number(raw);

  if (!Number.isInteger(year) || year < 1990 || year > 2100) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, { details: { field: "year" } });
  }

  return year;
}

/** 专业列表（契约 ADMIN-SCH-08）：不分页返回全部（含未发布），year 可选筛选；只读。 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "admin:schools:read");

    const { id } = await params;
    const query = searchParamsToObject(request.url);
    const service = new AdminSchoolService(new PrismaAdminSchoolRepository());
    const { rows } = await service.listPrograms(
      actor,
      readUuidParam(id),
      parseYearFilter(query.year ?? null),
    );

    return createSuccessResponse(context.requestId, rows);
  });
}
