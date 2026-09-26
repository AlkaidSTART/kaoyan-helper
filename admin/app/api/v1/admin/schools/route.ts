import { z } from "zod";

import { handleApiRequest } from "@/lib/api/handler";
import { createPaginationMeta, parsePagination } from "@/lib/api/pagination";
import { searchParamsToObject } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { readAndValidateJson } from "@/lib/api/validation";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { AdminSchoolService } from "@/lib/services/admin/admin-school-service";
import { PrismaAdminSchoolRepository } from "@/lib/services/admin/prisma-admin-school-repository";

const createSchoolSchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
  province: z.string().trim().min(1).max(50).nullish(),
  region: z.string().trim().min(1).max(50).nullish(),
  is985: z.boolean().default(false),
  is211: z.boolean().default(false),
  isDoubleFirstClass: z.boolean().default(false),
  isSelfMarking: z.boolean().default(false),
  isPublished: z.boolean().default(false),
});

/** 院校列表（契约 ADMIN-SCH-01）：含未发布数据。 */
export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "admin:schools:read");

    const query = searchParamsToObject(request.url);
    const pagination = parsePagination(new URL(request.url));
    const service = new AdminSchoolService(new PrismaAdminSchoolRepository());
    const { rows, total } = await service.list(
      actor,
      {
        keyword: query.keyword?.trim() || null,
        province: query.province?.trim() || null,
        region: query.region?.trim() || null,
      },
      pagination.page,
      pagination.pageSize,
    );

    return createSuccessResponse(context.requestId, rows, {
      pagination: createPaginationMeta(pagination.page, pagination.pageSize, total),
    });
  });
}

/** 院校创建（契约 ADMIN-SCH-02）：校名唯一，冲突 409；审计。 */
export async function POST(request: Request): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "admin:schools:write");

    const input = await readAndValidateJson(request, createSchoolSchema);
    const service = new AdminSchoolService(new PrismaAdminSchoolRepository());
    const created = await service.create(
      actor,
      {
        name: input.name,
        province: input.province ?? null,
        region: input.region ?? null,
        is985: input.is985,
        is211: input.is211,
        isDoubleFirstClass: input.isDoubleFirstClass,
        isSelfMarking: input.isSelfMarking,
        isPublished: input.isPublished,
      },
      context.requestId,
    );

    return createSuccessResponse(context.requestId, created);
  });
}
