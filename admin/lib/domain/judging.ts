import { AppError, ERROR_CODES } from "../api/errors";

export type QuestionType = "single_choice" | "multiple_choice" | "judge" | "fill_blank";

export interface QuestionOption {
  key: string;
  content: string;
}

export interface JudgeQuestion {
  type: string;
  options: QuestionOption[];
  answer: string;
}

export interface JudgeOutcome {
  isCorrect: boolean;
  /** 规范化后的用户答案（多选题为排序后的组合键）。 */
  normalizedAnswer: string;
}

function isOptionKey(option: QuestionOption, value: string): boolean {
  return option.key === value;
}

/**
 * 服务端判题（契约 §6.3）：
 * - 单选 / 判断：答案规范化后必须恰好命中一个选项 key。
 * - 多选：选项按字母排序比较，全部正确且无多余选项才算正确。
 * - 填空：去除首尾空白后全等比较。
 * 答案不属于选项或格式非法时抛 422 `ANSWER_INVALID`。
 */
export function judgeAnswer(question: JudgeQuestion, answer: string): JudgeOutcome {
  const raw = answer.trim();

  if (raw.length === 0) {
    throw new AppError(ERROR_CODES.ANSWER_INVALID);
  }

  switch (question.type) {
    case "multiple_choice": {
      const keys = raw
        .split("")
        .map((key) => key.trim().toUpperCase())
        .filter((key) => key.length > 0);

      if (keys.length === 0 || keys.some((key) => !question.options.some((o) => isOptionKey(o, key)))) {
        throw new AppError(ERROR_CODES.ANSWER_INVALID);
      }

      const normalized = [...new Set(keys)].sort().join("");
      const correctKeys = question.options
        .map((option) => option.key.toUpperCase())
        .filter((key) => question.answer.toUpperCase().includes(key))
        .sort()
        .join("");

      return { isCorrect: normalized === correctKeys, normalizedAnswer: normalized };
    }
    case "fill_blank": {
      const normalized = raw;

      return { isCorrect: normalized === question.answer.trim(), normalizedAnswer: normalized };
    }
    case "single_choice":
    case "judge":
    default: {
      const key = raw.toUpperCase();

      if (key.length !== 1 || !question.options.some((option) => isOptionKey(option, key))) {
        throw new AppError(ERROR_CODES.ANSWER_INVALID);
      }

      return { isCorrect: question.answer.trim().toUpperCase() === key, normalizedAnswer: key };
    }
  }
}

/**
 * 错题状态机（契约 §7）。输入当前错题状态与本次判题结果，输出应写入的字段。
 * - 首次答错 / 再次答错：errorCount++、consecutiveCorrect=0。
 * - 重做答对：consecutiveCorrect++；连对达到 2 进入 mastered 并记录 masteredAt。
 */
export interface MistakeStateUpdate {
  status: "active" | "mastered";
  errorCount: number;
  consecutiveCorrect: number;
  masteredAt: Date | null;
}

export function nextMistakeState(
  current: {
    status: string;
    errorCount: number;
    consecutiveCorrect: number;
    masteredAt: Date | null;
  } | null,
  isCorrect: boolean,
  now: Date,
): MistakeStateUpdate {
  if (current === null) {
    return {
      status: "active",
      errorCount: 1,
      consecutiveCorrect: 0,
      masteredAt: null,
    };
  }

  if (!isCorrect) {
    // 已掌握的题再次答错视为重新打开：回到 active 并清空掌握时间。
    return {
      status: "active",
      errorCount: current.errorCount + 1,
      consecutiveCorrect: 0,
      masteredAt: null,
    };
  }

  const consecutiveCorrect = current.consecutiveCorrect + 1;

  if (current.status === "mastered") {
    // 已掌握后答对保持 mastered，保留首次掌握时间。
    return {
      status: "mastered",
      errorCount: current.errorCount,
      consecutiveCorrect,
      masteredAt: current.masteredAt,
    };
  }

  const mastered = consecutiveCorrect >= 2;

  return {
    status: mastered ? "mastered" : "active",
    errorCount: current.errorCount,
    consecutiveCorrect,
    masteredAt: mastered ? now : current.masteredAt,
  };
}
