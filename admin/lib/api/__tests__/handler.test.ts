import { describe, expect, it } from "vitest";

import { AppError, ERROR_CODES } from "../errors";
import { handleApiRequest } from "../handler";
import type { RequestLogRecord } from "../logger";

const createNow = (): (() => Date) => {
  const times = [
    new Date("2026-09-26T10:00:00.000Z"),
    new Date("2026-09-26T10:00:01.000Z"),
    new Date("2026-09-26T10:00:02.000Z"),
  ];
  let index = 0;

  return () => times[Math.min(index++, times.length - 1)];
};

describe("handleApiRequest", () => {
  it("wraps ordinary handler data and writes a structured log", async () => {
    const lines: string[] = [];
    const request = new Request("https://example.com/api/items", {
      headers: { "x-request-id": "req_external_12345678" },
    });

    const response = await handleApiRequest(request, async () => ({ ok: true }), {
      logSink: (line) => lines.push(line),
      now: createNow(),
    });
    const body = await response.json();
    const log = JSON.parse(lines[0]) as RequestLogRecord;

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("req_external_12345678");
    expect(body).toMatchObject({
      success: true,
      data: { ok: true },
      meta: {
        requestId: "req_external_12345678",
        timestamp: "2026-09-26T10:00:01Z",
      },
    });
    expect(log).toEqual({
      requestId: "req_external_12345678",
      route: "/api/items",
      method: "GET",
      status: 200,
      durationMs: 2_000,
      userId: null,
      errorCode: null,
      timestamp: "2026-09-26T10:00:02Z",
    });
  });

  it("maps a known AppError to its safe status and body", async () => {
    const response = await handleApiRequest(
      new Request("https://example.com/api/items/missing"),
      async () => {
        throw new AppError(ERROR_CODES.NOT_FOUND);
      },
      { now: createNow() },
    );

    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: "资源不存在",
        details: null,
      },
    });
    expect(response.status).toBe(404);
  });

  it("sanitizes unknown exceptions and their logs", async () => {
    const lines: string[] = [];
    const error = new Error("SELECT * FROM secrets");
    error.stack = "private stack";

    const response = await handleApiRequest(
      new Request("https://example.com/api/items"),
      async () => {
        throw error;
      },
      { logSink: (line) => lines.push(line), now: createNow() },
    );
    const text = await response.text();

    expect(response.status).toBe(500);
    expect(text).not.toContain("secrets");
    expect(text).not.toContain("private stack");
    expect(JSON.parse(text)).toMatchObject({
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR },
    });
    expect(JSON.parse(lines[0]).errorCode).toBe(ERROR_CODES.INTERNAL_ERROR);
  });

  it("passes custom responses through without changing their protocol", async () => {
    const response = await handleApiRequest(
      new Request("https://example.com/api/stream"),
      async () =>
        new Response("event: done\n\n", {
          status: 202,
          headers: { "content-type": "text/event-stream" },
        }),
      { now: createNow() },
    );

    expect(response.status).toBe(202);
    expect(response.headers.get("content-type")).toBe("text/event-stream");
    expect(response.headers.get("x-request-id")).toMatch(/^req_[A-Za-z0-9_-]{8,128}$/);
    expect(await response.text()).toBe("event: done\n\n");
  });

  it("does not let a failing log sink break a successful response", async () => {
    const response = await handleApiRequest(
      new Request("https://example.com/api/items"),
      async () => ({ ok: true }),
      {
        logSink: () => {
          throw new Error("sink unavailable");
        },
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ success: true });
  });
});
