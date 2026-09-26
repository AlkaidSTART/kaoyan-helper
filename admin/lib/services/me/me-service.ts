import { AppError, ERROR_CODES } from "../../api/errors";
import type { PaginationParams } from "../../api/pagination";
import type { AuthUserRecord } from "../../auth/auth-repository";
import { formatUtcTimestamp } from "../../api/response";

export interface TargetDto {
  schoolId: string;
  schoolName: string;
  type: "primary" | "backup";
  majorCode: string | null;
  majorName: string | null;
  updatedAt: string;
}

export interface MeDto {
  user: {
    id: string;
    email: string;
    nickname: string | null;
    avatarUrl: string | null;
    role: string;
    isBanned: boolean;
    examYear: number | null;
    createdAt: string;
    updatedAt: string;
  };
  targets: TargetDto[];
}

export interface TargetInput {
  schoolId: string;
  type: "primary" | "backup";
  majorCode: string | null;
  majorName: string | null;
}

export interface UpdateProfileInput {
  nickname: string | null;
  avatarUrl: string | null;
  examYear: number | null;
}

export interface MeUserRow {
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

export interface MeTargetRow {
  schoolId: string;
  schoolName: string;
  type: string;
  majorCode: string | null;
  majorName: string | null;
  updatedAt: Date;
}

export interface MeRepository {
  findUserById(userId: string): Promise<MeUserRow | null>;

  updateUserProfile(userId: string, input: UpdateProfileInput): Promise<MeUserRow>;

  listTargets(userId: string): Promise<MeTargetRow[]>;

  /**
   * 事务内整体替换目标院校。返回写库后的目标列表（含院校名称快照）。
   * 学校不存在或未发布时抛 `AppError(NOT_FOUND)`。
   */
  replaceTargets(userId: string, targets: TargetInput[], now: Date): Promise<MeTargetRow[]>;
}

export const MAX_TARGETS = 3;

export const MAX_PRIMARY_TARGETS = 1;

export class MeService {
  private readonly repository: MeRepository;

  constructor(repository: MeRepository) {
    this.repository = repository;
  }

  async getMe(userId: string): Promise<MeDto> {
    const [user, targets] = await Promise.all([
      this.requireUser(userId),
      this.repository.listTargets(userId),
    ]);

    return { user: toUserDto(user), targets: targets.map(toTargetDto) };
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<MeDto> {
    const user = await this.repository.updateUserProfile(userId, input);
    const targets = await this.repository.listTargets(userId);

    return { user: toUserDto(user), targets: targets.map(toTargetDto) };
  }

  async getTargets(userId: string): Promise<{ targets: TargetDto[] }> {
    const targets = await this.repository.listTargets(userId);

    return { targets: targets.map(toTargetDto) };
  }

  async replaceTargets(
    userId: string,
    inputs: TargetInput[],
  ): Promise<{ targets: TargetDto[] }> {
    assertTargetLimits(inputs);

    await this.requireUser(userId);

    const rows = await this.repository.replaceTargets(userId, inputs, new Date());

    return { targets: rows.map(toTargetDto) };
  }

  private async requireUser(userId: string): Promise<MeUserRow> {
    const user = await this.repository.findUserById(userId);

    if (!user) {
      throw new AppError(ERROR_CODES.AUTH_REQUIRED);
    }

    return user;
  }
}

export function assertTargetLimits(inputs: TargetInput[]): void {
  if (inputs.length > MAX_TARGETS) {
    throw new AppError(ERROR_CODES.TARGET_LIMIT_EXCEEDED);
  }

  const primaryCount = inputs.filter((input) => input.type === "primary").length;

  if (primaryCount > MAX_PRIMARY_TARGETS) {
    throw new AppError(ERROR_CODES.TARGET_PRIMARY_CONFLICT);
  }

  const seen = new Set<string>();

  for (const input of inputs) {
    const key = `${input.schoolId}:${input.type}:${input.majorCode ?? ""}`;

    if (seen.has(key)) {
      throw new AppError(ERROR_CODES.TARGET_PRIMARY_CONFLICT);
    }

    seen.add(key);
  }
}

export function toUserDto(user: MeUserRow) {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isBanned: user.isBanned,
    examYear: user.examYear,
    createdAt: formatUtcTimestamp(user.createdAt),
    updatedAt: formatUtcTimestamp(user.updatedAt),
  };
}

export function toTargetDto(row: MeTargetRow): TargetDto {
  return {
    schoolId: row.schoolId,
    schoolName: row.schoolName,
    type: row.type === "primary" ? "primary" : "backup",
    majorCode: row.majorCode,
    majorName: row.majorName,
    updatedAt: formatUtcTimestamp(row.updatedAt),
  };
}

export type { PaginationParams };
