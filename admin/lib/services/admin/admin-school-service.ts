import { AppError, ERROR_CODES } from "../../api/errors";
import { formatUtcTimestamp } from "../../api/response";

import { assertAdminActor, type AdminActor } from "./admin-actor";

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

export interface AdminSchoolRepository {
  listSchools(
    filters: AdminSchoolListFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: AdminSchoolRecord[]; total: number }>;

  findSchoolById(schoolId: string): Promise<AdminSchoolRecord | null>;

  /** 专业完整列表（ADMIN-SCH-08）：不分页，含未发布；year 为 null 时返回全部。 */
  listPrograms(schoolId: string, year: number | null): Promise<AdminProgramRecord[]>;
}

/**
 * 管理端院校只读服务（契约 ADMIN-SCH-01、ADMIN-SCH-08）。
 * 列表含未发布数据；管理端定位为观察台（p0 admin-readonly-activity），
 * 不提供院校/专业维护与批量导入能力。
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

  /** 专业列表（ADMIN-SCH-08）：不分页，含未发布；year 为 null 时返回全部。 */
  async listPrograms(
    actor: AdminActor,
    schoolId: string,
    year: number | null,
  ): Promise<{ rows: AdminProgramDto[] }> {
    assertAdminActor(actor);

    await this.requireSchool(schoolId);

    const rows = await this.repository.listPrograms(schoolId, year);

    return { rows: rows.map(toAdminProgramDto) };
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
