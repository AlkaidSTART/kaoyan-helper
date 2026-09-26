import { AppError, ERROR_CODES } from "../api/errors";
import { AuthService, toUserDto, type AuthUserDto } from "./auth-service";
import type { AuthUserRecord } from "./auth-repository";
import { readSessionCookie } from "./cookie";
import { hasPermission, type Permission } from "./permissions";
import { PrismaAuthRepository } from "./prisma-auth-repository";
import { PrismaUserSessionRepository } from "./prisma-user-session-repository";
import { readBearerToken } from "./bearer";
import { UserSessionService } from "./user-session-service";

export type ActorVia = "bearer" | "cookie";

export interface ActorUser {
  id: string;
  email: string;
  nickname: string | null;
  avatarUrl: string | null;
  examYear: number | null;
  role: string;
  isBanned: boolean;
}

export interface Actor {
  user: ActorUser;
  permissions: string[];
  via: ActorVia;
}

export interface SessionDto {
  user: AuthUserDto;
  permissions: string[];
  expiresAt: string;
}

function toActorUser(user: AuthUserRecord): ActorUser {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    examYear: user.examYear,
    role: user.role,
    isBanned: user.isBanned,
  };
}

/** 供 `GET /auth/session` 返回 Flutter 会话 DTO（与登录响应同构，不含令牌）。 */
export function actorFromUserSession(session: {
  user: AuthUserRecord;
  permissions: string[];
  expiresAt: string;
}): SessionDto {
  return {
    user: toUserDto(session.user),
    permissions: session.permissions,
    expiresAt: session.expiresAt,
  };
}

/** 供 `GET /auth/session` 返回 Admin 会话 DTO（AuthService 已返回同构结果）。 */
export function actorFromSession(session: SessionDto): SessionDto {
  return session;
}

/**
 * 统一身份解析：Flutter 走 `Authorization: Bearer`，管理后台走 HttpOnly Cookie。
 * 两条入口最终收敛为同一个 Actor；角色与权限每次从数据库重新读取，不做缓存。
 *
 * - 缺失凭证：401 `AUTH_REQUIRED`。
 * - access token 过期：401 `TOKEN_EXPIRED`；刷新凭证无效：401 `REFRESH_INVALID`。
 * - 已封禁：403 `USER_BANNED`；Cookie 会话非管理员：403 `ADMIN_REQUIRED`。
 */
export async function getActor(request: Request): Promise<Actor> {
  const bearerToken = readBearerToken(request);

  if (bearerToken !== null) {
    const sessionService = new UserSessionService({
      repository: new PrismaUserSessionRepository(),
    });
    const session = await sessionService.getSession(bearerToken);

    return {
      user: toActorUser(session.user),
      permissions: session.permissions,
      via: "bearer",
    };
  }

  const authService = new AuthService({
    repository: new PrismaAuthRepository(),
  });
  const session = await authService.getSession(readSessionCookie(request.headers.get("cookie")));

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      nickname: session.user.nickname,
      avatarUrl: session.user.avatarUrl,
      examYear: session.user.examYear,
      role: session.user.role,
      isBanned: session.user.isBanned,
    },
    permissions: session.permissions,
    via: "cookie",
  };
}

/** 路由级权限检查；服务层仍需复核资源所有权，不能以本检查替代。 */
export function requirePermission(actor: Actor, required: Permission): void {
  if (!hasPermission(actor.permissions, required)) {
    throw new AppError(ERROR_CODES.FORBIDDEN, {
      details: { permission: required },
    });
  }
}
