import { Prisma, PrismaClient } from "@/generated/prisma/client";

import { AppError, ERROR_CODES } from "../../api/errors";
import { PrismaClientConfigurationError, getPrismaClient } from "../../db/prisma";
import type {
  MeRepository,
  MeTargetRow,
  MeUserRow,
  TargetInput,
  UpdateProfileInput,
} from "./me-service";

interface PrismaMeUserRow {
  id: string;
  email: string;
  nickname: string | null;
  avatarUrl: string | null;
  examYear: number | null;
  role: string;
  isBanned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PrismaTargetRow {
  schoolId: string;
  school: { name: string };
  type: string;
  majorCode: string | null;
  majorName: string | null;
  updatedAt: Date;
}

/**
 * Prisma 实现的 Me 仓储。目标院校整体替换在单事务内完成，
 * 保证“最多 3 条、仅 1 条主目标”不会被并发写入破坏。
 */
export class PrismaMeRepository implements MeRepository {
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

  async findUserById(userId: string): Promise<MeUserRow | null> {
    const user = await this.run(() => this.client.user.findUnique({ where: { id: userId } }));

    return user ? (user as PrismaMeUserRow) : null;
  }

  async updateUserProfile(userId: string, input: UpdateProfileInput): Promise<MeUserRow> {
    const user = await this.run(() =>
      this.client.user.update({
        where: { id: userId },
        data: {
          nickname: input.nickname,
          avatarUrl: input.avatarUrl,
          examYear: input.examYear,
        },
      }),
    );

    return user as PrismaMeUserRow;
  }

  async listTargets(userId: string): Promise<MeTargetRow[]> {
    const rows = await this.run(() =>
      this.client.userTarget.findMany({
        where: { userId },
        include: { school: { select: { name: true } } },
        orderBy: [{ type: "asc" }, { createdAt: "asc" }],
      }),
    );

    return rows.map((row) => {
      const typed = row as PrismaTargetRow;

      return {
        schoolId: typed.schoolId,
        schoolName: typed.school.name,
        type: typed.type,
        majorCode: typed.majorCode,
        majorName: typed.majorName,
        updatedAt: typed.updatedAt,
      };
    });
  }

  async replaceTargets(userId: string, targets: TargetInput[], now: Date): Promise<MeTargetRow[]> {
    return this.run(async () =>
      this.client.$transaction(async (tx) => {
        const schoolIds = [...new Set(targets.map((target) => target.schoolId))];
        const schools = await tx.school.findMany({
          where: { id: { in: schoolIds }, isPublished: true },
          select: { id: true },
        });
        const publishedIds = new Set(schools.map((school) => school.id));

        for (const target of targets) {
          if (!publishedIds.has(target.schoolId)) {
            throw new AppError(ERROR_CODES.NOT_FOUND);
          }
        }

        await tx.userTarget.deleteMany({ where: { userId } });

        if (targets.length > 0) {
          await tx.userTarget.createMany({
            data: targets.map((target) => ({
              userId,
              schoolId: target.schoolId,
              type: target.type,
              majorCode: target.majorCode,
              majorName: target.majorName,
            })),
          });
        }

        const rows = await tx.userTarget.findMany({
          where: { userId },
          include: { school: { select: { name: true } } },
          orderBy: [{ type: "asc" }, { createdAt: "asc" }],
        });

        void now;

        return rows.map((row) => {
          const typed = row as PrismaTargetRow;

          return {
            schoolId: typed.schoolId,
            schoolName: typed.school.name,
            type: typed.type,
            majorCode: typed.majorCode,
            majorName: typed.majorName,
            updatedAt: typed.updatedAt,
          };
        });
      }),
    );
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw mapPrismaError(error);
    }
  }
}

function mapPrismaError(error: unknown): AppError {
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
