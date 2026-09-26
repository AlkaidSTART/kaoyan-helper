import { AppError, ERROR_CODES } from "../../api/errors";
import { formatUtcTimestamp } from "../../api/response";
import { judgeAnswer, type JudgeQuestion, type QuestionOption } from "../../domain/judging";

export type QuizScope = "public" | "mine";

export interface QuestionFilters {
  scope: QuizScope;
  subject: string | null;
  chapter: string | null;
  year: number | null;
  type: string | null;
  difficulty: string | null;
  search: string | null;
}

export interface QuestionSummaryDto {
  id: string;
  subject: string;
  chapter: string | null;
  year: number | null;
  type: string;
  stem: string;
  options: QuestionOption[];
  difficulty: string | null;
  source: string;
  isPublic: boolean;
  isApproved: boolean;
  reviewStatus: string;
  isMine: boolean;
  createdAt: string;
}

export interface QuestionDetailDto extends QuestionSummaryDto {
  explanation: string | null;
  answer: string | null;
  version: number;
}

export interface QuestionRow {
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
  visibility: string;
  reviewStatus: string;
  isApproved: boolean;
  creatorId: string | null;
  isDeleted: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateQuestionInput {
  subject: string;
  chapter: string | null;
  year: number | null;
  type: string;
  stem: string;
  options: QuestionOption[];
  answer: string;
  explanation: string | null;
  difficulty: string | null;
  visibility: "private" | "public";
}

export interface UpdateQuestionInput {
  subject?: string;
  chapter?: string | null;
  year?: number | null;
  type?: string;
  stem?: string;
  options?: QuestionOption[];
  answer?: string;
  explanation?: string | null;
  difficulty?: string | null;
  visibility?: "private" | "public";
  version: number;
}

export interface SubmitAnswerInput {
  answer: string;
  attemptId: string;
}

export interface MistakeSnapshot {
  id: string;
  status: string;
  errorCount: number;
  consecutiveCorrect: number;
  masteredAt: string | null;
}

export interface SubmittedMistakeRow {
  id: string;
  status: string;
  errorCount: number;
  consecutiveCorrect: number;
  masteredAt: Date | null;
}

export interface AnswerResultDto {
  isCorrect: boolean;
  correctAnswer: string;
  explanation: string | null;
  mistake: MistakeSnapshot | null;
  answeredAt: string;
}

export interface QuizRepository {
  listQuestions(
    userId: string,
    filters: QuestionFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: QuestionRow[]; total: number }>;

  findQuestionById(questionId: string): Promise<QuestionRow | null>;

  /**
   * 判题事务：记录 attempt、维护错题状态机，保证幂等。
   * 同一 (userId, attemptId) 重复提交返回首次结果。
   */
  submitAnswer(params: {
    userId: string;
    question: QuestionRow;
    normalizedAnswer: string;
    isCorrect: boolean;
    attemptId: string;
    answeredAt: Date;
  }): Promise<{ mistake: SubmittedMistakeRow | null }>;

  createQuestion(userId: string, input: CreateQuestionInput): Promise<QuestionRow>;

  updateQuestion(
    userId: string,
    questionId: string,
    input: UpdateQuestionInput,
  ): Promise<QuestionRow>;

  softDeleteQuestion(userId: string, questionId: string, version: number): Promise<void>;
}

export class QuizService {
  private readonly repository: QuizRepository;

  constructor(repository: QuizRepository) {
    this.repository = repository;
  }

  async list(
    userId: string,
    filters: QuestionFilters,
    page: number,
    pageSize: number,
  ): Promise<{ rows: QuestionRow[]; total: number }> {
    return this.repository.listQuestions(userId, filters, page, pageSize);
  }

  /** 详情对创建者返回答案与解析；普通访问不得泄漏。 */
  async getDetail(actorId: string, questionId: string): Promise<QuestionDetailDto> {
    const row = await this.requireAccessible(actorId, questionId);

    return toDetailDto(row, actorId);
  }

  async submitAnswer(
    userId: string,
    questionId: string,
    input: SubmitAnswerInput,
  ): Promise<AnswerResultDto> {
    const question = await this.requireAccessible(userId, questionId);
    const outcome = judgeAnswer(toJudgeQuestion(question), input.answer);
    const now = new Date();

    const { mistake } = await this.repository.submitAnswer({
      userId,
      question,
      normalizedAnswer: outcome.normalizedAnswer,
      isCorrect: outcome.isCorrect,
      attemptId: input.attemptId,
      answeredAt: now,
    });

    return {
      isCorrect: outcome.isCorrect,
      correctAnswer: question.answer,
      explanation: question.explanation,
      mistake: mistake ? toMistakeSnapshot(mistake) : null,
      answeredAt: formatUtcTimestamp(now),
    };
  }

  async create(userId: string, input: CreateQuestionInput): Promise<QuestionDetailDto> {
    const row = await this.repository.createQuestion(userId, input);

    return toDetailDto(row, userId);
  }

  async update(
    userId: string,
    questionId: string,
    input: UpdateQuestionInput,
  ): Promise<QuestionDetailDto> {
    const existing = await this.repository.findQuestionById(questionId);

    if (!existing || existing.isDeleted || existing.creatorId !== userId) {
      // 私有资源非本人按 404 防枚举（契约 §4.3 第 5 步）。
      throw new AppError(ERROR_CODES.NOT_FOUND);
    }

    const row = await this.repository.updateQuestion(userId, questionId, input);

    return toDetailDto(row, userId);
  }

  async remove(userId: string, questionId: string, version: number): Promise<void> {
    const existing = await this.repository.findQuestionById(questionId);

    if (!existing || existing.isDeleted || existing.creatorId !== userId) {
      throw new AppError(ERROR_CODES.NOT_FOUND);
    }

    await this.repository.softDeleteQuestion(userId, questionId, version);
  }

  /** 供 AI 讲解等服务读取可访问题目原始行（含答案），仍执行同一可访问性检查。 */
  async getAccessibleRow(actorId: string, questionId: string): Promise<QuestionRow> {
    return this.requireAccessible(actorId, questionId);
  }

  private async requireAccessible(actorId: string, questionId: string): Promise<QuestionRow> {
    const row = await this.repository.findQuestionById(questionId);

    if (
      !row ||
      row.isDeleted ||
      !(row.creatorId === actorId || (row.source === "official" && row.reviewStatus === "approved"))
    ) {
      throw new AppError(ERROR_CODES.QUESTION_NOT_ACCESSIBLE);
    }

    return row;
  }
}

export function toSummaryDto(row: QuestionRow, actorId: string): QuestionSummaryDto {
  return {
    id: row.id,
    subject: row.subject,
    chapter: row.chapter,
    year: row.year,
    type: row.type,
    stem: row.stem,
    options: toOptions(row.options),
    difficulty: row.difficulty,
    source: row.source,
    isPublic: row.visibility === "public",
    isApproved: row.isApproved,
    reviewStatus: row.reviewStatus,
    isMine: row.creatorId === actorId,
    createdAt: formatUtcTimestamp(row.createdAt),
  };
}

export function toDetailDto(row: QuestionRow, actorId: string): QuestionDetailDto {
  return {
    ...toSummaryDto(row, actorId),
    explanation: row.explanation,
    answer: row.answer,
    version: row.version,
  };
}

export function toMistakeSnapshot(row: SubmittedMistakeRow): MistakeSnapshot {
  return {
    id: row.id,
    status: row.status,
    errorCount: row.errorCount,
    consecutiveCorrect: row.consecutiveCorrect,
    masteredAt: row.masteredAt === null ? null : formatUtcTimestamp(row.masteredAt),
  };
}

export function toOptions(value: unknown): QuestionOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is QuestionOption =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as QuestionOption).key === "string" &&
      typeof (item as QuestionOption).content === "string",
  );
}

export function toJudgeQuestion(row: QuestionRow): JudgeQuestion {
  return {
    type: row.type,
    options: toOptions(row.options),
    answer: row.answer,
  };
}
