import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "admin_session";

const PROTECTED_PREFIXES = ["/dashboard", "/users", "/questions", "/ugc", "/schools"];

/**
 * 导航守卫第一层（Next.js 16 proxy，替代已弃用的 middleware）：
 * 只做 Cookie 存在性判断与重定向；真实会话校验在管理布局与 Route Handler 完成。
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE);

  if (pathname === "/login" && hasSessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);

    loginUrl.searchParams.set("from", pathname);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/v1|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp|ico)).*)"],
};
