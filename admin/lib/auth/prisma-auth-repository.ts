import { Prisma, PrismaClient } from "@/generated/prisma/client";

import { AppError, ERROR_CODES } from "../api/errors";
import { PrismaClientConfigurationError, getPrismaClient } from "../db/prisma";
import type {
  AdminCredentialRecord,
  AdminSessionRecord,
  AuthRepository,
  AuthUserRecord,
  CreateSessionInput,
  RotateSessionInput,
} from "./auth-repository";

interface PrismaUserRow {
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

interface PrismaAdminCredentialRow {
  passwordHash: string;
  user: PrismaUserRow;
}

interface PrismaAdminSessionRow {
  id: string;
  tokenHash: string;
  deviceName: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  lastSeenAt: Date;
  user: PrismaUserRow;
}

/**
 * Prisma 实现的认证仓储。
 *
 * - 只负责查询、事务和 Prisma 异常映射，绝不把原始 Prisma 错误抛给上层。
 * - 未命中查询返回 `null`，让 `AuthService` 决定业务错误码。
 * - 惰性解析 Prisma Client：构造仓储不建立连接，未配置 `DATABASE_URL` 时也不会
 *   因为“无 Cookie / 非法 token”这类早退路径而被误判为依赖不可用。
 */
export class PrismaAuthRepository implements AuthRepository {
  private readonly injectedClient?: PrismaClient;

  private resolvedClient?: PrismaClient;

  constructor(client?: PrismaClient) {
    this.injectedClient = client;
  }

  /** 首次真正执行数据库操作时才创建（或复用注入的）Prisma Client。 */
  private get client(): PrismaClient {
    if (!this.resolvedClient) {
      this.resolvedClient = this.injectedClient ?? getPrismaClient();
    }

    return this.resolvedClient;
  }

  async findCredentialByEmail(email: string): Promise<AdminCredentialRecord | null> {
    const normalizedEmail = normalizeEmail(email);

    const credential = await this.run(() =>
      this.client.adminCredential.findFirst({
        where: {
          user: {
            email: { equals: normalizedEmail, mode: Prisma.QueryMode.insensitive },
          },
        },
        include: { user: true },
      }),
    );

    if (!credential) {
      return null;
    }

    const row = credential as PrismaAdminCredentialRow;

    return {
      passwordHash: row.passwordHash,
      user: toUserRecord(row.user),
    };
  }

  async findSessionByTokenHash(tokenHash: string): Promise<AdminSessionRecord | null> {
    const session = await this.run(() =>
      this.client.adminSession.findUnique({
        where: { tokenHash },
        include: { user: true },
      }),
    );

    if (!session) {
      return null;
    }

    return toSessionRecord(session as PrismaAdminSessionRow);
  }

  async createSession(input: CreateSessionInput): Promise<AdminSessionRecord> {
    const session = await this.run(() =>
      this.client.adminSession.create({
        data: {
          tokenHash: input.tokenHash,
          userId: input.userId,
          deviceName: input.deviceName,
          expiresAt: input.expiresAt,
          lastSeenAt: input.now,
        },
        include: { user: true },
      }),
    );

    return toSessionRecord(session as PrismaAdminSessionRow);
  }

  async rotateSession(input: RotateSessionInput): Promise<AdminSessionRecord | null> {
    return this.run(() =>
      this.client.$transaction(async (tx) => {
        const revoked = await tx.adminSession.updateMany({
          where: {
            tokenHash: input.currentTokenHash,
            revokedAt: null,
            expiresAt: { gt: input.now },
          },
          data: { revokedAt: input.now },
        });

        if (revoked.count === 0) {
          return null;
        }

        const created = await tx.adminSession.create({
          data: {
            tokenHash: input.nextTokenHash,
            userId: input.userId,
            deviceName: input.deviceName,
            expiresAt: input.expiresAt,
            lastSeenAt: input.now,
          },
          include: { user: true },
        });

        return toSessionRecord(created as PrismaAdminSessionRow);
      }),
    );
  }

  async revokeSessionByTokenHash(tokenHash: string, revokedAt: Date): Promise<boolean> {
    const result = await this.run(() =>
      this.client.adminSession.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt },
      }),
    );

    return result.count > 0;
  }

  async touchSession(sessionId: string, lastSeenAt: Date): Promise<void> {
    await this.run(() =>
      this.client.adminSession.updateMany({
        where: { id: sessionId },
        data: { lastSeenAt },
      }),
    );
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw mapPrismaError(error);
    }
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toUserRecord(user: PrismaUserRow): AuthUserRecord {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    examYear: user.examYear,
    role: user.role,
    isBanned: user.isBanned,
    bannedUntil: user.bannedUntil,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function toSessionRecord(session: PrismaAdminSessionRow): AdminSessionRecord {
  return {
    id: session.id,
    tokenHash: session.tokenHash,
    deviceName: session.deviceName,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt,
    lastSeenAt: session.lastSeenAt,
    user: toUserRecord(session.user),
  };
}

/**
 * Prisma 错误映射：原始错误只保留在 `cause` 中，避免泄漏 SQL、表名或连接串。
 * 连接、查询与初始化失败统一视为依赖不可用；其余视为内部错误。
 */
function mapPrismaError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (
    error instanceof PrismaClientConfigurationError ||
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    return new AppError(ERROR_CODES.DEPENDENCY_UNAVAILABLE, { cause: error });
  }

  return new AppError(ERROR_CODES.INTERNAL_ERROR, { cause: error });
}
