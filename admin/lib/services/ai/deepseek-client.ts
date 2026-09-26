import { AppError, ERROR_CODES } from "../../api/errors";
import type { QuestionRow } from "../quiz/quiz-service";
import { usageDateFor } from "./quota";
import type { AiRepository } from "./quota";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";

const CHAT_MODEL = "deepseek-chat";

const REQUEST_TIMEOUT_MS = 120_000;

const MAX_MESSAGES = 20;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatContext {
  questionId: string | null;
  userAnswer: string | null;
}

export interface ChatRequest {
  subject: string;
  conversationId: string | null;
  messages: ChatMessage[];
  context: ChatContext | null;
}

export interface ExplainRequest {
  question: QuestionRow;
  userAnswer: string | null;
  focus: string | null;
}

export interface AiUsageOutcome {
  promptTokens: number;
  completionTokens: number;
}

export type StreamEvent =
  | { type: "delta"; content: string }
  | { type: "done"; usage: AiUsageOutcome; finishReason: string };

export interface DeepSeekStreamResult {
  events: AsyncGenerator<StreamEvent>;
  abort: () => void;
}

/**
 * DeepSeek 上游客户端。密钥只从服务端环境变量读取；
 * 未配置 `DEEPSEEK_API_KEY` 时映射 503 `DEPENDENCY_UNAVAILABLE`。
 */
export class DeepSeekClient {
  private readonly fetchImpl: typeof fetch;

  constructor(fetchImpl: typeof fetch = fetch) {
    this.fetchImpl = fetchImpl;
  }

  private requireApiKey(): string {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      throw new AppError(ERROR_CODES.DEPENDENCY_UNAVAILABLE);
    }

    return apiKey;
  }

  async streamChat(
    messages: { role: string; content: string }[],
  ): Promise<DeepSeekStreamResult> {
    const apiKey = this.requireApiKey();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;

    try {
      response = await this.fetchImpl(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: CHAT_MODEL,
          messages,
          stream: true,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);
      controller.abort();

      throw new AppError(ERROR_CODES.DEPENDENCY_UNAVAILABLE, { cause: error });
    }

    if (!response.ok || !response.body) {
      clearTimeout(timeout);
      controller.abort();

      throw new AppError(ERROR_CODES.DEPENDENCY_UNAVAILABLE);
    }

    const events = parseSseStream(response.body, controller);

    return {
      events,
      abort: () => controller.abort(),
    };
  }

  async completeChat(
    messages: { role: string; content: string }[],
  ): Promise<{ content: string; usage: AiUsageOutcome; finishReason: string }> {
    const apiKey = this.requireApiKey();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await this.fetchImpl(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: CHAT_MODEL,
          messages,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new AppError(ERROR_CODES.DEPENDENCY_UNAVAILABLE);
      }

      const payload = (await response.json()) as {
        choices?: { message?: { content?: string }; finish_reason?: string }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };

      const content = payload.choices?.[0]?.message?.content;

      if (typeof content !== "string" || content.length === 0) {
        throw new AppError(ERROR_CODES.DEPENDENCY_UNAVAILABLE);
      }

      return {
        content,
        usage: {
          promptTokens: payload.usage?.prompt_tokens ?? 0,
          completionTokens: payload.usage?.completion_tokens ?? 0,
        },
        finishReason: payload.choices?.[0]?.finish_reason ?? "stop",
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(ERROR_CODES.DEPENDENCY_UNAVAILABLE, { cause: error });
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }
  }
}

async function* parseSseStream(
  body: ReadableStream<Uint8Array>,
  controller: AbortController,
): AsyncGenerator<StreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      let separatorIndex = buffer.indexOf("\n");

      while (separatorIndex !== -1) {
        const line = buffer.slice(0, separatorIndex).trim();

        buffer = buffer.slice(separatorIndex + 1);
        separatorIndex = buffer.indexOf("\n");

        if (!line.startsWith("data:")) {
          continue;
        }

        const payload = line.slice(5).trim();

        if (payload === "[DONE]") {
          return;
        }

        let parsed: {
          choices?: { delta?: { content?: string }; finish_reason?: string | null }[];
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };

        try {
          parsed = JSON.parse(payload);
        } catch {
          continue;
        }

        const delta = parsed.choices?.[0]?.delta?.content;

        if (typeof delta === "string" && delta.length > 0) {
          yield { type: "delta", content: delta };
        }

        const finishReason = parsed.choices?.[0]?.finish_reason;

        if (typeof finishReason === "string" && finishReason.length > 0) {
          yield {
            type: "done",
            usage: {
              promptTokens: parsed.usage?.prompt_tokens ?? 0,
              completionTokens: parsed.usage?.completion_tokens ?? 0,
            },
            finishReason,
          };

          return;
        }
      }
    }
  } finally {
    reader.releaseLock();
    controller.abort();
  }
}

/** 组装聊天 system prompt；禁止客户端拼接 system prompt（契约 §2.1 信任边界）。 */
export function buildChatMessages(
  request: ChatRequest,
  question: QuestionRow | null,
): { role: string; content: string }[] {
  const subjectLabel = SUBJECT_LABELS[request.subject] ?? request.subject;
  const contextLines = [
    `你是一名考研${subjectLabel}辅导老师，回答简洁、准确、面向考试。`,
    question
      ? `当前题目：${question.stem}（正确答案与解析由服务端注入，勿向用户直接泄漏题目答案，除非用户已提交作答。）`
      : null,
    request.context?.userAnswer ? `用户提交的答案：${request.context.userAnswer}` : null,
  ].filter((line): line is string => line !== null);

  const safeMessages = request.messages.slice(-MAX_MESSAGES).map((message) => ({
    role: message.role,
    content: message.content.slice(0, 4_000),
  }));

  return [{ role: "system", content: contextLines.join("\n") }, ...safeMessages];
}

/** 组装题目讲解 prompt；正确答案与解析只来自服务端查询结果。 */
export function buildExplainMessages(request: ExplainRequest): { role: string; content: string }[] {
  const focus = request.focus ? `用户关注点：${request.focus}。` : "";
  const userAnswer = request.userAnswer ? `用户的作答是「${request.userAnswer}」。` : "用户尚未作答。";

  return [
    {
      role: "system",
      content:
        "你是一名考研辅导老师，请针对题目给出简短讲解：先判断用户作答是否正确，再解释考点。控制在 300 字以内。",
    },
    {
      role: "user",
      content: [
        `题目（${request.question.type}）：${request.question.stem}`,
        `选项：${JSON.stringify(request.question.options)}`,
        `正确答案：${request.question.answer}`,
        request.question.explanation ? `官方解析：${request.question.explanation}` : null,
        userAnswer,
        focus,
      ]
        .filter((line): line is string => line !== null)
        .join("\n"),
    },
  ];
}

const SUBJECT_LABELS: Record<string, string> = {
  politics: "政治",
  english: "英语",
  math: "数学",
  professional: "专业课",
};

export type { AiRepository };
