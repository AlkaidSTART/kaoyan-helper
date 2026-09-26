import { Prisma, type PrismaClient } from "@/generated/prisma/client";

import { AppError } from "../../api/errors";
import { getPrismaClient } from "../../db/prisma";
import { mapAdminPrismaError } from "./prisma-error-mapper";
import type {
  AdminProgramRecord,
  AdminSchoolListFilters,
  AdminSchoolRecord,
  AdminSchoolRepository,
} from "./admin-school-service";

/** Prisma 实现的管理端院校仓储（只读）。 */
export class PrismaAdminSchoolRepository implements AdminSchoolRepository {
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
    filters: AdminSchoolListFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: AdminSchoolRecord[]; total: number }> {
    return this.run(async () => {
      const where: Prisma.SchoolWhereInput = {
        ...(filters.keyword !== null
          ? { name: { contains: filters.keyword, mode: Prisma.QueryMode.insensitive } }
          : {}),
        ...(filters.province !== null ? { province: filters.province } : {}),
        ...(filters.region !== null ? { region: filters.region } : {}),
      };

      const [rows, total] = await this.client.$transaction([
        this.client.school.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.client.school.count({ where }),
      ]);

      return { rows: rows as unknown as AdminSchoolRecord[], total };
    });
  }

  async findSchoolById(schoolId: string): Promise<AdminSchoolRecord | null> {
    return this.run(async () => {
      const row = await this.client.school.findUnique({ where: { id: schoolId } });

      return row ? (row as unknown as AdminSchoolRecord) : null;
    });
  }

  async listPrograms(schoolId: string, year: number | null): Promise<AdminProgramRecord[]> {
    return this.run(async () => {
      const rows = await this.client.schoolProgram.findMany({
        where: {
          schoolId,
          ...(year !== null ? { year } : {}),
        },
        orderBy: [{ year: "desc" }, { majorCode: "asc" }],
      });

      return rows as unknown as AdminProgramRecord[];
    });
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw mapAdminPrismaError(error);
    }
  }
}
