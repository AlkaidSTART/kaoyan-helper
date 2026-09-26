import { Prisma, type PrismaClient } from "@/generated/prisma/client";

import { AppError, ERROR_CODES } from "../../api/errors";
import { getPrismaClient } from "../../db/prisma";
import { mapAdminPrismaError } from "./prisma-error-mapper";
import type {
  AdminImportJobRecord,
  AdminProgramRecord,
  AdminSchoolListFilters,
  AdminSchoolRecord,
  AdminSchoolRepository,
  CommitImportJobParams,
  CreateAdminSchoolInput,
  CreateImportJobParams,
  ImportAuditContext,
  ImportSummary,
  UpdateAdminSchoolInput,
  UpdateProgramInput,
  UpsertProgramInput,
} from "./admin-school-service";
import type { ParsedSchoolRow } from "./import-parser";

const EMPTY_SUMMARY: ImportSummary = {
  totalRows: 0,
  createdSchools: 0,
  updatedSchools: 0,
  upsertedPrograms: 0,
};

function toImportSummary(value: unknown): ImportSummary {
  if (typeof value !== "object" || value === null) {
    return { ...EMPTY_SUMMARY };
  }

  const record = value as Record<string, unknown>;

  return {
    totalRows: typeof record.totalRows === "number" ? record.totalRows : 0,
    createdSchools: typeof record.createdSchools === "number" ? record.createdSchools : 0,
    updatedSchools: typeof record.updatedSchools === "number" ? record.updatedSchools : 0,
    upsertedPrograms: typeof record.upsertedPrograms === "number" ? record.upsertedPrograms : 0,
  };
}

/** Prisma 实现的管理端院校仓储；写操作、导入提交与审计日志同事务。 */
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

  async createSchool(
    input: CreateAdminSchoolInput,
    audit: ImportAuditContext,
    now: Date,
  ): Promise<AdminSchoolRecord> {
    return this.run(async () => {
      const row = await this.client.$transaction(async (tx) => {
        const created = await tx.school.create({
          data: {
            name: input.name,
            province: input.province,
            region: input.region,
            is985: input.is985,
            is211: input.is211,
            isDoubleFirstClass: input.isDoubleFirstClass,
            isSelfMarking: input.isSelfMarking,
            isPublished: input.isPublished,
          },
        });

        await tx.adminAuditLog.create({
          data: {
            actorId: audit.actorId,
            action: "school.create",
            resourceType: "school",
            resourceId: created.id,
            requestId: audit.requestId,
            metadata: { name: created.name, createdAt: now.toISOString() },
          },
        });

        return created;
      });

      return row as unknown as AdminSchoolRecord;
    });
  }

  async updateSchool(
    schoolId: string,
    input: UpdateAdminSchoolInput,
    audit: ImportAuditContext,
    now: Date,
  ): Promise<AdminSchoolRecord> {
    return this.run(async () => {
      const row = await this.client.$transaction(async (tx) => {
        const existing = await tx.school.findUnique({ where: { id: schoolId } });

        if (!existing) {
          throw new AppError(ERROR_CODES.NOT_FOUND);
        }

        if (existing.version !== input.version) {
          throw new AppError(ERROR_CODES.CONFLICT);
        }

        const updated = await tx.school.update({
          where: { id: schoolId },
          data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.province !== undefined ? { province: input.province } : {}),
            ...(input.region !== undefined ? { region: input.region } : {}),
            ...(input.is985 !== undefined ? { is985: input.is985 } : {}),
            ...(input.is211 !== undefined ? { is211: input.is211 } : {}),
            ...(input.isDoubleFirstClass !== undefined
              ? { isDoubleFirstClass: input.isDoubleFirstClass }
              : {}),
            ...(input.isSelfMarking !== undefined
              ? { isSelfMarking: input.isSelfMarking }
              : {}),
            ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
            version: { increment: 1 },
          },
        });

        await tx.adminAuditLog.create({
          data: {
            actorId: audit.actorId,
            action: "school.update",
            resourceType: "school",
            resourceId: schoolId,
            requestId: audit.requestId,
            metadata: {
              changedFields: Object.keys(input).filter((field) => field !== "version"),
              updatedAt: now.toISOString(),
            },
          },
        });

        return updated;
      });

      return row as unknown as AdminSchoolRecord;
    });
  }

  async upsertProgram(
    schoolId: string,
    input: UpsertProgramInput,
    audit: ImportAuditContext,
    now: Date,
  ): Promise<AdminProgramRecord> {
    return this.run(async () => {
      const row = await this.client.$transaction(async (tx) => {
        const program = await tx.schoolProgram.upsert({
          where: {
            schoolId_majorCode_year: {
              schoolId,
              majorCode: input.majorCode,
              year: input.year,
            },
          },
          create: {
            schoolId,
            majorCode: input.majorCode,
            majorName: input.majorName,
            year: input.year,
            studyMode: input.studyMode,
            planEnrollment: input.planEnrollment,
            minScore: input.minScore,
            avgScore: input.avgScore,
            isPublished: input.isPublished,
          },
          update: {
            majorName: input.majorName,
            studyMode: input.studyMode,
            planEnrollment: input.planEnrollment,
            minScore: input.minScore,
            avgScore: input.avgScore,
            isPublished: input.isPublished,
          },
        });

        await tx.adminAuditLog.create({
          data: {
            actorId: audit.actorId,
            action: "school.program.upsert",
            resourceType: "school_program",
            resourceId: program.id,
            requestId: audit.requestId,
            metadata: {
              schoolId,
              majorCode: input.majorCode,
              year: input.year,
              upsertedAt: now.toISOString(),
            },
          },
        });

        return program;
      });

      return row as unknown as AdminProgramRecord;
    });
  }

  async updateProgram(
    schoolId: string,
    programId: string,
    input: UpdateProgramInput,
    audit: ImportAuditContext,
    now: Date,
  ): Promise<AdminProgramRecord> {
    return this.run(async () => {
      const row = await this.client.$transaction(async (tx) => {
        const existing = await tx.schoolProgram.findFirst({
          where: { id: programId, schoolId },
        });

        if (!existing) {
          throw new AppError(ERROR_CODES.NOT_FOUND);
        }

        if (existing.version !== input.version) {
          throw new AppError(ERROR_CODES.CONFLICT);
        }

        const updated = await tx.schoolProgram.update({
          where: { id: programId },
          data: {
            ...(input.majorName !== undefined ? { majorName: input.majorName } : {}),
            ...(input.studyMode !== undefined ? { studyMode: input.studyMode } : {}),
            ...(input.planEnrollment !== undefined
              ? { planEnrollment: input.planEnrollment }
              : {}),
            ...(input.minScore !== undefined ? { minScore: input.minScore } : {}),
            ...(input.avgScore !== undefined ? { avgScore: input.avgScore } : {}),
            ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
            version: { increment: 1 },
          },
        });

        await tx.adminAuditLog.create({
          data: {
            actorId: audit.actorId,
            action: "school.program.update",
            resourceType: "school_program",
            resourceId: programId,
            requestId: audit.requestId,
            metadata: {
              schoolId,
              changedFields: Object.keys(input).filter((field) => field !== "version"),
              updatedAt: now.toISOString(),
            },
          },
        });

        return updated;
      });

      return row as unknown as AdminProgramRecord;
    });
  }

  async createImportJob(params: CreateImportJobParams): Promise<AdminImportJobRecord> {
    return this.run(async () => {
      const row = await this.client.schoolImportJob.create({
        data: {
          actorId: params.actorId,
          format: params.format,
          mode: params.mode,
          status: "validated",
          summary: JSON.parse(JSON.stringify(params.summary)) as Prisma.InputJsonValue,
          payload: JSON.parse(JSON.stringify(params.payload)) as Prisma.InputJsonValue,
          expiresAt: params.expiresAt,
        },
      });

      return this.toImportJobRecord(row);
    });
  }

  async findImportJob(jobId: string): Promise<AdminImportJobRecord | null> {
    return this.run(async () => {
      const row = await this.client.schoolImportJob.findUnique({ where: { id: jobId } });

      return row ? this.toImportJobRecord(row) : null;
    });
  }

  async commitImportJob(params: CommitImportJobParams): Promise<AdminImportJobRecord> {
    return this.run(async () => {
      const summary = await this.client.$transaction(async (tx) => {
        const job = await tx.schoolImportJob.findUnique({ where: { id: params.jobId } });

        if (!job) {
          throw new AppError(ERROR_CODES.NOT_FOUND);
        }

        if (job.status !== "validated" || job.expiresAt.getTime() <= params.now.getTime()) {
          throw new AppError(ERROR_CODES.IMPORT_JOB_EXPIRED);
        }

        const result: ImportSummary = {
          totalRows: params.rows.length,
          createdSchools: 0,
          updatedSchools: 0,
          upsertedPrograms: 0,
        };

        for (const row of params.rows) {
          const existing = await tx.school.findUnique({ where: { name: row.name } });

          const school = existing
            ? await tx.school.update({
                where: { id: existing.id },
                data: {
                  province: row.province,
                  region: row.region,
                  is985: row.is985,
                  is211: row.is211,
                  isDoubleFirstClass: row.isDoubleFirstClass,
                  isSelfMarking: row.isSelfMarking,
                  isPublished: row.isPublished,
                  version: { increment: 1 },
                },
              })
            : await tx.school.create({
                data: {
                  name: row.name,
                  province: row.province,
                  region: row.region,
                  is985: row.is985,
                  is211: row.is211,
                  isDoubleFirstClass: row.isDoubleFirstClass,
                  isSelfMarking: row.isSelfMarking,
                  isPublished: row.isPublished,
                },
              });

          if (existing) {
            result.updatedSchools += 1;
          } else {
            result.createdSchools += 1;
          }

          for (const program of row.programs) {
            await tx.schoolProgram.upsert({
              where: {
                schoolId_majorCode_year: {
                  schoolId: school.id,
                  majorCode: program.majorCode,
                  year: program.year,
                },
              },
              create: {
                schoolId: school.id,
                majorCode: program.majorCode,
                majorName: program.majorName,
                year: program.year,
                studyMode: program.studyMode,
                planEnrollment: program.planEnrollment,
                minScore: program.minScore,
                avgScore: program.avgScore,
                isPublished: program.isPublished,
              },
              update: {
                majorName: program.majorName,
                studyMode: program.studyMode,
                planEnrollment: program.planEnrollment,
                minScore: program.minScore,
                avgScore: program.avgScore,
                isPublished: program.isPublished,
              },
            });

            result.upsertedPrograms += 1;
          }
        }

        const completed = await tx.schoolImportJob.update({
          where: { id: params.jobId },
          data: {
            status: "completed",
            summary: JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue,
            version: { increment: 1 },
          },
        });

        await tx.adminAuditLog.create({
          data: {
            actorId: params.actorId,
            action: "school.import.commit",
            resourceType: "school_import_job",
            resourceId: params.jobId,
            requestId: params.requestId,
            metadata: { ...result },
          },
        });

        return this.toImportJobRecord(completed);
      });

      return summary;
    });
  }

  private toImportJobRecord(row: {
    id: string;
    actorId: string;
    format: string;
    mode: string;
    status: string;
    summary: unknown;
    payload: unknown;
    version: number;
    expiresAt: Date;
  }): AdminImportJobRecord {
    return {
      id: row.id,
      actorId: row.actorId,
      format: row.format,
      mode: row.mode,
      status: row.status,
      summary: toImportSummary(row.summary),
      payload: Array.isArray(row.payload) ? (row.payload as ParsedSchoolRow[]) : [],
      version: row.version,
      expiresAt: row.expiresAt,
    };
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
