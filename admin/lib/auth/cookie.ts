export const SESSION_COOKIE_NAME = "admin_session";

export interface SerializeSessionCookieOptions {
  token: string;
  maxAgeSeconds: number;
  expiresAt: Date;
  secure?: boolean;
}

export function serializeSessionCookie(options: SerializeSessionCookieOptions): string {
  const attributes = [
    `${SESSION_COOKIE_NAME}=${options.token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${options.maxAgeSeconds}`,
    `Expires=${options.expiresAt.toUTCString()}`,
  ];

  if (options.secure) {
    attributes.push("Secure");
  }

  return attributes.join("; ");
}

/** 清空 Cookie：`Max-Age=0` 与过去时间同时给出，兼容不支持 `Max-Age` 的客户端。 */
export function serializeClearedSessionCookie(secure = false): string {
  return serializeSessionCookie({
    token: "",
    maxAgeSeconds: 0,
    expiresAt: new Date(0),
    secure,
  });
}

export function readSessionCookie(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const segment of cookieHeader.split(";")) {
    const separatorIndex = segment.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    if (segment.slice(0, separatorIndex).trim() !== SESSION_COOKIE_NAME) {
      continue;
    }

    const value = segment.slice(separatorIndex + 1).trim();

    return value.length > 0 ? value : null;
  }

  return null;
}

export function shouldUseSecureCookie(nodeEnv: string | undefined = process.env.NODE_ENV): boolean {
  return nodeEnv === "production";
}

export function applySessionCookie(response: Response, cookie: string): Response {
  response.headers.append("set-cookie", cookie);

  return response;
}
