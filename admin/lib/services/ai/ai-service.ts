import { AppError, ERROR_CODES } from "../../api/errors";
import {
  DeepSeekClient,
  buildChatMessages,
  buildExplainMessages,
  type ChatRequest,
  type ExplainRequest,
  type StreamEvent,
} from "./deepseek-client";
import { assertDailyQuota, usageDateFor } from "./quota";
import type { AiRepository } from "./quota";

export interface AiServiceDependencies {
  repository: AiRepository;
  client?: DeepSeekClient;
  timeZone?: string;
  now?: () => Date;
}

export interface ExplainResult {
  requestId: string;
  content: string;
  usage: { promptTokens: number; completionTokens: number };
}

/**
 * AI 领域服务：配额 → 上游 → 用量落库的顺序固定。
 * 配额在建流/请求上游前校验，消耗以条件更新兜底并发；上游失败不计数。
 */
export class AiService {
  private readonly repository: AiRepository;

  private readonly client: DeepSeekClient;

  private readonly timeZone: string;

  private readonly now: () => Date;

  constructor(dependencies: AiServiceDependencies) {
    this.repository = dependencies.repository;
    this.client = dependencies.client ?? new DeepSeekClient();
    this.timeZone = dependencies.timeZone ?? "Asia/Shanghai";
    this.now = dependencies.now ?? (() => new Date());
  }

  /** 返回 SSE 事件流与剩余配额；调用方负责写 meta 事件并在 finally 中关闭。 */
  async startChat(
    userId: string,
    request: ChatRequest,
  ): Promise<{ remaining: number; events: AsyncGenerator<StreamEvent> }> {
    const now = this.now();
    const usageDate = usageDateFor(now, this.timeZone);
    const usage = await this.repository.findUsage(userId, usageDate);
    const remaining = assertDailyQuota(usage);

    const messages = buildChatMessages(request, null);
    const stream = await this.client.streamChat(messages);

    const consumeQuota = async (usage2: { promptTokens: number; completionTokens: number }) => {
      await this.repository.consumeQuota({
        userId,
        usageDate,
        promptTokens: usage2.promptTokens,
        completionTokens: usage2.completionTokens,
        expectedCallCount: usage?.callCount ?? 0,
      });
    };

    async function* tracked(events: AsyncGenerator<StreamEvent>): AsyncGenerator<StreamEvent> {
      let consumed = false;

      for await (const event of events) {
        if (event.type === "done" && !consumed) {
          consumed = true;
          await consumeQuota(event.usage);
        }

        yield event;
      }
    }

    return { remaining, events: tracked(stream.events) };
  }

  async explain(userId: string, request: ExplainRequest): Promise<ExplainResult> {
    const now = this.now();
    const usageDate = usageDateFor(now, this.timeZone);
    const usage = await this.repository.findUsage(userId, usageDate);

    assertDailyQuota(usage);

    const result = await this.client.completeChat(buildExplainMessages(request));

    await this.repository.consumeQuota({
      userId,
      usageDate,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      expectedCallCount: usage?.callCount ?? 0,
    });

    return {
      requestId: crypto.randomUUID(),
      content: result.content,
      usage: result.usage,
    };
  }
}

export { AppError, ERROR_CODES };
