import { z } from "zod";

import { handleApiRequest } from "@/lib/api/handler";
import { readAndValidateJson } from "@/lib/api/validation";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { MeService } from "@/lib/services/me/me-service";
import { PrismaMeRepository } from "@/lib/services/me/prisma-me-repository";

const updateProfileSchema = z.strictObject({
  nickname: z.string().trim().min(1).max(50).nullish(),
  avatarUrl: z.string().url().max(2_048).nullish(),
  examYear: z.number().int().min(2020).max(2100).nullish(),
});

export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const actor = await getActor(request);

    requirePermission(actor, "user:self:read");

    const service = new MeService(new PrismaMeRepository());

    return service.getMe(actor.user.id);
  });
}

export async function PATCH(request: Request): Promise<Response> {
  return handleApiRequest(request, async () => {
    const actor = await getActor(request);

    requirePermission(actor, "user:self:update");

    const input = await readAndValidateJson(request, updateProfileSchema, {
      // email/role/isBanned 等只读字段不允许客户端赋值。
      additionalImmutableFields: ["email", "bannedUntil"],
    });
    const service = new MeService(new PrismaMeRepository());

    return service.updateProfile(actor.user.id, {
      nickname: input.nickname ?? null,
      avatarUrl: input.avatarUrl ?? null,
      examYear: input.examYear ?? null,
    });
  });
}
