import { z } from "zod";

import { handleApiRequest } from "@/lib/api/handler";
import { readUuidParam } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { readAndValidateJson } from "@/lib/api/validation";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { AiService } from "@/lib/services/ai/ai-service";
import { DeepSeekClient, type ExplainRequest } from "@/lib/services/ai/deepseek-client";
import { PrismaAiRepository } from "@/lib/services/ai/prisma-ai-repository";
import { QuizService } from "@/lib/services/quiz/quiz-service";
import { PrismaQuizRepository } from "@/lib/services/quiz/prisma-quiz-repository";

const explainSchema = z.strictObject({
  questionId: z.uuid(),
  userAnswer: z.string().trim().min(1).max(200).nullish(),
  focus: z.string().trim().min(1).max(500).nullish(),
});

/** AI-02 非流式短讲解：不信任客户端答案字段，正确答案由服务端查询。 */
export async function POST(request: Request): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "ai:chat");

    const input = await readAndValidateJson(request, explainSchema);
    const quizService = new QuizService(new PrismaQuizRepository());
    const question = await quizService.getAccessibleRow(
      actor.user.id,
      readUuidParam(input.questionId),
    );

    const explainRequest: ExplainRequest = {
      question,
      userAnswer: input.userAnswer ?? null,
      focus: input.focus ?? null,
    };
    const service = new AiService({
      repository: new PrismaAiRepository(),
      client: new DeepSeekClient(),
    });
    const result = await service.explain(actor.user.id, explainRequest);

    return createSuccessResponse(context.requestId, {
      requestId: result.requestId,
      content: result.content,
      usage: result.usage,
    });
  });
}
