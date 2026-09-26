import { z } from "zod";

import { handleApiRequest } from "@/lib/api/handler";
import { readUuidParam } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { readAndValidateJson } from "@/lib/api/validation";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { PrismaActivityRecorder } from "@/lib/services/activity/prisma-activity-recorder";
import { QuizService } from "@/lib/services/quiz/quiz-service";
import { PrismaQuizRepository } from "@/lib/services/quiz/prisma-quiz-repository";

const submitAnswerSchema = z.strictObject({
  answer: z.string().trim().min(1).max(200),
  attemptId: z.uuid(),
});

/** QUIZ-03 服务端判题：attemptId 由客户端生成，同一 attempt 幂等返回首次结果。 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "quiz:submit");

    const { id } = await params;
    const input = await readAndValidateJson(request, submitAnswerSchema);
    const service = new QuizService(new PrismaQuizRepository(), new PrismaActivityRecorder());
    const result = await service.submitAnswer(actor.user.id, readUuidParam(id), {
      answer: input.answer,
      attemptId: input.attemptId,
    });

    return createSuccessResponse(context.requestId, result);
  });
}
