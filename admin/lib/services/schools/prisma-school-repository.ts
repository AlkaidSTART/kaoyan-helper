import { Prisma, PrismaClient } from "@/generated/prisma/client";

import { AppError, ERROR_CODES } from "../../api/errors";
import { PrismaClientConfigurationError, getPrismaClient } from "../../db/prisma";
import type {
  ProgramFilters,
  ProgramRow,
  SchoolFilters,
  SchoolRepository,
  SchoolSummaryRow,
  TargetInput,
  TargetRow,
} from "./school-service";

const MAX_TARGETS = 3;

/**
 * Prisma 实现的院校仓储。
 * 目标院校：重复添加幂等返回现有条目；上限 3 条、主目标唯一在事务内复核。
 */
export class PrismaSchoolRepository implements SchoolRepository {
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

  async listSchools(
    filters: SchoolFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: SchoolSummaryRow[]; total: number }> {
    const where: Prisma.SchoolWhereInput = {
      isPublished: true,
      ...(filters.keyword !== null
        ? { name: { contains: filters.keyword, mode: Prisma.QueryMode.insensitive } }
        : {}),
      ...(filters.province !== null ? { province: filters.province } : {}),
      ...(filters.region !== null ? { region: filters.region } : {}),
      ...(filters.is985 !== null ? { is985: filters.is985 } : {}),
      ...(filters.is211 !== null ? { is211: filters.is211 } : {}),
      ...(filters.isDoubleFirstClass !== null
        ? { isDoubleFirstClass: filters.isDoubleFirstClass }
        : {}),
      ...(filters.isSelfMarking !== null ? { isSelfMarking: filters.isSelfMarking } : {}),
      ...(filters.majorCode !== null
        ? { programs: { some: { majorCode: filters.majorCode, isPublished: true } } }
        : {}),
    };

    const [rows, total] = await this.run(() =>
      this.client.$transaction([
        this.client.school.findMany({
          where,
          orderBy: [{ name: "asc" }, { id: "asc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.client.school.count({ where }),
      ]),
    );

    return { rows: rows as unknown as SchoolSummaryRow[], total };
  }

  async findSchoolById(schoolId: string): Promise<SchoolSummaryRow | null> {
    const row = await this.run(() => this.client.school.findUnique({ where: { id: schoolId } }));

    return row ? (row as unknown as SchoolSummaryRow) : null;
  }

  async listMajors(schoolId: string): Promise<{ majorCode: string; majorName: string }[]> {
    const rows = await this.run(() =>
      this.client.schoolProgram.findMany({
        where: { schoolId, isPublished: true },
        orderBy: [{ majorCode: "asc" }, { year: "desc" }],
        select: { majorCode: true, majorName: true },
      }),
    );

    const seen = new Set<string>();

    return rows.filter((row) => {
      if (seen.has(row.majorCode)) {
        return false;
      }

      seen.add(row.majorCode);

      return true;
    });
  }

  async listPrograms(
    schoolId: string,
    filters: ProgramFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: ProgramRow[]; total: number }> {
    const where: Prisma.SchoolProgramWhereInput = {
      schoolId,
      isPublished: true,
      ...(filters.majorCode !== null ? { majorCode: filters.majorCode } : {}),
      ...(filters.yearFrom !== null || filters.yearTo !== null
        ? {
            year: {
              ...(filters.yearFrom !== null ? { gte: filters.yearFrom } : {}),
              ...(filters.yearTo !== null ? { lte: filters.yearTo } : {}),
            },
          }
        : {}),
    };

    const [rows, total] = await this.run(() =>
      this.client.$transaction([
        this.client.schoolProgram.findMany({
          where,
          orderBy: [{ year: "desc" }, { majorCode: "asc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.client.schoolProgram.count({ where }),
      ]),
    );

    return { rows: rows as unknown as ProgramRow[], total };
  }

  async addTarget(
    userId: string,
    schoolId: string,
    input: TargetInput,
    _now: Date,
  ): Promise<TargetRow[]> {
    return this.run(() =>
      this.client.$transaction(async (tx) => {
        const existing = await tx.userTarget.findMany({
          where: { userId },
          include: { school: { select: { name: true } } },
          orderBy: [{ type: "asc" }, { createdAt: "asc" }],
        });

        const duplicate = existing.find(
          (row) =>
            row.schoolId === schoolId &&
            row.type === input.type &&
            (row.majorCode ?? null) === input.majorCode,
        );

        if (!duplicate) {
          if (existing.length >= MAX_TARGETS) {
            throw new AppError(ERROR_CODES.TARGET_LIMIT_EXCEEDED);
          }

          if (input.type === "primary" && existing.some((row) => row.type === "primary")) {
            throw new AppError(ERROR_CODES.TARGET_PRIMARY_CONFLICT);
          }

          await tx.userTarget.create({
            data: {
              userId,
              schoolId,
              type: input.type,
              majorCode: input.majorCode,
              majorName: input.majorName,
            },
          });
        }

        return this.readTargets(tx, userId);
      }),
    );
  }

  async removeTarget(
    userId: string,
    schoolId: string,
    type: "primary" | "backup",
    majorCode: string | null,
  ): Promise<TargetRow[]> {
    return this.run(() =>
      this.client.$transaction(async (tx) => {
        // 不存在的目标保持幂等：直接按条件删除，0 行删除也返回当前列表。
        await tx.userTarget.deleteMany({
          where: {
            userId,
            schoolId,
            type,
            ...(majorCode === null ? { majorCode: null } : { majorCode }),
          },
        });

        return this.readTargets(tx, userId);
      }),
    );
  }

  private async readTargets(
    tx: Prisma.TransactionClient,
    userId: string,
  ): Promise<TargetRow[]> {
    const rows = await tx.userTarget.findMany({
      where: { userId },
      include: { school: { select: { name: true } } },
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    });

    return rows.map((row) => ({
      schoolId: row.schoolId,
      schoolName: row.school.name,
      type: row.type,
      majorCode: row.majorCode,
      majorName: row.majorName,
      updatedAt: row.updatedAt,
    }));
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
