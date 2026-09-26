const REQUEST_ID_PATTERN = /^req_[A-Za-z0-9_-]{8,128}$/;

export interface RequestContext {
  requestId: string;
  route: string;
  method: string;
  startedAt: Date;
  userId?: string;
}

export interface CreateRequestContextOptions {
  route?: string;
  userId?: string;
  now?: Date;
}

export function createRequestId(): string {
  return `req_${crypto.randomUUID().replaceAll("-", "")}`;
}

export function isValidRequestId(value: string | null | undefined): value is string {
  return typeof value === "string" && REQUEST_ID_PATTERN.test(value);
}

export function resolveRequestId(value: string | null | undefined): string {
  return isValidRequestId(value) ? value : createRequestId();
}

export function createRequestContext(
  request: Request,
  options: CreateRequestContextOptions = {},
): RequestContext {
  const startedAt = options.now ?? new Date();

  if (Number.isNaN(startedAt.getTime())) {
    throw new RangeError("Invalid request start time");
  }

  return {
    requestId: resolveRequestId(request.headers.get("x-request-id")),
    route: options.route ?? new URL(request.url).pathname,
    method: request.method,
    startedAt,
    ...(options.userId ? { userId: options.userId } : {}),
  };
}

export function getDurationMs(context: RequestContext, now: Date = new Date()): number {
  if (Number.isNaN(now.getTime())) {
    throw new RangeError("Invalid request completion time");
  }

  return Math.max(0, now.getTime() - context.startedAt.getTime());
}
