import { z } from "zod";

import { handleApiRequest } from "@/lib/api/handler";
import { readUuidParam } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { readAndValidateJson } from "@/lib/api/validation";
import { getActor, requirePermission } from "@/lib/auth/actor";
import {
  AdminQuestionService,
  type QuestionOption,
} from "@/lib/services/admin/admin-question-service";
import { PrismaAdminQuestionRepository } from "@/lib/services/admin/prisma-admin-question-repository";

const questionOptionSchema = z.strictObject({
  key: z.string().trim().min(1).max(8),
  content: z.string().trim().min(1).max(2_000),
});

const updateQuestionSchema = z.strictObject({
  subject: z.string().trim().min(1).max(50).optional(),
  chapter: z.string().trim().min(1).max(100).nullish(),
  year: z.number().int().min(1990).max(2100).nullish(),
  type: z.enum(["single_choice", "multiple_choice", "judge", "fill_blank"]).optional(),
  stem: z.string().trim().min(1).max(4_000).optional(),
  options: z.array(questionOptionSchema).min(2).max(10).optional(),
  answer: z.string().trim().min(1).max(200).optional(),
  explanation: z.string().trim().min(1).max(4_000).nullish(),
  difficulty: z.enum(["easy", "medium", "hard"]).nullish(),
  visibility: z.enum(["private", "public"]).optional(),
  reviewStatus: z.enum(["pending", "approved", "rejected"]).optional(),
  version: z.number().int().min(1),
});

const deleteQuestionSchema = z.strictObject({
  reason: z.string().trim().min(1).max(500),
  version: z.number().int().min(1),
});

/** 完整题目详情（契约 ADMIN-Q-02）：含答案、解析与审核字段。 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "admin:questions:read");

    const { id } = await params;
    const service = new AdminQuestionService(new PrismaAdminQuestionRepository());
    const detail = await service.getDetail(actor, readUuidParam(id));

    return createSuccessResponse(context.requestId, detail);
  });
}

/** 题目更新（契约 ADMIN-Q-04）：乐观锁 version；审核状态变更已审计。 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "admin:questions:write");

    const { id } = await params;
    const input = await readAndValidateJson(request, updateQuestionSchema);
    const service = new AdminQuestionService(new PrismaAdminQuestionRepository());
    const updated = await service.update(
      actor,
      readUuidParam(id),
      {
        ...(input.subject !== undefined ? { subject: input.subject } : {}),
        ...(input.chapter !== undefined ? { chapter: input.chapter ?? null } : {}),
        ...(input.year !== undefined ? { year: input.year ?? null } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.stem !== undefined ? { stem: input.stem } : {}),
        ...(input.options !== undefined ? { options: input.options as QuestionOption[] } : {}),
        ...(input.answer !== undefined ? { answer: input.answer } : {}),
        ...(input.explanation !== undefined ? { explanation: input.explanation ?? null } : {}),
        ...(input.difficulty !== undefined ? { difficulty: input.difficulty ?? null } : {}),
        ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
        ...(input.reviewStatus !== undefined ? { reviewStatus: input.reviewStatus } : {}),
        version: input.version,
      },
      context.requestId,
    );

    return createSuccessResponse(context.requestId, updated);
  });
}

/** 软删除（契约 ADMIN-Q-05）：保留历史错题引用，审计 reason。 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "admin:questions:write");

    const { id } = await params;
    const input = await readAndValidateJson(request, deleteQuestionSchema);
    const service = new AdminQuestionService(new PrismaAdminQuestionRepository());

    await service.remove(actor, readUuidParam(id), input, context.requestId);

    return createSuccessResponse(context.requestId, null);
  });
}
