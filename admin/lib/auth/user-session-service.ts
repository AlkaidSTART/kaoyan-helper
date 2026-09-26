import { randomBytes } from "node:crypto";

import { AppError, ERROR_CODES, type ErrorCode } from "../api/errors";
import { formatUtcTimestamp } from "../api/response";
import type { AuthUserRecord } from "./auth-repository";
import { getPermissionsForRole } from "./permissions";
import { hashSessionToken } from "./session-token";
import type {
  UserSessionRecord,
  UserSessionRepository,
} from "./user-session-repository";

/** access token 前缀；refresh token 使用 `usr_`，二者共用同一张会话表。 */
export const ACCESS_TOKEN_PREFIX = "usa_";

export const REFRESH_TOKEN_PREFIX = "usr_";

export const ACCESS_TOKEN_TTL_SECONDS = 7_200;

export const REFRESH_TOKEN_TTL_SECONDS = 2_592_000;

export const USER_TOKEN_PATTERN = /^us[ar]_[A-Za-z0-9_-]{43}$/;

export interface UserTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserSessionDto {
  user: AuthUserRecord;
  permissions: string[];
  expiresAt: string;
}

export interface UserSessionServiceDependencies {
  repository: UserSessionRepository;
  now?: () => Date;
  generateToken?: (kind: "access" | "refresh") => string;
  ttl?: { accessSeconds?: number; refreshSeconds?: number };
}

function generateUserToken(kind: "access" | "refresh"): string {
  const encoded = randomBytes(32).toString("base64url");

  return (kind === "access" ? ACCESS_TOKEN_PREFIX : REFRESH_TOKEN_PREFIX) + encoded;
}

/**
 * Flutter Bearer 会话状态机。
 *
 * - 登录/刷新签发 access + refresh 两个不透明令牌，SHA-256 摘要入库。
 * - 刷新在仓储事务内原子轮换 refresh 行并新建 access 行。
 * - 不依赖 Prisma、Next.js，便于注入 fake 仓储做单元测试。
 */
export class UserSessionService {
  private readonly repository: UserSessionRepository;

  private readonly now: () => Date;

  private readonly generateTokenFn: (kind: "access" | "refresh") => string;

  private readonly accessTtlSeconds: number;

  private readonly refreshTtlSeconds: number;

  constructor(dependencies: UserSessionServiceDependencies) {
    this.repository = dependencies.repository;
    this.now = dependencies.now ?? (() => new Date());
    this.generateTokenFn = dependencies.generateToken ?? generateUserToken;
    this.accessTtlSeconds = dependencies.ttl?.accessSeconds ?? ACCESS_TOKEN_TTL_SECONDS;
    this.refreshTtlSeconds = dependencies.ttl?.refreshSeconds ?? REFRESH_TOKEN_TTL_SECONDS;
  }

  async createSessionPair(
    user: AuthUserRecord,
    options: { clientType?: string; deviceName?: string | null } = {},
  ): Promise<UserTokenPair> {
    const now = this.now();
    const accessToken = this.generateTokenFn("access");
    const refreshToken = this.generateTokenFn("refresh");
    const clientType = options.clientType ?? "flutter";

    await this.repository.createSession({
      userId: user.id,
      tokenHash: hashSessionToken(accessToken),
      clientType,
      deviceName: options.deviceName ?? null,
      expiresAt: new Date(now.getTime() + this.accessTtlSeconds * 1_000),
      now,
    });
    await this.repository.createSession({
      userId: user.id,
      tokenHash: hashSessionToken(refreshToken),
      clientType,
      deviceName: options.deviceName ?? null,
      expiresAt: new Date(now.getTime() + this.refreshTtlSeconds * 1_000),
      now,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTtlSeconds,
    };
  }

  async refresh(rawRefreshToken: string | null): Promise<UserTokenPair> {
    const tokenHash = readTokenHash(rawRefreshToken, REFRESH_TOKEN_PREFIX, ERROR_CODES.REFRESH_INVALID);
    const now = this.now();
    const session = await this.requireSession(tokenHash, ERROR_CODES.REFRESH_INVALID);

    if (session.revokedAt !== null || isExpired(session, now)) {
      throw new AppError(ERROR_CODES.REFRESH_INVALID);
    }

    if (isActivelyBanned(session.user, now)) {
      throw new AppError(ERROR_CODES.USER_BANNED);
    }

    const accessToken = this.generateTokenFn("access");
    const refreshToken = this.generateTokenFn("refresh");

    const rotated = await this.repository.rotateSession({
      userId: session.user.id,
      currentTokenHash: tokenHash,
      nextTokenHash: hashSessionToken(refreshToken),
      clientType: session.clientType,
      deviceName: session.deviceName,
      expiresAt: new Date(now.getTime() + this.refreshTtlSeconds * 1_000),
      now,
    });

    if (!rotated) {
      // 条件撤销影响 0 行：并发请求已经用掉该 refresh token。
      throw new AppError(ERROR_CODES.REFRESH_INVALID);
    }

    await this.repository.createSession({
      userId: session.user.id,
      tokenHash: hashSessionToken(accessToken),
      clientType: session.clientType,
      deviceName: session.deviceName,
      expiresAt: new Date(now.getTime() + this.accessTtlSeconds * 1_000),
      now,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTtlSeconds,
    };
  }

  async logout(rawRefreshToken: string | null): Promise<void> {
    if (!isUserToken(rawRefreshToken, REFRESH_TOKEN_PREFIX)) {
      return;
    }

    await this.repository.revokeSessionByTokenHash(hashSessionToken(rawRefreshToken), this.now());
  }

  async getSession(rawAccessToken: string | null): Promise<UserSessionDto> {
    const tokenHash = readTokenHash(rawAccessToken, ACCESS_TOKEN_PREFIX, ERROR_CODES.AUTH_REQUIRED);
    const now = this.now();
    const session = await this.requireSession(tokenHash, ERROR_CODES.AUTH_REQUIRED);
    if (session.revokedAt !== null) {
      throw new AppError(ERROR_CODES.AUTH_REQUIRED);
    }

    if (isExpired(session, now)) {
      throw new AppError(ERROR_CODES.TOKEN_EXPIRED);
    }

    if (isActivelyBanned(session.user, now)) {
      throw new AppError(ERROR_CODES.USER_BANNED);
    }

    await this.repository.touchSession(session.id, now);

    return {
      user: session.user,
      permissions: getPermissionsForRole(session.user.role),
      expiresAt: formatUtcTimestamp(session.expiresAt),
    };
  }

  private async requireSession(tokenHash: string, errorCode: ErrorCode): Promise<UserSessionRecord> {
    const session = await this.repository.findSessionByTokenHash(tokenHash);

    if (!session) {
      throw new AppError(errorCode);
    }

    return session;
  }
}

/** 封禁中：`is_banned` 为真且 `banned_until` 为空或尚未过期。 */
export function isActivelyBanned(user: AuthUserRecord, now: Date): boolean {
  if (!user.isBanned) {
    return false;
  }

  return user.bannedUntil === null || user.bannedUntil.getTime() >= now.getTime();
}

function isExpired(session: UserSessionRecord, now: Date): boolean {
  return session.expiresAt.getTime() <= now.getTime();
}

function isUserToken(value: unknown, prefix: string): value is string {
  return (
    typeof value === "string" &&
    value.startsWith(prefix) &&
    USER_TOKEN_PATTERN.test(value)
  );
}

function readTokenHash(rawToken: string | null, prefix: string, errorCode: ErrorCode): string {
  if (!isUserToken(rawToken, prefix)) {
    throw new AppError(errorCode);
  }

  return hashSessionToken(rawToken);
}
