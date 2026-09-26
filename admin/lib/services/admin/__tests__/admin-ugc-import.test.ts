import { describe, expect, it } from "vitest";

import { AdminQuestionService } from "../admin-question-service";
import { AdminSchoolService } from "../admin-school-service";
import type {
  AdminQuestionRecord,
  AdminQuestionRepository,
  ReviewQuestionParams,
} from "../admin-question-service";
import type {
  AdminImportJobRecord,
  AdminProgramRecord,
  AdminSchoolRecord,
  AdminSchoolRepository,
  CommitImportJobParams,
} from "../admin-school-service";
import type { ParsedSchoolRow } from "../import-parser";

const actor = {
  user: { id: "admin-1", email: "a@t.dev", nickname: "管理员", role: "admin", isBanned: false },
};

const now = new Date("2026-09-26T00:00:00Z");

function questionRow(overrides: Partial<AdminQuestionRecord> = {}): AdminQuestionRecord {
  return {
    id: "q-1",
    subject: "politics",
    chapter: null,
    year: null,
    type: "single_choice",
    stem: "题干",
    options: [],
    answer: "A",
    explanation: null,
    difficulty: null,
    source: "ugc",
    visibility: "private",
    reviewStatus: "pending",
    isApproved: false,
    reviewedById: null,
    reviewedAt: null,
    reviewNote: null,
    creatorId: "u-1",
    isDeleted: false,
    deletedReason: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
    creator: null,
    ...overrides,
  };
}

function fakeQuestionRepo(rows: AdminQuestionRecord[], reviewed: ReviewQuestionParams[] = []): AdminQuestionRepository {
  return {
    async listQuestions() {
      return { rows, total: rows.length };
    },
    async findQuestionById(id) {
      return rows.find((row) => row.id === id) ?? null;
    },
    async createQuestion() {
      throw new Error("not used");
    },
    async updateQuestion() {
      throw new Error("not used");
    },
    async softDeleteQuestion() {
      throw new Error("not used");
    },
    async reviewQuestion(params: ReviewQuestionParams) {
      reviewed.push(params);
      const row = rows.find((item) => item.id === params.questionId);

      if (!row) {
        throw new Error("missing");
      }

      return {
        ...row,
        reviewStatus: params.outcome,
        isApproved: params.outcome === "approved",
        reviewNote: params.note,
        version: row.version + 1,
      };
    },
  };
}

describe("UGC 审核状态机", () => {
  it("pending 可通过并写审核人", async () => {
    const repo = fakeQuestionRepo([questionRow({})]);
    const service = new AdminQuestionService(repo);
    const updated = await service.approve(
      actor,
      "q-1",
      { note: "内容合规", version: 1 },
      "req-1",
    );

    expect(updated.reviewStatus).toBe("approved");
    expect(updated.isApproved).toBe(true);
  });

  it("已审核题目返回 409", async () => {
    const repo = fakeQuestionRepo([questionRow({ reviewStatus: "approved" })]);
    const service = new AdminQuestionService(repo);

    await expect(
      service.approve(actor, "q-1", { note: null, version: 1 }, null),
    ).rejects.toMatchObject({ code: "UGC_ALREADY_REVIEWED" });
  });

  it("非 UGC 题目不可审核（422）", async () => {
    const repo = fakeQuestionRepo([questionRow({ source: "official" })]);
    const service = new AdminQuestionService(repo);

    await expect(
      service.reject(actor, "q-1", { reason: "低质", version: 1 }, null),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });

  it("驳回写明原因", async () => {
    const repo = fakeQuestionRepo([questionRow({})]);
    const service = new AdminQuestionService(repo);
    const updated = await service.reject(actor, "q-1", { reason: "题干不完整", version: 1 }, null);

    expect(updated.reviewStatus).toBe("rejected");
    expect(updated.reviewNote).toBe("题干不完整");
  });
});

function schoolRow(): ParsedSchoolRow {
  return {
    name: "深圳大学",
    province: "广东",
    region: "华南",
    is985: false,
    is211: false,
    isDoubleFirstClass: false,
    isSelfMarking: false,
    isPublished: false,
    programs: [],
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
  jobs: AdminImportJobRecord[],
  programs: AdminProgramRecord[] = [],
  school: AdminSchoolRecord | null = null,
): AdminSchoolRepository & { commits: CommitImportJobParams[] } {
  const commits: CommitImportJobParams[] = [];

  return {
    commits,
    async listSchools() {
      return { rows: [], total: 0 };
    },
    async findSchoolById() {
      return school;
    },
    async listPrograms(schoolId, year) {
      return programs.filter(
        (program) => program.schoolId === schoolId && (year === null || program.year === year),
      );
    },
    async createSchool() {
      throw new Error("not used");
    },
    async updateSchool() {
      throw new Error("not used");
    },
    async upsertProgram() {
      throw new Error("not used");
    },
    async updateProgram() {
      throw new Error("not used");
    },
    async createImportJob(params) {
      return {
        id: "job-1",
        actorId: params.actorId,
        format: params.format,
        mode: params.mode,
        status: "validated",
        summary: params.summary,
        payload: params.payload,
        version: 1,
        expiresAt: params.expiresAt,
      };
    },
    async findImportJob(id) {
      return jobs.find((job) => job.id === id) ?? null;
    },
    async commitImportJob(params) {
      commits.push(params);

      return {
        id: params.jobId,
        actorId: params.actorId,
        format: "csv",
        mode: "validate",
        status: "completed",
        summary: {
          totalRows: params.rows.length,
          createdSchools: params.rows.length,
          updatedSchools: 0,
          upsertedPrograms: 0,
        },
        payload: params.rows,
        version: 2,
        expiresAt: new Date(now.getTime() + 3_600_000),
      };
    },
  };
}

describe("导入确认状态机", () => {
  it("validated 任务可确认并提交导入", async () => {
    const job: AdminImportJobRecord = {
      id: "job-1",
      actorId: "admin-1",
      format: "csv",
      mode: "validate",
      status: "validated",
      summary: { totalRows: 1, createdSchools: 0, updatedSchools: 0, upsertedPrograms: 0 },
      payload: [schoolRow()],
      version: 1,
      expiresAt: new Date(Date.now() + 3_600_000),
    };
    const repo = fakeSchoolRepo([job]);
    const service = new AdminSchoolService(repo);
    const result = await service.confirmImport(actor, "job-1", "req-9");

    expect(result.status).toBe("completed");
    expect(result.summary.createdSchools).toBe(1);
    expect(repo.commits[0]).toMatchObject({ jobId: "job-1", actorId: "admin-1" });
  });

  it("已完成任务不可再次确认（409 IMPORT_JOB_EXPIRED）", async () => {
    const job: AdminImportJobRecord = {
      id: "job-2",
      actorId: "admin-1",
      format: "csv",
      mode: "validate",
      status: "completed",
      summary: { totalRows: 1, createdSchools: 1, updatedSchools: 0, upsertedPrograms: 0 },
      payload: [schoolRow()],
      version: 2,
      expiresAt: new Date(now.getTime() + 3_600_000),
    };
    const service = new AdminSchoolService(fakeSchoolRepo([job]));

    await expect(service.confirmImport(actor, "job-2", null)).rejects.toMatchObject({
      code: "IMPORT_JOB_EXPIRED",
    });
  });

  it("过期任务不可确认", async () => {
    const job: AdminImportJobRecord = {
      id: "job-3",
      actorId: "admin-1",
      format: "csv",
      mode: "validate",
      status: "validated",
      summary: { totalRows: 1, createdSchools: 0, updatedSchools: 0, upsertedPrograms: 0 },
      payload: [schoolRow()],
      version: 1,
      expiresAt: new Date(now.getTime() - 1_000),
    };
    const service = new AdminSchoolService(fakeSchoolRepo([job]));

    await expect(service.confirmImport(actor, "job-3", null)).rejects.toMatchObject({
      code: "IMPORT_JOB_EXPIRED",
    });
  });
});

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

describe("管理端专业列表（ADMIN-SCH-08）", () => {
  it("返回全部专业并映射 DTO（含未发布、Decimal 转数值）", async () => {
    const programs = [
      programRow({ id: "p-1", year: 2025, minScore: 355, avgScore: 372.5 }),
      programRow({ id: "p-2", year: 2024, majorCode: "125100", majorName: "工商管理" }),
    ];
    const service = new AdminSchoolService(
      fakeSchoolRepo([], programs, schoolRecord()),
    );
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
    const service = new AdminSchoolService(
      fakeSchoolRepo([], programs, schoolRecord()),
    );
    const { rows } = await service.listPrograms(actor, "s-1", 2024);

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("p-2");
  });

  it("院校不存在返回 404", async () => {
    const service = new AdminSchoolService(fakeSchoolRepo([], [], null));

    await expect(service.listPrograms(actor, "s-404", null)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("非管理员触发 ADMIN_REQUIRED", async () => {
    const service = new AdminSchoolService(
      fakeSchoolRepo([], [], schoolRecord()),
    );
    const userActor = {
      user: { id: "u-9", email: "u@t.dev", nickname: "考生", role: "user", isBanned: false },
    };

    await expect(
      service.listPrograms(userActor, "s-1", null),
    ).rejects.toMatchObject({ code: "ADMIN_REQUIRED" });
  });
});
