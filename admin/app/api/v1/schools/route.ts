import { createPaginationMeta, parsePagination } from "@/lib/api/pagination";
import { handleApiRequest } from "@/lib/api/handler";
import { searchParamsToObject } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { SchoolService, toSchoolDto } from "@/lib/services/schools/school-service";
import { PrismaSchoolRepository } from "@/lib/services/schools/prisma-school-repository";

function optionalBool(value: string | undefined): boolean | null {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return null;
}

export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "school:read");

    const query = searchParamsToObject(request.url);
    const pagination = parsePagination(new URL(request.url));
    const service = new SchoolService(new PrismaSchoolRepository());
    const { rows, total } = await service.list(
      {
        keyword: query.keyword?.trim() || null,
        province: query.province?.trim() || null,
        region: query.region?.trim() || null,
        is985: optionalBool(query.is985),
        is211: optionalBool(query.is211),
        isDoubleFirstClass: optionalBool(query.isDoubleFirstClass),
        isSelfMarking: optionalBool(query.isSelfMarking),
        majorCode: query.majorCode?.trim() || null,
      },
      pagination.page,
      pagination.pageSize,
    );

    return createSuccessResponse(
      context.requestId,
      rows.map((row) => toSchoolDto(row)),
      { pagination: createPaginationMeta(pagination.page, pagination.pageSize, total) },
    );
  });
}
