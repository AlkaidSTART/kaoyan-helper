import { AppError, ERROR_CODES, type ErrorCode } from "../api/errors";
import { formatUtcTimestamp } from "../api/response";
import type { AdminSessionRecord, AuthRepository, AuthUserRecord } from "./auth-repository";
import { performDummyPasswordCheck, verifyPassword } from "./password";
import { getPermissionsForRole } from "./permissions";
import {
  SESSION_TTL_SECONDS,
  generateSessionToken,
  hashSessionToken,
  isValidSessionToken,
} from "./session-token";

export const ADMIN_CLIENT_TYPE = "admin-web";

export interface AuthUserDto {
  id: string;
  email: string;
  nickname: string | null;
  avatarUrl: string | null;
  role: string;
  isBanned: boolean;
  examYear: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface PasswordLoginInput {
  email: string;
  password: string;
  clientType: string;
  deviceName: string | null;
}

export interface PasswordLoginResult {
  user: AuthUserDto;
  token: string;
  expiresAt: Date;
}

export interface RefreshResult {
  token: string;
  expiresAt: Date;
  expiresIn: number;
}

export interface SessionResult {
  user: AuthUserDto;
  permissions: string[];
  expiresAt: string;
}

export interface AuthServiceDependencies {
  repository: AuthRepository;
  now?: () => Date;
  generateToken?: () => string;
  verifyPassword?: (password: string, passwordHash: string) => Promise<boolean>;
  performDummyPasswordCheck?: (password: string) => Promise<void>;
  ttlSeconds?: number;
}

/**
 * 认证状态机。不依赖 Prisma、Next.js 或具体数据库，便于注入 fake 仓储做单元测试。
 */
export class AuthService {
  private readonly repository: AuthRepository;
  private readonly now: () => Date;
  private readonly generateToken: () => string;
  private readonly verifyPasswordFn: (password: string, passwordHash: string) => Promise<boolean>;
  private readonly dummyPasswordCheckFn: (password: string) => Promise<void>;
  private readonly ttlSeconds: number;

  constructor(dependencies: AuthServiceDependencies) {
    this.repository = dependencies.repository;
    this.now = dependencies.now ?? (() => new Date());
    this.generateToken = dependencies.generateToken ?? generateSessionToken;
    this.verifyPasswordFn = dependencies.verifyPassword ?? verifyPassword;
    this.dummyPasswordCheckFn = dependencies.performDummyPasswordCheck ?? performDummyPasswordCheck;
    this.ttlSeconds = dependencies.ttlSeconds ?? SESSION_TTL_SECONDS;
  }

  async loginWithPassword(input: PasswordLoginInput): Promise<PasswordLoginResult> {
    if (input.clientType !== ADMIN_CLIENT_TYPE) {
      throw new AppError(ERROR_CODES.PROVIDER_UNSUPPORTED);
    }

    const now = this.now();
    const credential = await this.repository.findCredentialByEmail(
      input.email.trim().toLowerCase(),
    );

    if (!credential) {
      // 用户不存在时仍执行一次等价开销的哈希校验，降低账号枚举时序差异。
      await this.dummyPasswordCheckFn(input.password);

      throw new AppError(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    }

    const passwordMatches = await this.verifyPasswordFn(input.password, credential.passwordHash);

    if (!passwordMatches) {
      throw new AppError(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    }

    if (credential.user.role !== "admin") {
      throw new AppError(ERROR_CODES.ADMIN_REQUIRED);
    }

    if (isActivelyBanned(credential.user, now)) {
      throw new AppError(ERROR_CODES.USER_BANNED);
    }

    const token = this.generateToken();
    const expiresAt = this.expiresAtFrom(now);

    await this.repository.createSession({
      userId: credential.user.id,
      tokenHash: hashSessionToken(token),
      deviceName: input.deviceName,
      expiresAt,
      now,
    });

    return {
      user: toUserDto(credential.user),
      token,
      expiresAt,
    };
  }

  async refresh(rawToken: string | null): Promise<RefreshResult> {
    const tokenHash = readTokenHash(rawToken, ERROR_CODES.REFRESH_INVALID);
    const now = this.now();
    const session = await this.requireSession(tokenHash, ERROR_CODES.REFRESH_INVALID);

    if (session.revokedAt !== null || isExpired(session, now)) {
      throw new AppError(ERROR_CODES.REFRESH_INVALID);
    }

    if (session.user.role !== "admin") {
      throw new AppError(ERROR_CODES.ADMIN_REQUIRED);
    }

    if (isActivelyBanned(session.user, now)) {
      throw new AppError(ERROR_CODES.USER_BANNED);
    }

    const token = this.generateToken();
    const expiresAt = this.expiresAtFrom(now);

    const rotated = await this.repository.rotateSession({
      userId: session.user.id,
      currentTokenHash: tokenHash,
      nextTokenHash: hashSessionToken(token),
      deviceName: session.deviceName,
      expiresAt,
      now,
    });

    if (!rotated) {
      // 条件撤销影响 0 行：并发请求已经用掉该 refresh token。
      throw new AppError(ERROR_CODES.REFRESH_INVALID);
    }

    return { token, expiresAt, expiresIn: this.ttlSeconds };
  }

  async logout(rawToken: string | null): Promise<void> {
    if (!isValidSessionToken(rawToken)) {
      return;
    }

    await this.repository.revokeSessionByTokenHash(hashSessionToken(rawToken), this.now());
  }

  async getSession(rawToken: string | null): Promise<SessionResult> {
    const tokenHash = readTokenHash(rawToken, ERROR_CODES.AUTH_REQUIRED);
    const now = this.now();
    const session = await this.requireSession(tokenHash, ERROR_CODES.AUTH_REQUIRED);

    if (session.revokedAt !== null) {
      throw new AppError(ERROR_CODES.AUTH_REQUIRED);
    }

    if (isExpired(session, now)) {
      throw new AppError(ERROR_CODES.TOKEN_EXPIRED);
    }

    if (session.user.role !== "admin") {
      throw new AppError(ERROR_CODES.ADMIN_REQUIRED);
    }

    if (isActivelyBanned(session.user, now)) {
      throw new AppError(ERROR_CODES.USER_BANNED);
    }

    await this.repository.touchSession(session.id, now);

    return {
      user: toUserDto(session.user),
      permissions: getPermissionsForRole(session.user.role),
      expiresAt: formatUtcTimestamp(session.expiresAt),
    };
  }

  private expiresAtFrom(now: Date): Date {
    return new Date(now.getTime() + this.ttlSeconds * 1_000);
  }

  private async requireSession(tokenHash: string, errorCode: ErrorCode): Promise<AdminSessionRecord> {
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

function isExpired(session: AdminSessionRecord, now: Date): boolean {
  return session.expiresAt.getTime() <= now.getTime();
}

function readTokenHash(rawToken: string | null, errorCode: ErrorCode): string {
  if (!isValidSessionToken(rawToken)) {
    throw new AppError(errorCode);
  }

  return hashSessionToken(rawToken);
}

export function toUserDto(user: AuthUserRecord): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isBanned: user.isBanned,
    examYear: user.examYear,
    createdAt: formatUtcTimestamp(user.createdAt),
    updatedAt: formatUtcTimestamp(user.updatedAt),
  };
}
