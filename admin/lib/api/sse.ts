const SSE_CONTENT_TYPE = "text/event-stream; charset=utf-8";

export const DEFAULT_HEARTBEAT_MS = 15_000;

export const DEFAULT_MAX_STREAM_MS = 120_000;

export interface SseStreamOptions {
  heartbeatMs?: number;
  maxDurationMs?: number;
}

/** 编码单条 SSE 事件；`data` 必须是可序列化对象。 */
export function encodeSseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function createSseResponse(source: ReadableStream<Uint8Array>): Response {
  return new Response(source, {
    headers: {
      "content-type": SSE_CONTENT_TYPE,
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}

interface WritableLike {
  enqueue(chunk: Uint8Array): void;
  close(): void;
}

/**
 * 将异步事件流转换为 SSE 字节流：约每 15s 发送心跳注释，单连接最长 120s。
 * 上游中断写入 `error` 事件后关闭；客户端断开时中止上游。
 */
export function streamSseEvents(
  events: AsyncGenerator<{ event: string; data: unknown }>,
  options: SseStreamOptions = {},
  encoder = new TextEncoder(),
  onError?: (error: unknown) => void,
): ReadableStream<Uint8Array> {
  const heartbeatMs = options.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;
  const maxDurationMs = options.maxDurationMs ?? DEFAULT_MAX_STREAM_MS;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (chunk: string): void => {
        controller.enqueue(encoder.encode(chunk));
      };

      const deadline = Date.now() + maxDurationMs;
      const iterator = events[Symbol.asyncIterator]();

      try {
        while (true) {
          const remaining = deadline - Date.now();

          if (remaining <= 0) {
            write(encodeSseEvent("error", { code: "DEPENDENCY_UNAVAILABLE", message: "AI 服务暂不可用", details: null }));
            break;
          }

          const next = await Promise.race([
            iterator.next(),
            new Promise<"heartbeat">((resolve) => setTimeout(() => resolve("heartbeat"), Math.min(heartbeatMs, remaining))),
          ]);

          if (next === "heartbeat") {
            write(": ping\n\n");
            continue;
          }

          if (next.done) {
            break;
          }

          write(encodeSseEvent(next.value.event, next.value.data));
        }
      } catch (error) {
        onError?.(error);

        try {
          write(encodeSseEvent("error", { code: "DEPENDENCY_UNAVAILABLE", message: "AI 服务暂不可用", details: null }));
        } catch {
          // 客户端已断开时写入失败是预期的，不需要处理。
        }
      } finally {
        controller.close();
      }
    },
  });
}

export type { WritableLike };
