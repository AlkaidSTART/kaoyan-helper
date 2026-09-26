import { z } from "zod";

import { handleApiRequest } from "@/lib/api/handler";
import { createSseResponse, encodeSseEvent, streamSseEvents } from "@/lib/api/sse";
import { readAndValidateJson } from "@/lib/api/validation";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { AiService } from "@/lib/services/ai/ai-service";
import { DeepSeekClient, type ChatRequest } from "@/lib/services/ai/deepseek-client";
import { PrismaAiRepository } from "@/lib/services/ai/prisma-ai-repository";

const chatMessageSchema = z.strictObject({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4_000),
});

const chatSchema = z.strictObject({
  subject: z.string().trim().min(1).max(50),
  conversationId: z.uuid().nullish(),
  messages: z.array(chatMessageSchema).min(1).max(20),
  context: z
    .strictObject({
      questionId: z.uuid(),
      userAnswer: z.string().trim().min(1).max(200).nullish(),
    })
    .nullish(),
});

/** AI-01 SSE：meta/delta/done/error 四类事件；配额在建流前校验。 */
export async function POST(request: Request): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "ai:chat");

    const input = await readAndValidateJson(request, chatSchema);
    const service = new AiService({
      repository: new PrismaAiRepository(),
      client: new DeepSeekClient(),
    });

    const chatRequest: ChatRequest = {
      subject: input.subject,
      conversationId: input.conversationId ?? null,
      messages: input.messages,
      context: input.context
        ? { questionId: input.context.questionId, userAnswer: input.context.userAnswer ?? null }
        : null,
    };

    const { remaining, events } = await service.startChat(actor.user.id, chatRequest);

    async function* mapped(): AsyncGenerator<{ event: string; data: unknown }> {
      yield {
        event: "meta",
        data: {
          requestId: context.requestId,
          conversationId: chatRequest.conversationId,
          dailyRemaining: remaining,
        },
      };

      for await (const event of events) {
        if (event.type === "delta") {
          yield { event: "delta", data: { content: event.content } };
        } else {
          yield {
            event: "done",
            data: {
              finishReason: event.finishReason,
              usage: {
                promptTokens: event.usage.promptTokens,
                completionTokens: event.usage.completionTokens,
              },
            },
          };
        }
      }
    }

    return createSseResponse(
      streamSseEvents(mapped(), {}, new TextEncoder(), () => undefined),
    );
  });
}

void encodeSseEvent;
