/**
 * 认证领域的仓储契约。
 *
 * 该文件只描述数据结构与数据库无关的接口，不导入 Prisma 或 Next.js，
 * 便于 `AuthService` 使用 fake repository 做单元测试。
 */

export interface AuthUserRecord {
  id: string;
  email: string;
  nickname: string | null;
  avatarUrl: string | null;
  examYear: number | null;
  role: string;
  isBanned: boolean;
  bannedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminCredentialRecord {
  passwordHash: string;
  user: AuthUserRecord;
}

export interface AdminSessionRecord {
  id: string;
  tokenHash: string;
  deviceName: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  lastSeenAt: Date;
  user: AuthUserRecord;
}

export interface CreateSessionInput {
  userId: string;
  tokenHash: string;
  deviceName: string | null;
  expiresAt: Date;
  now: Date;
}

export interface RotateSessionInput {
  userId: string;
  currentTokenHash: string;
  nextTokenHash: string;
  deviceName: string | null;
  expiresAt: Date;
  now: Date;
}

export interface AuthRepository {
  findCredentialByEmail(email: string): Promise<AdminCredentialRecord | null>;

  findSessionByTokenHash(tokenHash: string): Promise<AdminSessionRecord | null>;

  createSession(input: CreateSessionInput): Promise<AdminSessionRecord>;

  /**
   * 原子轮换：在事务内条件撤销旧会话并创建新会话。
   * 旧会话不存在、已撤销、已过期或已被并发请求撤销时返回 `null`。
   */
  rotateSession(input: RotateSessionInput): Promise<AdminSessionRecord | null>;

  /** 撤销未撤销的会话，返回是否实际影响了一行。 */
  revokeSessionByTokenHash(tokenHash: string, revokedAt: Date): Promise<boolean>;

  /** 更新会话最近活跃时间；不存在的会话静默跳过。 */
  touchSession(sessionId: string, lastSeenAt: Date): Promise<void>;
}
