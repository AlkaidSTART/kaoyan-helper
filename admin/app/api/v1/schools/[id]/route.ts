import { handleApiRequest } from "@/lib/api/handler";
import { readUuidParam } from "@/lib/api/params";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { SchoolService } from "@/lib/services/schools/school-service";
import { PrismaSchoolRepository } from "@/lib/services/schools/prisma-school-repository";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApiRequest(request, async () => {
    const actor = await getActor(request);

    requirePermission(actor, "school:read");

    const { id } = await params;
    const service = new SchoolService(new PrismaSchoolRepository());

    return service.getDetail(readUuidParam(id));
  });
}
