import { describe, expect, it, vi } from "vitest";

import {
  createRequestContext,
  createRequestId,
  getDurationMs,
  isValidRequestId,
  resolveRequestId,
} from "../request-context";

describe("request context", () => {
  it("accepts the documented request ID format", () => {
    expect(isValidRequestId("req_12345678")).toBe(true);
    expect(isValidRequestId("req_A-Z_a-z-0-9")).toBe(true);
    expect(isValidRequestId("12345678")).toBe(false);
    expect(isValidRequestId("req_short")).toBe(false);
    expect(isValidRequestId(`req_${"a".repeat(129)}`)).toBe(false);
  });

  it("generates a request ID with the required prefix and characters", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("12345678-1234-1234-1234-123456789012");

    const requestId = createRequestId();

    expect(requestId).toBe("req_12345678123412341234123456789012");
    expect(isValidRequestId(requestId)).toBe(true);
  });

  it("preserves valid request IDs and replaces invalid ones", () => {
    expect(resolveRequestId("req_valid_12345678")).toBe("req_valid_12345678");
    expect(resolveRequestId("invalid")).toMatch(/^req_[A-Za-z0-9_-]{8,128}$/);
    expect(resolveRequestId(null)).toMatch(/^req_[A-Za-z0-9_-]{8,128}$/);
  });

  it("creates a trusted context from request metadata", () => {
    const request = new Request("https://example.com/api/questions?page=1", {
      method: "POST",
      headers: { "x-request-id": "req_external_12345678" },
    });

    const context = createRequestContext(request, {
      now: new Date("2026-09-26T10:00:00Z"),
      userId: "user-1",
    });

    expect(context).toEqual({
      requestId: "req_external_12345678",
      route: "/api/questions",
      method: "POST",
      startedAt: new Date("2026-09-26T10:00:00Z"),
      userId: "user-1",
    });
  });

  it("allows a stable route template to replace the URL path", () => {
    const request = new Request("https://example.com/api/questions/123");
    const context = createRequestContext(request, { route: "/api/questions/:id" });

    expect(context.route).toBe("/api/questions/:id");
  });

  it("calculates non-negative elapsed milliseconds", () => {
    const context = createRequestContext(new Request("https://example.com/api"), {
      now: new Date("2026-09-26T10:00:00.100Z"),
    });

    expect(getDurationMs(context, new Date("2026-09-26T10:00:00.350Z"))).toBe(250);
    expect(getDurationMs(context, new Date("2026-09-26T09:59:59Z"))).toBe(0);
  });
});
