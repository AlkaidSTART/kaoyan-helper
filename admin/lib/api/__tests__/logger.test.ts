import { describe, expect, it } from "vitest";

import { ERROR_CODES } from "../errors";
import {
  createRequestLogRecord,
  logRequest,
  serializeRequestLog,
  type RequestLogRecord,
} from "../logger";
import { createRequestContext } from "../request-context";

const context = createRequestContext(new Request("https://example.com/api/items"), {
  route: "/api/items",
  now: new Date("2026-09-26T10:00:00Z"),
  userId: "user-1",
});

describe("request logging", () => {
  it("serializes one safe JSON line with the fixed fields", () => {
    const record = createRequestLogRecord(context, {
      status: 200,
      durationMs: 25,
      timestamp: "2026-09-26T10:00:01Z",
    });

    const line = serializeRequestLog(record);
    const parsed = JSON.parse(line) as RequestLogRecord;

    expect(line.endsWith("\n")).toBe(true);
    expect(line.split("\n")).toHaveLength(2);
    expect(Object.keys(parsed).sort()).toEqual([
      "durationMs",
      "errorCode",
      "method",
      "requestId",
      "route",
      "status",
      "timestamp",
      "userId",
    ]);
    expect(parsed).toMatchObject({
      route: "/api/items",
      method: "GET",
      status: 200,
      durationMs: 25,
      userId: "user-1",
      errorCode: null,
      timestamp: "2026-09-26T10:00:01Z",
    });
  });

  it("records only stable error codes", () => {
    const record = createRequestLogRecord(context, {
      status: 422,
      durationMs: 5,
      errorCode: ERROR_CODES.VALIDATION_FAILED,
      timestamp: "2026-09-26T10:00:01Z",
    });

    expect(JSON.parse(serializeRequestLog(record)).errorCode).toBe(
      ERROR_CODES.VALIDATION_FAILED,
    );
  });

  it("drops extra properties that callers might pass at runtime", () => {
    const record = createRequestLogRecord(context, {
      status: 200,
      durationMs: 1,
      timestamp: "2026-09-26T10:00:01Z",
    }) as RequestLogRecord & { authorization: string; cookie: string; prompt: string };
    record.authorization = "Bearer secret";
    record.cookie = "session=secret";
    record.prompt = "private prompt";

    const line = serializeRequestLog(record);

    expect(line).not.toContain("secret");
    expect(line).not.toContain("private prompt");
  });

  it("writes to an injected sink", () => {
    const lines: string[] = [];
    const record = createRequestLogRecord(context, {
      status: 204,
      durationMs: 3,
      timestamp: "2026-09-26T10:00:01Z",
    });

    logRequest(record, (line) => lines.push(line));

    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]).status).toBe(204);
  });
});
