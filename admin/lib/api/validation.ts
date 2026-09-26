import type { ZodType } from "zod";

import { AppError, ERROR_CODES, type JsonValue } from "./errors";

export const IMMUTABLE_FIELDS = [
  "role",
  "isBanned",
  "userId",
  "creatorId",
  "isCorrect",
  "permissions",
] as const;

export interface ReadAndValidateJsonOptions {
  additionalImmutableFields?: readonly string[];
}

export async function parseJsonRequest(request: Request): Promise<unknown> {
  let rawBody: string;

  try {
    rawBody = await request.text();
  } catch {
    throw new AppError(ERROR_CODES.INVALID_ARGUMENT);
  }

  if (rawBody.trim().length === 0) {
    throw new AppError(ERROR_CODES.INVALID_ARGUMENT);
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new AppError(ERROR_CODES.INVALID_ARGUMENT);
  }
}

export function assertNoImmutableFields(
  value: unknown,
  additionalImmutableFields: readonly string[] = [],
): void {
  if (!isObject(value)) {
    return;
  }

  const protectedFields = new Set<string>([
    ...IMMUTABLE_FIELDS,
    ...additionalImmutableFields,
  ]);
  const fields = Object.keys(value).filter((field) => protectedFields.has(field));

  if (fields.length > 0) {
    throw new AppError(ERROR_CODES.IMMUTABLE_FIELD, {
      details: { fields: fields.sort() },
    });
  }
}

export function validateWithSchema<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      details: {
        issues: result.error.issues.map((issue) => ({
          path: normalizeIssuePath(issue.path),
          message: getSafeValidationMessage(issue.code),
        })),
      },
    });
  }

  return result.data;
}

export async function readAndValidateJson<T>(
  request: Request,
  schema: ZodType<T>,
  options: ReadAndValidateJsonOptions = {},
): Promise<T> {
  const body = await parseJsonRequest(request);

  assertNoImmutableFields(body, options.additionalImmutableFields);

  return validateWithSchema(schema, body);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeIssuePath(path: readonly PropertyKey[] | undefined): JsonValue[] {
  return (path ?? []).map((segment) =>
    typeof segment === "number" ? segment : String(segment),
  );
}

function getSafeValidationMessage(code: string): string {
  switch (code) {
    case "unrecognized_keys":
      return "包含未知字段";
    case "invalid_type":
      return "字段类型不正确";
    case "too_big":
    case "too_small":
      return "字段长度或数值超出范围";
    case "invalid_format":
      return "字段格式不正确";
    case "invalid_value":
      return "字段取值不正确";
    case "not_multiple_of":
      return "字段取值不符合倍数要求";
    case "invalid_union":
      return "字段不符合任一允许的结构";
    case "invalid_key":
      return "对象键不合法";
    case "invalid_element":
      return "数组元素不合法";
    default:
      return "字段不合法";
  }
}
