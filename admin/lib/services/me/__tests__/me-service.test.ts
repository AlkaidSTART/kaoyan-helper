import { describe, expect, it, vi } from "vitest";

import { AppError, ERROR_CODES } from "../../../api/errors";
import type {
  MeRepository,
  MeTargetRow,
  MeUserRow,
  TargetInput,
  UpdateProfileInput,
} from "../me-service";
import { assertTargetLimits, MeService } from "../me-service";

const USER_A = "11111111-1111-4111-8111-111111111111";
const SCHOOL_1 = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const SCHOOL_2 = "ffffffff-ffff-4fff-8fff-ffffffffffff";

function userRow(): MeUserRow {
  return {
    id: USER_A,
    email: "user@example.com",
    nickname: "登科同学",
    avatarUrl: null,
    examYear: 2027,
    role: "user",
    isBanned: false,
    createdAt: new Date("2026-09-01T00:00:00Z"),
    updatedAt: new Date("2026-09-01T00:00:00Z"),
  };
}

function targetRow(overrides: Partial<MeTargetRow> = {}): MeTargetRow {
  return {
    schoolId: SCHOOL_1,
    schoolName: "示例大学",
    type: "primary",
    majorCode: "085400",
    majorName: "电子信息",
    updatedAt: new Date("2026-09-26T10:00:00Z"),
    ...overrides,
  };
}

function fakeRepository(targets: MeTargetRow[] = []): MeRepository & {
  replaceSpy: ReturnType<typeof vi.fn>;
} {
  const replaceSpy = vi.fn(async (_userId: string, inputs: TargetInput[]) =>
    inputs.map((input) =>
      targetRow({
        schoolId: input.schoolId,
        type: input.type,
        majorCode: input.majorCode,
        majorName: input.majorName,
      }),
    ),
  );

  return {
    findUserById: async () => userRow(),
    updateUserProfile: async (_userId: string, input: UpdateProfileInput) => ({ ...userRow(), ...input }),
    listTargets: async () => targets,
    replaceTargets: replaceSpy,
    replaceSpy,
  } as unknown as MeRepository & { replaceSpy: ReturnType<typeof vi.fn> };
}

describe("MeService.replaceTargets", () => {
  it("enforces the three-target ceiling", () => {
    expect(() =>
      assertTargetLimits([
        { schoolId: SCHOOL_1, type: "primary", majorCode: null, majorName: null },
        { schoolId: SCHOOL_2, type: "backup", majorCode: null, majorName: null },
        { schoolId: SCHOOL_1, type: "backup", majorCode: "085400", majorName: null },
        { schoolId: SCHOOL_2, type: "backup", majorCode: "035200", majorName: null },
      ]),
    ).toThrowError(AppError);

    try {
      assertTargetLimits([
        { schoolId: SCHOOL_1, type: "primary", majorCode: null, majorName: null },
        { schoolId: SCHOOL_2, type: "backup", majorCode: null, majorName: null },
        { schoolId: SCHOOL_1, type: "backup", majorCode: "085400", majorName: null },
        { schoolId: SCHOOL_2, type: "backup", majorCode: "035200", majorName: null },
      ]);
    } catch (error) {
      expect((error as AppError).code).toBe(ERROR_CODES.TARGET_LIMIT_EXCEEDED);
    }
  });

  it("rejects multiple primary targets", () => {
    try {
      assertTargetLimits([
        { schoolId: SCHOOL_1, type: "primary", majorCode: null, majorName: null },
        { schoolId: SCHOOL_2, type: "primary", majorCode: null, majorName: null },
      ]);

      throw new Error("should have thrown");
    } catch (error) {
      expect((error as AppError).code).toBe(ERROR_CODES.TARGET_PRIMARY_CONFLICT);
    }
  });

  it("rejects duplicate targets", () => {
    try {
      assertTargetLimits([
        { schoolId: SCHOOL_1, type: "primary", majorCode: "085400", majorName: null },
        { schoolId: SCHOOL_1, type: "primary", majorCode: "085400", majorName: null },
      ]);

      throw new Error("should have thrown");
    } catch (error) {
      expect((error as AppError).code).toBe(ERROR_CODES.TARGET_PRIMARY_CONFLICT);
    }
  });

  it("replaces targets atomically and returns school snapshots", async () => {
    const repository = fakeRepository();
    const service = new MeService(repository);

    const result = await service.replaceTargets(USER_A, [
      { schoolId: SCHOOL_2, type: "backup", majorCode: null, majorName: null },
    ]);

    expect(repository.replaceSpy).toHaveBeenCalledWith(
      USER_A,
      [{ schoolId: SCHOOL_2, type: "backup", majorCode: null, majorName: null }],
      expect.any(Date),
    );
    expect(result.targets).toHaveLength(1);
    expect(result.targets[0].schoolName).toBe("示例大学");
  });
});

describe("MeService.updateProfile", () => {
  it("updates only profile fields", async () => {
    const repository = fakeRepository([targetRow()]);
    const service = new MeService(repository);

    const result = await service.updateProfile(USER_A, {
      nickname: "新昵称",
      avatarUrl: "https://example.com/a.png",
      examYear: 2028,
    });

    expect(result.user).toMatchObject({
      nickname: "新昵称",
      examYear: 2028,
      role: "user",
    });
  });
});
