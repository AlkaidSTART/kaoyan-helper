import { AppError, ERROR_CODES } from "../../api/errors";
import { formatUtcTimestamp } from "../../api/response";
import { judgeAnswer, nextMistakeState } from "../../domain/judging";
import { toJudgeQuestion, toOptions, type QuestionRow } from "../quiz/quiz-service";

export interface MistakeFilters {
  status: string | null;
  subject: string | null;
}

export interface MistakeQuestionSummary {
  id: string;
  subject: string;
  chapter: string | null;
  year: number | null;
  type: string;
  stem: string;
  options: { key: string; content: string }[];
  difficulty: string | null;
  source: string;
}

export interface MistakeRow {
  id: string;
  userId: string;
  questionId: string;
  status: string;
  errorCount: number;
  consecutiveCorrect: number;
  lastWrongAt: Date;
  masteredAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  question: {
    id: string;
    subject: string;
    chapter: string | null;
    year: number | null;
    type: string;
    stem: string;
    options: unknown;
    answer: string;
    explanation: string | null;
    difficulty: string | null;
    source: string;
  } | null;
}

export interface MistakeDto {
  id: string;
  status: string;
  errorCount: number;
  consecutiveCorrect: number;
  lastWrongAt: string;
  masteredAt: string | null;
  createdAt: string;
  updatedAt: string;
  question: MistakeQuestionSummary | null;
}

export interface MistakeDetailDto extends MistakeDto {
  correctAnswer: string | null;
  explanation: string | null;
  version: number;
}

export interface RedoInput {
  answer: string;
  attemptId: string;
}

export interface RedoResultDto {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string | null;
  mistake: MistakeDto;
  mastered: boolean;
  answeredAt: string;
}

export interface MistakeRepository {
  listMistakes(
    userId: string,
    filters: MistakeFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: MistakeRow[]; total: number }>;

  findMistakeById(mistakeId: string): Promise<MistakeRow | null>;

  /**
   * 重做事务：attempt 幂等（唯一 user_id + attempt_id）+ 错题状态机更新。
   * 同一 attemptId 重复提交返回首次结果（replayed=true）。
   */
  redoMistake(params: {
    userId: string;
    mistakeId: string;
    questionId: string;
    normalizedAnswer: string;
    isCorrect: boolean;
    attemptId: string;
    answeredAt: Date;
  }): Promise<{ replayed: boolean; mistake: MistakeRow | null }>;

  reactivateMistake(userId: string, mistakeId: string, version: number): Promise<MistakeRow>;

  deleteMistake(userId: string, mistakeId: string, version: number): Promise<void>;
}

export class MistakeService {
  private readonly repository: MistakeRepository;

  constructor(repository: MistakeRepository) {
    this.repository = repository;
  }

  async list(
    userId: string,
    filters: MistakeFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: MistakeRow[]; total: number }> {
    return this.repository.listMistakes(userId, filters, page, pageSize);
  }

  async getDetail(userId: string, mistakeId: string): Promise<MistakeDetailDto> {
    const row = await this.requireOwn(userId, mistakeId);

    return toDetailDto(row);
  }

  async redo(userId: string, mistakeId: string, input: RedoInput): Promise<RedoResultDto> {
    const row = await this.requireOwn(userId, mistakeId);

    if (!row.question) {
      // 题目被物理删除的历史错题无法重做；软删除场景题目行仍存在。
      throw new AppError(ERROR_CODES.QUESTION_NOT_ACCESSIBLE);
    }

    const outcome = judgeAnswer(toJudgeQuestion(row.question as QuestionRow), input.answer);
    const now = new Date();

    const { replayed, mistake } = await this.repository.redoMistake({
      userId,
      mistakeId: row.id,
      questionId: row.questionId,
      normalizedAnswer: outcome.normalizedAnswer,
      isCorrect: outcome.isCorrect,
      attemptId: input.attemptId,
      answeredAt: now,
    });

    void replayed;

    const current = mistake ?? row;

    return {
      isCorrect: outcome.isCorrect,
      correctAnswer: row.question.answer,
      explanation: row.question.explanation,
      mistake: toMistakeDto(current),
      mastered: current.status === "mastered",
      answeredAt: formatUtcTimestamp(now),
    };
  }

  /** 仅允许 mastered -> active；同时清零连对与掌握时间（契约 MIS-04）。 */
  async reactivate(
    userId: string,
    mistakeId: string,
    status: "active",
    version: number,
  ): Promise<MistakeDto> {
    const row = await this.requireOwn(userId, mistakeId);

    if (row.status !== "mastered") {
      throw new AppError(ERROR_CODES.CONFLICT);
    }

    const updated = await this.repository.reactivateMistake(userId, mistakeId, version);

    return toMistakeDto(updated);
  }

  /** 删除错题不删除题库题目（契约 MIS-05）。 */
  async remove(userId: string, mistakeId: string, version: number): Promise<void> {
    const row = await this.requireOwn(userId, mistakeId);

    await this.repository.deleteMistake(userId, row.id, version);
  }

  private async requireOwn(userId: string, mistakeId: string): Promise<MistakeRow> {
    const row = await this.repository.findMistakeById(mistakeId);

    if (!row || row.userId !== userId) {
      // 仅本人：非本人按 404 防枚举。
      throw new AppError(ERROR_CODES.MISTAKE_NOT_FOUND);
    }

    return row;
  }
}

export function toMistakeDto(row: MistakeRow): MistakeDto {
  return {
    id: row.id,
    status: row.status,
    errorCount: row.errorCount,
    consecutiveCorrect: row.consecutiveCorrect,
    lastWrongAt: formatUtcTimestamp(row.lastWrongAt),
    masteredAt: row.masteredAt === null ? null : formatUtcTimestamp(row.masteredAt),
    createdAt: formatUtcTimestamp(row.createdAt),
    updatedAt: formatUtcTimestamp(row.updatedAt),
    question: row.question
      ? {
          id: row.question.id,
          subject: row.question.subject,
          chapter: row.question.chapter,
          year: row.question.year,
          type: row.question.type,
          stem: row.question.stem,
          options: toOptions(row.question.options),
          difficulty: row.question.difficulty,
          source: row.question.source,
        }
      : null,
  };
}

export function toDetailDto(row: MistakeRow): MistakeDetailDto {
  return {
    ...toMistakeDto(row),
    correctAnswer: row.question?.answer ?? null,
    explanation: row.question?.explanation ?? null,
    version: row.version,
  };
}

export { nextMistakeState };
