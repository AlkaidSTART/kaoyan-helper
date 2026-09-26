/**
 * 用户（Flutter Bearer）会话仓储契约。
 *
 * 与 `auth-repository.ts` 相同的风格：只描述数据结构与数据库无关的接口，
 * 便于 `UserSessionService` 使用 fake repository 做单元测试。
 */

import type { AuthUserRecord } from "./auth-repository";

export interface UserSessionRecord {
  id: string;
  tokenHash: string;
  clientType: string;
  deviceName: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  lastSeenAt: Date;
  user: AuthUserRecord;
}

export interface CreateUserSessionInput {
  userId: string;
  tokenHash: string;
  clientType: string;
  deviceName: string | null;
  expiresAt: Date;
  now: Date;
}

export interface RotateUserSessionInput {
  userId: string;
  currentTokenHash: string;
  nextTokenHash: string;
  clientType: string;
  deviceName: string | null;
  expiresAt: Date;
  now: Date;
}

export interface UserSessionRepository {
  findSessionByTokenHash(tokenHash: string): Promise<UserSessionRecord | null>;

  findUserById(userId: string): Promise<AuthUserRecord | null>;

  /**
   * 按邮箱（规范化小写）查找用户；登录流程在 OTP 校验通过后 upsert 用户。
   */
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;

  upsertUserByEmail(input: UpsertUserByEmailInput): Promise<AuthUserRecord>;

  createSession(input: CreateUserSessionInput): Promise<UserSessionRecord>;

  /**
   * 原子轮换：在事务内条件撤销旧会话并创建新会话。
   * 旧会话不存在、已撤销、已过期或已被并发请求撤销时返回 `null`。
   */
  rotateSession(input: RotateUserSessionInput): Promise<UserSessionRecord | null>;

  /** 撤销未撤销的会话，返回是否实际影响了一行。 */
  revokeSessionByTokenHash(tokenHash: string, revokedAt: Date): Promise<boolean>;

  /** 更新会话最近活跃时间；不存在的会话静默跳过。 */
  touchSession(sessionId: string, lastSeenAt: Date): Promise<void>;
}

export interface UpsertUserByEmailInput {
  id: string | null;
  email: string;
  nickname: string | null;
  now: Date;
}
