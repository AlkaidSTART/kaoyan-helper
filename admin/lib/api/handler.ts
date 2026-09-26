import { toAppError, type ErrorCode } from "./errors";
import { createRequestLogRecord, logRequest, type LogSink } from "./logger";
import {
  createRequestContext,
  getDurationMs,
  type RequestContext,
} from "./request-context";
import {
  createErrorResponse,
  createSuccessResponse,
  ensureRequestIdHeader,
  formatUtcTimestamp,
  isResponse,
} from "./response";

export type ApiHandler<T> = (
  context: RequestContext,
) => T | Response | Promise<T | Response>;

export interface HandleApiRequestOptions {
  route?: string;
  userId?: string;
  logSink?: LogSink;
  now?: () => Date;
}

export async function handleApiRequest<T>(
  request: Request,
  handler: ApiHandler<T>,
  options: HandleApiRequestOptions = {},
): Promise<Response> {
  const now = options.now ?? (() => new Date());
  const context = createRequestContext(request, {
    route: options.route,
    userId: options.userId,
    now: now(),
  });
  let response: Response;
  let errorCode: ErrorCode | null = null;

  try {
    const result = await handler(context);

    response = isResponse(result)
      ? ensureRequestIdHeader(result, context.requestId)
      : createSuccessResponse(context.requestId, result, {
          timestamp: now(),
        });
  } catch (error) {
    const appError = toAppError(error);

    errorCode = appError.code;
    response = createErrorResponse(context.requestId, appError, {
      timestamp: now(),
    });
  }

  response = ensureRequestIdHeader(response, context.requestId);
  writeRequestLog(context, response, errorCode, now, options.logSink);

  return response;
}

function writeRequestLog(
  context: RequestContext,
  response: Response,
  errorCode: ErrorCode | null,
  now: () => Date,
  sink?: LogSink,
): void {
  const completedAt = now();
  const record = createRequestLogRecord(context, {
    status: response.status,
    durationMs: getDurationMs(context, completedAt),
    errorCode,
    timestamp: formatUtcTimestamp(completedAt),
  });

  try {
    logRequest(record, sink);
  } catch {
    // Logging must not change an otherwise valid API response.
  }
}
