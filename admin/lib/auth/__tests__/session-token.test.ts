import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  SESSION_TOKEN_BYTES,
  SESSION_TTL_SECONDS,
  generateSessionToken,
  hashSessionToken,
  isValidSessionToken,
} from "../session-token";

describe("session token constants", () => {
  it("uses a 12 hour TTL and 32 bytes of entropy", () => {
    expect(SESSION_TTL_SECONDS).toBe(43_200);
    expect(SESSION_TOKEN_BYTES).toBe(32);
  });
});

describe("generateSessionToken", () => {
  it("returns a 43 character Base64URL token carrying 32 bytes", () => {
    const token = generateSessionToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, "base64url")).toHaveLength(SESSION_TOKEN_BYTES);
  });

  it("returns a different token on each call", () => {
    const tokens = new Set(Array.from({ length: 16 }, () => generateSessionToken()));

    expect(tokens.size).toBe(16);
  });
});

describe("hashSessionToken", () => {
  it("returns the lowercase hex SHA-256 digest", () => {
    const digest = hashSessionToken("token-value");

    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).toBe(createHash("sha256").update("token-value").digest("hex"));
  });

  it("is deterministic and never equals the raw token", () => {
    const token = generateSessionToken();

    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
    expect(hashSessionToken(token)).not.toBe(token);
  });

  it("changes when a single character changes", () => {
    expect(hashSessionToken("a".repeat(43))).not.toBe(hashSessionToken("a".repeat(42) + "b"));
  });
});

describe("isValidSessionToken", () => {
  it("accepts exactly 43 Base64URL characters", () => {
    expect(isValidSessionToken("a".repeat(43))).toBe(true);
    expect(isValidSessionToken("A0-_".repeat(10) + "AAA")).toBe(true);
  });

  it("rejects wrong lengths, forbidden characters and non-strings", () => {
    expect(isValidSessionToken("a".repeat(42))).toBe(false);
    expect(isValidSessionToken("a".repeat(44))).toBe(false);
    expect(isValidSessionToken("a".repeat(42) + "!")).toBe(false);
    expect(isValidSessionToken("a".repeat(43) + " ")).toBe(false);
    expect(isValidSessionToken(null)).toBe(false);
    expect(isValidSessionToken(undefined)).toBe(false);
    expect(isValidSessionToken(123)).toBe(false);
    expect(isValidSessionToken({})).toBe(false);
  });
});
