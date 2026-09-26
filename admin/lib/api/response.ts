import { AppError, type JsonObject, type JsonValue } from "./errors";

export interface ResponseMeta {
  requestId: string;
  timestamp: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta: ResponseMeta;
}

export interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details: JsonValue | null;
  };
  meta: ResponseMeta;
}

export type ApiEnvelope<T> = SuccessEnvelope<T> | ErrorEnvelope;

export interface SuccessResponseOptions {
  pagination?: PaginationMeta;
  timestamp?: Date | string | number;
}

export function formatUtcTimestamp(value: Date | string | number = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new RangeError("Invalid date value");
  }

  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function createResponseMeta(
  requestId: string,
  options: Omit<SuccessResponseOptions, "pagination"> = {},
): ResponseMeta {
  const meta: ResponseMeta = {
    requestId,
    timestamp: formatUtcTimestamp(options.timestamp),
  };

  return meta;
}

export function createSuccessEnvelope<T>(
  requestId: string,
  data: T,
  options: SuccessResponseOptions = {},
): SuccessEnvelope<T> {
  const meta = createResponseMeta(requestId, options);

  if (options.pagination) {
    meta.pagination = options.pagination;
  }

  return {
    success: true,
    data,
    meta,
  };
}

export function createErrorEnvelope(
  requestId: string,
  error: AppError,
  options: Omit<SuccessResponseOptions, "pagination"> = {},
): ErrorEnvelope {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
    meta: createResponseMeta(requestId, options),
  };
}

export function createJsonResponse<T>(
  body: ApiEnvelope<T>,
  requestId: string,
  init: ResponseInit = {},
): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  headers.set("x-request-id", requestId);

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

export function createSuccessResponse<T>(
  requestId: string,
  data: T,
  options: SuccessResponseOptions = {},
): Response {
  return createJsonResponse(createSuccessEnvelope(requestId, data, options), requestId);
}

export function createErrorResponse(
  requestId: string,
  error: AppError,
  options: Omit<SuccessResponseOptions, "pagination"> = {},
): Response {
  const response = createJsonResponse(createErrorEnvelope(requestId, error, options), requestId, {
    status: error.status,
  });
  const retryAfterSeconds = getRetryAfterSeconds(error);

  if (retryAfterSeconds !== null) {
    response.headers.set("retry-after", String(retryAfterSeconds));
  }

  return response;
}

export function getRetryAfterSeconds(error: AppError): number | null {
  if (!isJsonObject(error.details)) {
    return null;
  }

  const retryAfterSeconds = error.details.retryAfterSeconds;

  return typeof retryAfterSeconds === "number" && Number.isInteger(retryAfterSeconds) && retryAfterSeconds >= 0
    ? retryAfterSeconds
    : null;
}

export function ensureRequestIdHeader(response: Response, requestId: string): Response {
  if (!response.headers.has("x-request-id")) {
    response.headers.set("x-request-id", requestId);
  }

  return response;
}

export function isResponse(value: unknown): value is Response {
  return typeof Response !== "undefined" && value instanceof Response;
}

function isJsonObject(value: JsonValue | null): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
