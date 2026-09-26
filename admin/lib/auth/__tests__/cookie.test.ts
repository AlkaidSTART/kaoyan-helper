import { describe, expect, it } from "vitest";

import {
  SESSION_COOKIE_NAME,
  applySessionCookie,
  readSessionCookie,
  serializeClearedSessionCookie,
  serializeSessionCookie,
  shouldUseSecureCookie,
} from "../cookie";

const TOKEN = "a".repeat(43);

describe("serializeSessionCookie", () => {
  it("emits the hardened admin session cookie attributes", () => {
    const cookie = serializeSessionCookie({
      token: TOKEN,
      maxAgeSeconds: 43_200,
      expiresAt: new Date("2026-09-26T22:00:00.000Z"),
    });

    expect(cookie).toBe(
      [
        `${SESSION_COOKIE_NAME}=${TOKEN}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        "Max-Age=43200",
        "Expires=Sat, 26 Sep 2026 22:00:00 GMT",
      ].join("; "),
    );
    expect(cookie).not.toContain("Secure");
    expect(cookie).not.toContain("Domain=");
  });

  it("appends Secure only when explicitly requested", () => {
    const cookie = serializeSessionCookie({
      token: TOKEN,
      maxAgeSeconds: 60,
      expiresAt: new Date("2026-09-26T10:01:00.000Z"),
      secure: true,
    });

    expect(cookie.endsWith("; Secure")).toBe(true);
  });
});

describe("serializeClearedSessionCookie", () => {
  it("clears the cookie with both Max-Age=0 and a past expiry", () => {
    const cookie = serializeClearedSessionCookie();

    expect(cookie).toContain(`${SESSION_COOKIE_NAME}=;`);
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    expect(cookie).toContain("HttpOnly");
  });

  it("propagates the Secure flag when clearing", () => {
    expect(serializeClearedSessionCookie(true).endsWith("; Secure")).toBe(true);
  });
});

describe("readSessionCookie", () => {
  it("returns null for missing or empty headers", () => {
    expect(readSessionCookie(null)).toBeNull();
    expect(readSessionCookie(undefined)).toBeNull();
    expect(readSessionCookie("")).toBeNull();
    expect(readSessionCookie("other=1")).toBeNull();
    expect(readSessionCookie(`${SESSION_COOKIE_NAME}=`)).toBeNull();
  });

  it("extracts the admin session value from a mixed cookie header", () => {
    const header = `theme=dark; ${SESSION_COOKIE_NAME}=${TOKEN}; locale=zh-CN`;

    expect(readSessionCookie(header)).toBe(TOKEN);
  });

  it("tolerates segments without a value separator", () => {
    expect(readSessionCookie(`flag; ${SESSION_COOKIE_NAME}=${TOKEN}`)).toBe(TOKEN);
  });

  it("does not confuse similarly named cookies", () => {
    expect(readSessionCookie(`admin_session_backup=${TOKEN}`)).toBeNull();
  });
});

describe("shouldUseSecureCookie", () => {
  it("only enables Secure in production", () => {
    expect(shouldUseSecureCookie("production")).toBe(true);
    expect(shouldUseSecureCookie("development")).toBe(false);
    expect(shouldUseSecureCookie("test")).toBe(false);
    expect(shouldUseSecureCookie(undefined)).toBe(false);
  });
});

describe("applySessionCookie", () => {
  it("appends the cookie without replacing existing headers", () => {
    const response = new Response("{}", { headers: { "content-type": "application/json" } });
    const applied = applySessionCookie(response, "a=1; Path=/");

    expect(applied).toBe(response);
    expect(applied.headers.get("content-type")).toBe("application/json");
    expect(applied.headers.getSetCookie()).toEqual(["a=1; Path=/"]);
  });

  it("keeps previously set cookies when appending another", () => {
    const response = new Response(null);

    applySessionCookie(response, "first=1; Path=/");
    applySessionCookie(response, "second=2; Path=/");

    expect(response.headers.getSetCookie()).toEqual(["first=1; Path=/", "second=2; Path=/"]);
  });
});
