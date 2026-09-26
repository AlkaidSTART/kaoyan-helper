import { z } from "zod";

import { AppError, ERROR_CODES } from "@/lib/api/errors";
import { handleApiRequest } from "@/lib/api/handler";
import { readUuidParam, searchParamsToObject } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { readAndValidateJson } from "@/lib/api/validation";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { AdminSchoolService } from "@/lib/services/admin/admin-school-service";
import { PrismaAdminSchoolRepository } from "@/lib/services/admin/prisma-admin-school-repository";

const programSchema = z.strictObject({
  majorCode: z.string().trim().min(1).max(20),
  majorName: z.string().trim().min(1).max(100),
  year: z.number().int().min(1990).max(2100),
  studyMode: z.string().trim().min(1).max(50).nullish(),
  planEnrollment: z.number().int().min(0).max(100_000).nullish(),
  minScore: z.number().min(0).max(1_000).nullish(),
  avgScore: z.number().min(0).max(1_000).nullish(),
  isPublished: z.boolean().default(false),
});

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

/** 专业列表（契约 ADMIN-SCH-08）：不分页返回全部（含未发布），year 可选筛选。 */
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

/** 专业年度数据 upsert（契约 ADMIN-SCH-04）：schoolId+majorCode+year 唯一。 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "admin:schools:write");

    const { id } = await params;
    const input = await readAndValidateJson(request, programSchema);
    const service = new AdminSchoolService(new PrismaAdminSchoolRepository());
    const program = await service.upsertProgram(
      actor,
      readUuidParam(id),
      {
        majorCode: input.majorCode,
        majorName: input.majorName,
        year: input.year,
        studyMode: input.studyMode ?? null,
        planEnrollment: input.planEnrollment ?? null,
        minScore: input.minScore ?? null,
        avgScore: input.avgScore ?? null,
        isPublished: input.isPublished,
      },
      context.requestId,
    );

    return createSuccessResponse(context.requestId, program);
  });
}
