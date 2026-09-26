/**
 * 用户活动事件契约（p1 admin-readonly-activity ADR-2/3）。
 * 活动收集是观测旁路：实现方必须自行吞掉采集失败，不得影响业务主流程。
 */
export const ACTIVITY_TYPES = ["login", "question_attempt", "card_review"] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface RecordActivityInput {
  userId: string;
  type: ActivityType;
  /** 最少必要字段（id/布尔/枚举），禁止存放题干、答案等正文。 */
  summary?: Record<string, unknown>;
}

export interface ActivityRecorder {
  record(input: RecordActivityInput): Promise<void>;
}
