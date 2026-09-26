import { Prisma, PrismaClient } from "@/generated/prisma/client";

import { AppError, ERROR_CODES } from "../api/errors";
import { PrismaClientConfigurationError, getPrismaClient } from "../db/prisma";
import type { AuthUserRecord } from "./auth-repository";
import type {
  CreateUserSessionInput,
  RotateUserSessionInput,
  UpsertUserByEmailInput,
  UserSessionRecord,
  UserSessionRepository,
} from "./user-session-repository";

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

interface PrismaUserSessionRow {
  id: string;
  tokenHash: string;
  clientType: string;
  deviceName: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  lastSeenAt: Date;
  user: PrismaUserRow;
}

/**
 * Prisma 实现的用户（Flutter Bearer）会话仓储。
 *
 * - 只负责查询、事务和 Prisma 异常映射，绝不把原始 Prisma 错误抛给上层。
 * - 未命中查询返回 `null`，让服务层决定业务错误码。
 * - 惰性解析 Prisma Client：构造仓储不建立连接。
 */
export class PrismaUserSessionRepository implements UserSessionRepository {
  private readonly injectedClient?: PrismaClient;

  private resolvedClient?: PrismaClient;

  constructor(client?: PrismaClient) {
    this.injectedClient = client;
  }

  private get client(): PrismaClient {
    if (!this.resolvedClient) {
      this.resolvedClient = this.injectedClient ?? getPrismaClient();
    }

    return this.resolvedClient;
  }

  async findSessionByTokenHash(tokenHash: string): Promise<UserSessionRecord | null> {
    const session = await this.run(() =>
      this.client.userSession.findUnique({
        where: { tokenHash },
        include: { user: true },
      }),
    );

    if (!session) {
      return null;
    }

    return toSessionRecord(session as PrismaUserSessionRow);
  }

  async findUserById(userId: string): Promise<AuthUserRecord | null> {
    const user = await this.run(() =>
      this.client.user.findUnique({ where: { id: userId } }),
    );

    return user ? toUserRecord(user as PrismaUserRow) : null;
  }

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const user = await this.run(() =>
      this.client.user.findFirst({
        where: { email: { equals: normalizeEmail(email), mode: Prisma.QueryMode.insensitive } },
      }),
    );

    return user ? toUserRecord(user as PrismaUserRow) : null;
  }

  async upsertUserByEmail(input: UpsertUserByEmailInput): Promise<AuthUserRecord> {
    const email = normalizeEmail(input.email);

    const user = await this.run(() =>
      this.client.$transaction(async (tx) => {
        const existing = await tx.user.findFirst({
          where: { email: { equals: email, mode: Prisma.QueryMode.insensitive } },
        });

        if (existing) {
          return existing;
        }

        return tx.user.create({
          data: {
            id: input.id ?? crypto.randomUUID(),
            email,
            nickname: input.nickname ?? email.split("@")[0] ?? null,
          },
        });
      }),
    );

    return toUserRecord(user as PrismaUserRow);
  }

  async createSession(input: CreateUserSessionInput): Promise<UserSessionRecord> {
    const session = await this.run(() =>
      this.client.userSession.create({
        data: {
          tokenHash: input.tokenHash,
          userId: input.userId,
          clientType: input.clientType,
          deviceName: input.deviceName,
          expiresAt: input.expiresAt,
          lastSeenAt: input.now,
        },
        include: { user: true },
      }),
    );

    return toSessionRecord(session as PrismaUserSessionRow);
  }

  async rotateSession(input: RotateUserSessionInput): Promise<UserSessionRecord | null> {
    return this.run(() =>
      this.client.$transaction(async (tx) => {
        const revoked = await tx.userSession.updateMany({
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

        const created = await tx.userSession.create({
          data: {
            tokenHash: input.nextTokenHash,
            userId: input.userId,
            clientType: input.clientType,
            deviceName: input.deviceName,
            expiresAt: input.expiresAt,
            lastSeenAt: input.now,
          },
          include: { user: true },
        });

        return toSessionRecord(created as PrismaUserSessionRow);
      }),
    );
  }

  async revokeSessionByTokenHash(tokenHash: string, revokedAt: Date): Promise<boolean> {
    const result = await this.run(() =>
      this.client.userSession.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt },
      }),
    );

    return result.count > 0;
  }

  async touchSession(sessionId: string, lastSeenAt: Date): Promise<void> {
    await this.run(() =>
      this.client.userSession.updateMany({
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

function toSessionRecord(session: PrismaUserSessionRow): UserSessionRecord {
  return {
    id: session.id,
    tokenHash: session.tokenHash,
    clientType: session.clientType,
    deviceName: session.deviceName,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt,
    lastSeenAt: session.lastSeenAt,
    user: toUserRecord(session.user),
  };
}

/**
 * Prisma 错误映射：原始错误只保留在 `cause` 中，避免泄漏 SQL、表名或连接串。
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
