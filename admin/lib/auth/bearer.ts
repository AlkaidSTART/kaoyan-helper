const BEARER_PATTERN = /^Bearer\s+(.+)$/i;

/** 读取 `Authorization: Bearer <token>`；缺失或格式不符返回 `null`。 */
export function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");

  if (header === null) {
    return null;
  }

  const match = BEARER_PATTERN.exec(header.trim());

  return match ? match[1].trim() : null;
}
