import { z } from "zod";

import { handleApiRequest } from "@/lib/api/handler";
import { readUuidParam } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { readAndValidateJson } from "@/lib/api/validation";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { QuizService } from "@/lib/services/quiz/quiz-service";
import { PrismaQuizRepository } from "@/lib/services/quiz/prisma-quiz-repository";

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
  options: z.array(questionOptionSchema).max(10).optional(),
  answer: z.string().trim().min(1).max(200).optional(),
  explanation: z.string().trim().min(1).max(4_000).nullish(),
  difficulty: z.enum(["easy", "medium", "hard"]).nullish(),
  visibility: z.enum(["private", "public"]).optional(),
  version: z.number().int().min(1),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApiRequest(request, async () => {
    const actor = await getActor(request);

    requirePermission(actor, "quiz:read");

    const { id } = await params;
    const service = new QuizService(new PrismaQuizRepository());

    return service.getDetail(actor.user.id, readUuidParam(id));
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "quiz:update:own");

    const { id } = await params;
    const input = await readAndValidateJson(request, updateQuestionSchema, {
      additionalImmutableFields: ["source", "reviewStatus", "isApproved"],
    });
    const service = new QuizService(new PrismaQuizRepository());
    const updated = await service.update(actor.user.id, readUuidParam(id), {
      ...input,
      chapter: input.chapter ?? undefined,
      year: input.year ?? undefined,
      explanation: input.explanation ?? undefined,
      difficulty: input.difficulty ?? undefined,
    });

    return createSuccessResponse(context.requestId, updated);
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "quiz:delete:own");

    const { id } = await params;
    const body = await readAndValidateJson(
      request,
      z.strictObject({ version: z.number().int().min(1) }),
    );
    const service = new QuizService(new PrismaQuizRepository());

    await service.remove(actor.user.id, readUuidParam(id), body.version);

    return createSuccessResponse(context.requestId, null);
  });
}
