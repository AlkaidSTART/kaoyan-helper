import { z } from "zod";

import { handleApiRequest } from "@/lib/api/handler";
import { readUuidParam } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { readAndValidateJson } from "@/lib/api/validation";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { SchoolService, toTargetDto } from "@/lib/services/schools/school-service";
import { PrismaSchoolRepository } from "@/lib/services/schools/prisma-school-repository";

const addTargetSchema = z.strictObject({
  type: z.enum(["primary", "backup"]),
  majorCode: z.string().trim().min(1).max(20).nullish(),
  majorName: z.string().trim().min(1).max(100).nullish(),
});

const removeTargetSchema = z.strictObject({
  type: z.enum(["primary", "backup"]),
  majorCode: z.string().trim().min(1).max(20).nullish(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "user:target:write");

    const { id } = await params;
    const input = await readAndValidateJson(request, addTargetSchema);
    const service = new SchoolService(new PrismaSchoolRepository());
    const { targets } = await service.addTarget(actor.user.id, readUuidParam(id), {
      type: input.type,
      majorCode: input.majorCode ?? null,
      majorName: input.majorName ?? null,
    });

    return createSuccessResponse(context.requestId, { targets: targets.map(toTargetDto) });
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "user:target:write");

    const { id } = await params;
    const input = await readAndValidateJson(request, removeTargetSchema);
    const service = new SchoolService(new PrismaSchoolRepository());
    const { targets } = await service.removeTarget(
      actor.user.id,
      readUuidParam(id),
      input.type,
      input.majorCode ?? null,
    );

    return createSuccessResponse(context.requestId, { targets: targets.map(toTargetDto) });
  });
}
