import { z } from "zod";

import { handleApiRequest } from "@/lib/api/handler";
import { createPaginationMeta, parsePagination } from "@/lib/api/pagination";
import { searchParamsToObject } from "@/lib/api/params";
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

const createQuestionSchema = z.strictObject({
  subject: z.string().trim().min(1).max(50),
  chapter: z.string().trim().min(1).max(100).nullish(),
  year: z.number().int().min(1990).max(2100).nullish(),
  type: z.enum(["single_choice", "multiple_choice", "judge", "fill_blank"]),
  stem: z.string().trim().min(1).max(4_000),
  options: z.array(questionOptionSchema).min(2).max(10),
  answer: z.string().trim().min(1).max(200),
  explanation: z.string().trim().min(1).max(4_000).nullish(),
  difficulty: z.enum(["easy", "medium", "hard"]).nullish(),
  visibility: z.enum(["private", "public"]).default("public"),
});

/** 题库列表（契约 ADMIN-Q-01）：管理端可含已删除题目。 */
export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "admin:questions:read");

    const query = searchParamsToObject(request.url);
    const pagination = parsePagination(new URL(request.url));
    const service = new AdminQuestionService(new PrismaAdminQuestionRepository());
    const { rows, total } = await service.list(
      actor,
      {
        subject: query.subject?.trim() || null,
        source: query.source?.trim() || null,
        reviewStatus: query.reviewStatus?.trim() || null,
        isApproved:
          query.isApproved === "true" ? true : query.isApproved === "false" ? false : null,
        includeDeleted: query.includeDeleted === "true",
        search: query.search?.trim() || null,
      },
      pagination.page,
      pagination.pageSize,
    );

    return createSuccessResponse(context.requestId, rows, {
      pagination: createPaginationMeta(pagination.page, pagination.pageSize, total),
    });
  });
}

/** 官方题目创建（契约 ADMIN-Q-03）：创建即已批准，creatorId 服务端赋值为管理员。 */
export async function POST(request: Request): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "admin:questions:write");

    const input = await readAndValidateJson(request, createQuestionSchema);
    const service = new AdminQuestionService(new PrismaAdminQuestionRepository());
    const created = await service.create(
      actor,
      {
        subject: input.subject,
        chapter: input.chapter ?? null,
        year: input.year ?? null,
        type: input.type,
        stem: input.stem,
        options: input.options as QuestionOption[],
        answer: input.answer,
        explanation: input.explanation ?? null,
        difficulty: input.difficulty ?? null,
        visibility: input.visibility,
      },
      context.requestId,
    );

    return createSuccessResponse(context.requestId, created);
  });
}
