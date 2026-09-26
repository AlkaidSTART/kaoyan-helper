import { AppError, ERROR_CODES } from "../../api/errors";
import { formatUtcTimestamp } from "../../api/response";

export interface SchoolFilters {
  keyword: string | null;
  province: string | null;
  region: string | null;
  is985: boolean | null;
  is211: boolean | null;
  isDoubleFirstClass: boolean | null;
  isSelfMarking: boolean | null;
  majorCode: string | null;
}

export interface SchoolSummaryDto {
  id: string;
  name: string;
  province: string | null;
  region: string | null;
  is985: boolean;
  is211: boolean;
  isDoubleFirstClass: boolean;
  isSelfMarking: boolean;
  createdAt: string;
}

export interface SchoolDetailDto extends SchoolSummaryDto {
  majors: { majorCode: string; majorName: string }[];
}

export interface ProgramRow {
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
}

export interface ProgramDto {
  id: string;
  schoolId: string;
  majorCode: string;
  majorName: string;
  year: number;
  studyMode: string | null;
  planEnrollment: number | null;
  minScore: number | null;
  avgScore: number | null;
}

export interface ProgramFilters {
  majorCode: string | null;
  yearFrom: number | null;
  yearTo: number | null;
}

export interface TargetInput {
  type: "primary" | "backup";
  majorCode: string | null;
  majorName: string | null;
}

export interface SchoolRepository {
  listSchools(
    filters: SchoolFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: SchoolSummaryRow[]; total: number }>;

  findSchoolById(schoolId: string): Promise<SchoolSummaryRow | null>;

  listMajors(schoolId: string): Promise<{ majorCode: string; majorName: string }[]>;

  listPrograms(
    schoolId: string,
    filters: ProgramFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: ProgramRow[]; total: number }>;

  addTarget(
    userId: string,
    schoolId: string,
    input: TargetInput,
    now: Date,
  ): Promise<TargetRow[]>;

  removeTarget(
    userId: string,
    schoolId: string,
    type: "primary" | "backup",
    majorCode: string | null,
  ): Promise<TargetRow[]>;
}

export interface SchoolSummaryRow {
  id: string;
  name: string;
  province: string | null;
  region: string | null;
  is985: boolean;
  is211: boolean;
  isDoubleFirstClass: boolean;
  isSelfMarking: boolean;
  isPublished: boolean;
  createdAt: Date;
}

export interface TargetRow {
  schoolId: string;
  schoolName: string;
  type: string;
  majorCode: string | null;
  majorName: string | null;
  updatedAt: Date;
}

export class SchoolService {
  private readonly repository: SchoolRepository;

  constructor(repository: SchoolRepository) {
    this.repository = repository;
  }

  async list(
    filters: SchoolFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: SchoolSummaryRow[]; total: number }> {
    return this.repository.listSchools(filters, page, pageSize);
  }

  async getDetail(schoolId: string): Promise<SchoolDetailDto> {
    const school = await this.repository.findSchoolById(schoolId);

    if (!school || !school.isPublished) {
      // 已下架或不存在一律 404（契约 SCH-02）。
      throw new AppError(ERROR_CODES.NOT_FOUND);
    }

    const majors = await this.repository.listMajors(schoolId);

    return { ...toSchoolDto(school), majors };
  }

  /** 专业历年数据按 year DESC 稳定排序（契约 SCH-03）。 */
  async listPrograms(
    schoolId: string,
    filters: ProgramFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: ProgramRow[]; total: number }> {
    const school = await this.repository.findSchoolById(schoolId);

    if (!school || !school.isPublished) {
      throw new AppError(ERROR_CODES.NOT_FOUND);
    }

    return this.repository.listPrograms(schoolId, filters, page, pageSize);
  }

  async addTarget(
    userId: string,
    schoolId: string,
    input: TargetInput,
  ): Promise<{ targets: TargetRow[] }> {
    const school = await this.repository.findSchoolById(schoolId);

    if (!school || !school.isPublished) {
      throw new AppError(ERROR_CODES.NOT_FOUND);
    }

    const targets = await this.repository.addTarget(userId, schoolId, input, new Date());

    return { targets };
  }

  async removeTarget(
    userId: string,
    schoolId: string,
    type: "primary" | "backup",
    majorCode: string | null,
  ): Promise<{ targets: TargetRow[] }> {
    const targets = await this.repository.removeTarget(userId, schoolId, type, majorCode);

    return { targets };
  }
}

export function toSchoolDto(row: SchoolSummaryRow): SchoolSummaryDto {
  return {
    id: row.id,
    name: row.name,
    province: row.province,
    region: row.region,
    is985: row.is985,
    is211: row.is211,
    isDoubleFirstClass: row.isDoubleFirstClass,
    isSelfMarking: row.isSelfMarking,
    createdAt: formatUtcTimestamp(row.createdAt),
  };
}

export function toProgramDto(row: ProgramRow): ProgramDto {
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
  };
}

export function toTargetDto(row: TargetRow): {
  schoolId: string;
  schoolName: string;
  type: "primary" | "backup";
  majorCode: string | null;
  majorName: string | null;
  updatedAt: string;
} {
  return {
    schoolId: row.schoolId,
    schoolName: row.schoolName,
    type: row.type === "primary" ? "primary" : "backup",
    majorCode: row.majorCode,
    majorName: row.majorName,
    updatedAt: formatUtcTimestamp(row.updatedAt),
  };
}
