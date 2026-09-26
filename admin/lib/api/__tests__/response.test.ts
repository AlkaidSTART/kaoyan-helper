import { describe, expect, it } from "vitest";

import { AppError, ERROR_CODES } from "../errors";
import {
  createErrorEnvelope,
  createErrorResponse,
  createJsonResponse,
  createSuccessEnvelope,
  createSuccessResponse,
  ensureRequestIdHeader,
  formatUtcTimestamp,
} from "../response";

describe("responses", () => {
  it("formats UTC RFC3339 timestamps at second precision", () => {
    expect(formatUtcTimestamp(new Date("2026-09-26T10:00:00.789Z"))).toBe(
      "2026-09-26T10:00:00Z",
    );
  });

  it("rejects invalid dates", () => {
    expect(() => formatUtcTimestamp("not-a-date")).toThrow(RangeError);
  });

  it("creates a success envelope with optional pagination", () => {
    const envelope = createSuccessEnvelope("req_12345678", [1, 2], {
      timestamp: new Date("2026-09-26T10:00:00Z"),
      pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    });

    expect(envelope).toEqual({
      success: true,
      data: [1, 2],
      meta: {
        requestId: "req_12345678",
        timestamp: "2026-09-26T10:00:00Z",
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      },
    });
  });

  it("creates a safe error envelope", () => {
    const envelope = createErrorEnvelope(
      "req_12345678",
      new AppError(ERROR_CODES.VALIDATION_FAILED, {
        details: { issues: [{ path: ["name"], message: "字段类型不正确" }] },
      }),
      { timestamp: new Date("2026-09-26T10:00:00Z") },
    );

    expect(envelope.success).toBe(false);
    expect(envelope.error.code).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(envelope.meta.requestId).toBe("req_12345678");
  });

  it("returns a JSON response with content type and request ID", async () => {
    const response = createSuccessResponse(
      "req_12345678",
      { ok: true },
      { timestamp: new Date("2026-09-26T10:00:00Z") },
    );

    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(response.headers.get("x-request-id")).toBe("req_12345678");
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { ok: true },
    });
  });

  it("uses the AppError status and emits Retry-After for rate limits", () => {
    const error = new AppError(ERROR_CODES.RATE_LIMITED, {
      details: { retryAfterSeconds: 12 },
    });
    const response = createErrorResponse("req_12345678", error);

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("12");
  });

  it("does not add Retry-After for unrelated errors", () => {
    const response = createErrorResponse(
      "req_12345678",
      new AppError(ERROR_CODES.INVALID_ARGUMENT),
    );

    expect(response.status).toBe(400);
    expect(response.headers.has("retry-after")).toBe(false);
  });

  it("allows an explicit request ID when creating raw JSON responses", () => {
    const response = createJsonResponse(
      { success: true, data: null, meta: { requestId: "req_12345678", timestamp: "2026-09-26T10:00:00Z" } },
      "req_12345678",
      { headers: { "x-request-id": "req_override" } },
    );

    expect(response.headers.get("x-request-id")).toBe("req_12345678");
  });

  it("only fills a missing request ID header on custom responses", () => {
    const response = new Response("custom", {
      headers: { "content-type": "text/event-stream" },
    });

    ensureRequestIdHeader(response, "req_12345678");

    expect(response.headers.get("x-request-id")).toBe("req_12345678");
    expect(response.headers.get("content-type")).toBe("text/event-stream");
  });
});
