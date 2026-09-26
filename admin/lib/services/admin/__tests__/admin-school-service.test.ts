import { describe, expect, it } from "vitest";

import { AdminSchoolService } from "../admin-school-service";
import type {
  AdminProgramRecord,
  AdminSchoolListFilters,
  AdminSchoolRecord,
  AdminSchoolRepository,
} from "../admin-school-service";

const now = new Date("2026-09-26T00:00:00Z");

const actor = {
  user: { id: "admin-1", email: "a@t.dev", nickname: "管理员", role: "admin", isBanned: false },
};

function schoolRecord(): AdminSchoolRecord {
  return {
    id: "s-1",
    name: "深圳大学",
    province: "广东",
    region: "华南",
    is985: false,
    is211: false,
    isDoubleFirstClass: false,
    isSelfMarking: false,
    isPublished: false,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

function programRow(overrides: Partial<AdminProgramRecord> = {}): AdminProgramRecord {
  return {
    id: "p-1",
    schoolId: "s-1",
    majorCode: "085400",
    majorName: "电子信息",
    year: 2025,
    studyMode: "全日制",
    planEnrollment: 120,
    minScore: 355,
    avgScore: 372.5,
    isPublished: false,
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function fakeSchoolRepo(
  schools: AdminSchoolRecord[],
  programs: AdminProgramRecord[] = [],
): AdminSchoolRepository {
  return {
    async listSchools(filters: AdminSchoolListFilters, _page: number, _pageSize: number) {
      const rows = schools.filter((school) =>
        filters.keyword === null ? true : school.name.includes(filters.keyword),
      );

      return { rows, total: rows.length };
    },
    async findSchoolById(schoolId: string) {
      return schools.find((school) => school.id === schoolId) ?? null;
    },
    async listPrograms(schoolId: string, year: number | null) {
      return programs.filter(
        (program) => program.schoolId === schoolId && (year === null || program.year === year),
      );
    },
  };
}

describe("管理端院校只读查询（ADMIN-SCH-01 / 08）", () => {
  it("返回全部专业并映射 DTO（含未发布、Decimal 转数值）", async () => {
    const programs = [
      programRow({ id: "p-1", year: 2025, minScore: 355, avgScore: 372.5 }),
      programRow({ id: "p-2", year: 2024, majorCode: "125100", majorName: "工商管理" }),
    ];
    const service = new AdminSchoolService(fakeSchoolRepo([schoolRecord()], programs));
    const { rows } = await service.listPrograms(actor, "s-1", null);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: "p-1",
      schoolId: "s-1",
      minScore: 355,
      avgScore: 372.5,
      isPublished: false,
    });
  });

  it("year 筛选透传仓储", async () => {
    const programs = [
      programRow({ id: "p-1", year: 2025 }),
      programRow({ id: "p-2", year: 2024 }),
    ];
    const service = new AdminSchoolService(fakeSchoolRepo([schoolRecord()], programs));
    const { rows } = await service.listPrograms(actor, "s-1", 2024);

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("p-2");
  });

  it("院校不存在返回 404", async () => {
    const service = new AdminSchoolService(fakeSchoolRepo([]));

    await expect(service.listPrograms(actor, "s-404", null)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("院校列表映射 DTO 并透传筛选", async () => {
    const service = new AdminSchoolService(fakeSchoolRepo([schoolRecord()]));
    const { rows, total } = await service.list(actor, { keyword: "深圳", province: null, region: null }, 1, 20);

    expect(total).toBe(1);
    expect(rows[0]).toMatchObject({ id: "s-1", name: "深圳大学", isPublished: false });
    expect(rows[0].createdAt).toBe("2026-09-26T00:00:00Z");
  });

  it("非管理员触发 ADMIN_REQUIRED", async () => {
    const service = new AdminSchoolService(fakeSchoolRepo([schoolRecord()]));
    const userActor = {
      user: { id: "u-9", email: "u@t.dev", nickname: "考生", role: "user", isBanned: false },
    };

    await expect(
      service.listPrograms(userActor, "s-1", null),
    ).rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
  });
});
