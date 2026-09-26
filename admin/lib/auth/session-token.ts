import { createHash, randomBytes } from "node:crypto";

export const SESSION_TTL_SECONDS = 43_200;

export const SESSION_TOKEN_BYTES = 32;

/** 32 字节 Base64URL 编码后的定长格式：43 个 `[A-Za-z0-9_-]` 字符。 */
export const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function generateSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isValidSessionToken(value: unknown): value is string {
  return typeof value === "string" && SESSION_TOKEN_PATTERN.test(value);
}
