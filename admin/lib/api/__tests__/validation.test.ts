import { describe, expect, it } from "vitest";
import { z } from "zod";

import { AppError, ERROR_CODES } from "../errors";
import {
  assertNoImmutableFields,
  parseJsonRequest,
  readAndValidateJson,
  validateWithSchema,
} from "../validation";

const createJsonRequest = (body: string): Request =>
  new Request("https://example.com/api/items", {
    method: "POST",
    body,
    headers: { "content-type": "application/json" },
  });

describe("validation", () => {
  it("parses valid JSON", async () => {
    await expect(parseJsonRequest(createJsonRequest('{"name":"test"}'))).resolves.toEqual({
      name: "test",
    });
  });

  it.each(["", "   ", "{invalid", '{"secret":"do-not-echo"}']) (
    "maps unreadable or empty JSON to a safe 400 error",
    async (body) => {
      let error: unknown;

      try {
        await parseJsonRequest(createJsonRequest(body));
      } catch (caught) {
        error = caught;
      }

      expect(error).toBeInstanceOf(AppError);
      expect(error).toMatchObject({
        code: ERROR_CODES.INVALID_ARGUMENT,
        status: 400,
      });
      expect(JSON.stringify(error)).not.toContain("do-not-echo");
    },
  );

  it("validates with a schema", () => {
    const schema = z.strictObject({ name: z.string().min(1) });

    expect(validateWithSchema(schema, { name: "Ada" })).toEqual({ name: "Ada" });
  });

  it("rejects unknown fields without echoing input values", () => {
    const schema = z.strictObject({ name: z.string() });
    let error: AppError | undefined;

    try {
      validateWithSchema(schema, { name: "Ada", secret: "do-not-echo" });
    } catch (caught) {
      error = caught as AppError;
    }

    expect(error).toBeInstanceOf(AppError);
    expect(error?.code).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(error?.status).toBe(422);
    expect(JSON.stringify(error?.details)).not.toContain("do-not-echo");
    expect(error?.details).toMatchObject({
      issues: [{ path: [], message: "包含未知字段" }],
    });
  });

  it.each(["role", "isBanned", "userId", "creatorId", "isCorrect", "permissions"])(
    "rejects protected field %s before schema validation",
    (field) => {
      expect(() => assertNoImmutableFields({ [field]: "value" })).toThrow(AppError);
    },
  );

  it("supports additional protected fields", () => {
    expect(() => assertNoImmutableFields({ tenantId: "t1" }, ["tenantId"])).toThrow(AppError);
  });

  it("does not mistake arrays for objects with protected fields", () => {
    expect(() => assertNoImmutableFields([{ role: "admin" }])).not.toThrow();
  });

  it("reads, protects, and validates in one entry point", async () => {
    const schema = z.strictObject({ name: z.string() });
    const request = createJsonRequest('{"name":"Ada","role":"admin"}');

    await expect(readAndValidateJson(request, schema)).rejects.toMatchObject({
      code: ERROR_CODES.IMMUTABLE_FIELD,
      status: 422,
    });
  });
});
