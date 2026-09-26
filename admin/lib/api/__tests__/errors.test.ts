import { describe, expect, it } from "vitest";

import {
  AppError,
  ERROR_CODES,
  ERROR_STATUS,
  getDefaultErrorMessage,
  isAppError,
  toAppError,
} from "../errors";

describe("errors", () => {
  it("maps stable error codes to HTTP statuses", () => {
    expect(ERROR_STATUS[ERROR_CODES.INVALID_ARGUMENT]).toBe(400);
    expect(ERROR_STATUS[ERROR_CODES.AUTH_REQUIRED]).toBe(401);
    expect(ERROR_STATUS[ERROR_CODES.FORBIDDEN]).toBe(403);
    expect(ERROR_STATUS[ERROR_CODES.NOT_FOUND]).toBe(404);
    expect(ERROR_STATUS[ERROR_CODES.CONFLICT]).toBe(409);
    expect(ERROR_STATUS[ERROR_CODES.VALIDATION_FAILED]).toBe(422);
    expect(ERROR_STATUS[ERROR_CODES.RATE_LIMITED]).toBe(429);
    expect(ERROR_STATUS[ERROR_CODES.INTERNAL_ERROR]).toBe(500);
    expect(ERROR_STATUS[ERROR_CODES.DEPENDENCY_UNAVAILABLE]).toBe(503);
  });

  it("creates safe AppError instances", () => {
    const error = new AppError(ERROR_CODES.NOT_FOUND, {
      details: { resource: "question" },
    });

    expect(isAppError(error)).toBe(true);
    expect(error.status).toBe(404);
    expect(error.code).toBe(ERROR_CODES.NOT_FOUND);
    expect(error.message).toBe(getDefaultErrorMessage(ERROR_CODES.NOT_FOUND));
    expect(error.details).toEqual({ resource: "question" });
  });

  it("keeps explicit safe messages and status overrides", () => {
    const error = new AppError(ERROR_CODES.CONFLICT, {
      status: 409,
      message: "目标已存在",
    });

    expect(error.message).toBe("目标已存在");
    expect(error.status).toBe(409);
  });

  it("does not expose an unknown error message or stack", () => {
    const original = new Error("SELECT * FROM private_table");
    original.stack = "private stack";

    const error = toAppError(original);

    expect(error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    expect(error.status).toBe(500);
    expect(error.message).toBe(getDefaultErrorMessage(ERROR_CODES.INTERNAL_ERROR));
    expect(error.message).not.toContain("private_table");
    expect(error.message).not.toContain("private stack");
    expect(error.internalCause).toBe(original);
  });

  it("returns an existing AppError unchanged", () => {
    const error = new AppError(ERROR_CODES.TOKEN_EXPIRED);

    expect(toAppError(error)).toBe(error);
  });
});
