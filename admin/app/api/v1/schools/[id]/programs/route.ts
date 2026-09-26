import { z } from "zod";

import { AppError, ERROR_CODES } from "@/lib/api/errors";

import { createPaginationMeta, parsePagination } from "@/lib/api/pagination";
import { handleApiRequest } from "@/lib/api/handler";
import { readUuidParam, searchParamsToObject } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { SchoolService, toProgramDto } from "@/lib/services/schools/school-service";
import { PrismaSchoolRepository } from "@/lib/services/schools/prisma-school-repository";

const yearRangeSchema = z
  .strictObject({
    yearFrom: z.coerce.number().int().min(1990).max(2100).optional(),
    yearTo: z.coerce.number().int().min(1990).max(2100).optional(),
  })
  .refine((value) => (value.yearFrom ?? 0) <= (value.yearTo ?? 9999), {
    message: "yearFrom must not exceed yearTo",
  });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "school:read");

    const { id } = await params;
    const query = searchParamsToObject(request.url);
    const range = readAndValidateSync(query);
    const pagination = parsePagination(new URL(request.url));
    const service = new SchoolService(new PrismaSchoolRepository());
    const { rows, total } = await service.listPrograms(
      readUuidParam(id),
      {
        majorCode: query.majorCode?.trim() || null,
        yearFrom: range.yearFrom ?? null,
        yearTo: range.yearTo ?? null,
      },
      pagination.page,
      pagination.pageSize,
    );

    return createSuccessResponse(
      context.requestId,
      rows.map((row) => toProgramDto(row)),
      { pagination: createPaginationMeta(pagination.page, pagination.pageSize, total) },
    );
  });
}

function readAndValidateSync(query: Record<string, string>): { yearFrom?: number; yearTo?: number } {
  const parsed = yearRangeSchema.safeParse({
    ...(query.yearFrom !== undefined ? { yearFrom: query.yearFrom } : {}),
    ...(query.yearTo !== undefined ? { yearTo: query.yearTo } : {}),
  });

  if (!parsed.success) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED);
  }

  return parsed.data;
}
