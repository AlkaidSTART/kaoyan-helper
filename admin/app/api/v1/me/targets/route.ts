import { z } from "zod";

import { handleApiRequest } from "@/lib/api/handler";
import { readAndValidateJson } from "@/lib/api/validation";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { MeService } from "@/lib/services/me/me-service";
import { PrismaMeRepository } from "@/lib/services/me/prisma-me-repository";

const targetSchema = z.strictObject({
  schoolId: z.uuid(),
  type: z.enum(["primary", "backup"]),
  majorCode: z.string().trim().min(1).max(20).nullish(),
  majorName: z.string().trim().min(1).max(100).nullish(),
});

const replaceTargetsSchema = z.strictObject({
  targets: z.array(targetSchema).max(3),
});

export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const actor = await getActor(request);

    requirePermission(actor, "user:target:read");

    const service = new MeService(new PrismaMeRepository());

    return service.getTargets(actor.user.id);
  });
}

export async function PATCH(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const actor = await getActor(request);

    requirePermission(actor, "user:target:write");

    const input = await readAndValidateJson(request, replaceTargetsSchema);
    const service = new MeService(new PrismaMeRepository());

    return service.replaceTargets(
      actor.user.id,
      input.targets.map((target) => ({
        schoolId: target.schoolId,
        type: target.type,
        majorCode: target.majorCode ?? null,
        majorName: target.majorName ?? null,
      })),
    );
  });
}
