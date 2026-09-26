import { AppError, ERROR_CODES } from "../../api/errors";
import { formatUtcTimestamp } from "../../api/response";

import { assertAdminActor, type AdminActor } from "./admin-actor";
import {
  parseSchoolImport,
  type ParsedSchoolRow,
} from "./import-parser";

export interface AdminSchoolListFilters {
  keyword: string | null;
  province: string | null;
  region: string | null;
}

export interface AdminSchoolRecord {
  id: string;
  name: string;
  province: string | null;
  region: string | null;
  is985: boolean;
  is211: boolean;
  isDoubleFirstClass: boolean;
  isSelfMarking: boolean;
  isPublished: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminSchoolDto {
  id: string;
  name: string;
  province: string | null;
  region: string | null;
  is985: boolean;
  is211: boolean;
  isDoubleFirstClass: boolean;
  isSelfMarking: boolean;
  isPublished: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProgramRecord {
  id: string;
  schoolId: string;
  majorCode: string;
  majorName: string;
  year: number;
  studyMode: string | null;
  planEnrollment: number | null;
  minScore: number | null;
  avgScore: number | null;
  isPublished: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminProgramDto {
  id: string;
  schoolId: string;
  majorCode: string;
  majorName: string;
  year: number;
  studyMode: string | null;
  planEnrollment: number | null;
  minScore: number | null;
  avgScore: number | null;
  isPublished: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminSchoolInput {
  name: string;
  province: string | null;
  region: string | null;
  is985: boolean;
  is211: boolean;
  isDoubleFirstClass: boolean;
  isSelfMarking: boolean;
  isPublished: boolean;
}

export interface UpdateAdminSchoolInput {
  name?: string;
  province?: string | null;
  region?: string | null;
  is985?: boolean;
  is211?: boolean;
  isDoubleFirstClass?: boolean;
  isSelfMarking?: boolean;
  isPublished?: boolean;
  version: number;
}

export interface UpsertProgramInput {
  majorCode: string;
  majorName: string;
  year: number;
  studyMode: string | null;
  planEnrollment: number | null;
  minScore: number | null;
  avgScore: number | null;
  isPublished: boolean;
}

export interface UpdateProgramInput {
  majorName?: string;
  studyMode?: string | null;
  planEnrollment?: number | null;
  minScore?: number | null;
  avgScore?: number | null;
  isPublished?: boolean;
  version: number;
}

export interface ImportAuditContext {
  actorId: string;
  requestId: string | null;
}

export interface ImportSummary {
  totalRows: number;
  createdSchools: number;
  updatedSchools: number;
  upsertedPrograms: number;
}

export interface AdminImportJobRecord {
  id: string;
  actorId: string;
  format: string;
  mode: string;
  status: string;
  summary: ImportSummary;
  payload: ParsedSchoolRow[];
  version: number;
  expiresAt: Date;
}

export interface CreateImportJobParams {
  actorId: string;
  format: "csv" | "json";
  mode: "validate" | "commit";
  summary: ImportSummary;
  payload: ParsedSchoolRow[];
  expiresAt: Date;
  now: Date;
}

export interface CommitImportJobParams {
  jobId: string;
  actorId: string;
  rows: ParsedSchoolRow[];
  requestId: string | null;
  now: Date;
}

export interface AdminSchoolRepository {
  listSchools(
    filters: AdminSchoolListFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: AdminSchoolRecord[]; total: number }>;

  findSchoolById(schoolId: string): Promise<AdminSchoolRecord | null>;

  createSchool(
    input: CreateAdminSchoolInput,
    audit: ImportAuditContext,
    now: Date,
  ): Promise<AdminSchoolRecord>;

  updateSchool(
    schoolId: string,
    input: UpdateAdminSchoolInput,
    audit: ImportAuditContext,
    now: Date,
  ): Promise<AdminSchoolRecord>;

  upsertProgram(
    schoolId: string,
    input: UpsertProgramInput,
    audit: ImportAuditContext,
    now: Date,
  ): Promise<AdminProgramRecord>;

  updateProgram(
    schoolId: string,
    programId: string,
    input: UpdateProgramInput,
    audit: ImportAuditContext,
    now: Date,
  ): Promise<AdminProgramRecord>;

  createImportJob(params: CreateImportJobParams): Promise<AdminImportJobRecord>;

  findImportJob(jobId: string): Promise<AdminImportJobRecord | null>;

  /** 导入提交事务：院校/专业 upsert、任务置 completed、审计同事务。 */
  commitImportJob(params: CommitImportJobParams): Promise<AdminImportJobRecord>;
}

const IMPORT_TTL_MS = 60 * 60 * 1_000;

const EMPTY_SUMMARY: ImportSummary = {
  totalRows: 0,
  createdSchools: 0,
  updatedSchools: 0,
  upsertedPrograms: 0,
};

/**
 * 管理端院校服务（契约 ADMIN-SCH-01 ~ 07）。
 * 列表含未发布数据；校名唯一冲突 409；写操作乐观锁 409；
 * 导入 validate → confirm 两阶段（或 commit 单请求直达），任务 1 小时过期。
 */
export class AdminSchoolService {
  private readonly repository: AdminSchoolRepository;

  constructor(repository: AdminSchoolRepository) {
    this.repository = repository;
  }

  async list(
    actor: AdminActor,
    filters: AdminSchoolListFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: AdminSchoolDto[]; total: number }> {
    assertAdminActor(actor);

    const { rows, total } = await this.repository.listSchools(filters, page, pageSize);

    return { rows: rows.map(toAdminSchoolDto), total };
  }

  async create(
    actor: AdminActor,
    input: CreateAdminSchoolInput,
    requestId: string | null,
  ): Promise<AdminSchoolDto> {
    assertAdminActor(actor);

    const row = await this.repository.createSchool(
      input,
      { actorId: actor.user.id, requestId },
      new Date(),
    );

    return toAdminSchoolDto(row);
  }

  async update(
    actor: AdminActor,
    schoolId: string,
    input: UpdateAdminSchoolInput,
    requestId: string | null,
  ): Promise<AdminSchoolDto> {
    assertAdminActor(actor);

    await this.requireSchool(schoolId);

    const row = await this.repository.updateSchool(
      schoolId,
      input,
      { actorId: actor.user.id, requestId },
      new Date(),
    );

    return toAdminSchoolDto(row);
  }

  async upsertProgram(
    actor: AdminActor,
    schoolId: string,
    input: UpsertProgramInput,
    requestId: string | null,
  ): Promise<AdminProgramDto> {
    assertAdminActor(actor);

    await this.requireSchool(schoolId);

    const row = await this.repository.upsertProgram(
      schoolId,
      input,
      { actorId: actor.user.id, requestId },
      new Date(),
    );

    return toAdminProgramDto(row);
  }

  async updateProgram(
    actor: AdminActor,
    schoolId: string,
    programId: string,
    input: UpdateProgramInput,
    requestId: string | null,
  ): Promise<AdminProgramDto> {
    assertAdminActor(actor);

    await this.requireSchool(schoolId);

    const row = await this.repository.updateProgram(
      schoolId,
      programId,
      input,
      { actorId: actor.user.id, requestId },
      new Date(),
    );

    return toAdminProgramDto(row);
  }

  /**
   * 导入入口（ADMIN-SCH-06）：解析与校验失败返回 422（逐行错误）；
   * `mode=validate` 落 validated 任务（1h 过期），`mode=commit` 校验通过后同请求内提交。
   */
  async import(
    actor: AdminActor,
    input: {
      raw: string;
      format: "csv" | "json";
      mode: "validate" | "commit";
      requestId: string | null;
    },
  ): Promise<{ jobId: string; status: string; summary: ImportSummary }> {
    assertAdminActor(actor);

    const parsed = parseSchoolImport(input.raw, input.format);

    if (!parsed.ok) {
      throw new AppError(ERROR_CODES.IMPORT_VALIDATION_FAILED, {
        details: { errors: parsed.errors },
      });
    }

    const now = new Date();
    const job = await this.repository.createImportJob({
      actorId: actor.user.id,
      format: input.format,
      mode: input.mode,
      summary: { ...EMPTY_SUMMARY, totalRows: parsed.rows.length },
      payload: parsed.rows,
      expiresAt: new Date(now.getTime() + IMPORT_TTL_MS),
      now,
    });

    if (input.mode === "validate") {
      return { jobId: job.id, status: job.status, summary: job.summary };
    }

    const completed = await this.repository.commitImportJob({
      jobId: job.id,
      actorId: actor.user.id,
      rows: parsed.rows,
      requestId: input.requestId,
      now: new Date(),
    });

    return { jobId: completed.id, status: completed.status, summary: completed.summary };
  }

  /** 导入确认（ADMIN-SCH-07）：仅 validated 且未过期任务可确认。 */
  async confirmImport(
    actor: AdminActor,
    jobId: string,
    requestId: string | null,
  ): Promise<{ jobId: string; status: string; summary: ImportSummary }> {
    assertAdminActor(actor);

    const job = await this.repository.findImportJob(jobId);

    if (!job) {
      throw new AppError(ERROR_CODES.NOT_FOUND);
    }

    if (job.status !== "validated" || job.expiresAt.getTime() <= Date.now()) {
      throw new AppError(ERROR_CODES.IMPORT_JOB_EXPIRED);
    }

    const completed = await this.repository.commitImportJob({
      jobId,
      actorId: actor.user.id,
      rows: job.payload,
      requestId,
      now: new Date(),
    });

    return { jobId: completed.id, status: completed.status, summary: completed.summary };
  }

  private async requireSchool(schoolId: string): Promise<AdminSchoolRecord> {
    const school = await this.repository.findSchoolById(schoolId);

    if (!school) {
      throw new AppError(ERROR_CODES.NOT_FOUND);
    }

    return school;
  }
}

export function toAdminSchoolDto(row: AdminSchoolRecord): AdminSchoolDto {
  return {
    id: row.id,
    name: row.name,
    province: row.province,
    region: row.region,
    is985: row.is985,
    is211: row.is211,
    isDoubleFirstClass: row.isDoubleFirstClass,
    isSelfMarking: row.isSelfMarking,
    isPublished: row.isPublished,
    version: row.version,
    createdAt: formatUtcTimestamp(row.createdAt),
    updatedAt: formatUtcTimestamp(row.updatedAt),
  };
}

export function toAdminProgramDto(row: AdminProgramRecord): AdminProgramDto {
  return {
    id: row.id,
    schoolId: row.schoolId,
    majorCode: row.majorCode,
    majorName: row.majorName,
    year: row.year,
    studyMode: row.studyMode,
    planEnrollment: row.planEnrollment,
    minScore: row.minScore === null ? null : Number(row.minScore),
    avgScore: row.avgScore === null ? null : Number(row.avgScore),
    isPublished: row.isPublished,
    version: row.version,
    createdAt: formatUtcTimestamp(row.createdAt),
    updatedAt: formatUtcTimestamp(row.updatedAt),
  };
}
