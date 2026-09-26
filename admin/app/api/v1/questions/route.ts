import { z } from "zod";

import { createPaginationMeta, parsePagination } from "@/lib/api/pagination";
import { handleApiRequest } from "@/lib/api/handler";
import { searchParamsToObject } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { readAndValidateJson } from "@/lib/api/validation";
import { getActor, requirePermission } from "@/lib/auth/actor";
import {
  QuizService,
  toSummaryDto,
  type QuestionFilters,
} from "@/lib/services/quiz/quiz-service";
import { PrismaQuizRepository } from "@/lib/services/quiz/prisma-quiz-repository";

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
  options: z.array(questionOptionSchema).max(10),
  answer: z.string().trim().min(1).max(200),
  explanation: z.string().trim().min(1).max(4_000).nullish(),
  difficulty: z.enum(["easy", "medium", "hard"]).nullish(),
  visibility: z.enum(["private", "public"]),
});

export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "quiz:read");

    const query = searchParamsToObject(request.url);
    const filters: QuestionFilters = {
      scope: query.scope === "mine" ? "mine" : "public",
      subject: query.subject?.trim() || null,
      chapter: query.chapter?.trim() || null,
      year: query.year ? Number(query.year) : null,
      type: query.type?.trim() || null,
      difficulty: query.difficulty?.trim() || null,
      search: query.search?.trim() || null,
    };
    const pagination = parsePagination(new URL(request.url));
    const service = new QuizService(new PrismaQuizRepository());
    const { rows, total } = await service.list(
      actor.user.id,
      filters,
      pagination.page,
      pagination.pageSize,
    );

    return createSuccessResponse(
      context.requestId,
      rows.map((row) => toSummaryDto(row, actor.user.id)),
      {
        pagination: createPaginationMeta(pagination.page, pagination.pageSize, total),
      },
    );
  });
}

export async function POST(request: Request): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "quiz:create");

    const input = await readAndValidateJson(request, createQuestionSchema);
    const service = new QuizService(new PrismaQuizRepository());
    const created = await service.create(actor.user.id, {
      subject: input.subject,
      chapter: input.chapter ?? null,
      year: input.year ?? null,
      type: input.type,
      stem: input.stem,
      options: input.options,
      answer: input.answer,
      explanation: input.explanation ?? null,
      difficulty: input.difficulty ?? null,
      visibility: input.visibility,
    });

    return createSuccessResponse(context.requestId, created);
  });
}
