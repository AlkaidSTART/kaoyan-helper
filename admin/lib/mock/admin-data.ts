/**
 * 示例数据：仅供管理后台 UI 设计预览。
 * P2-10 管理接口（/api/v1/admin/*）落地后，页面将替换为真实 API 数据，类型保持不变。
 */

export type UserStatus = "active" | "banned";

export interface AdminUser {
  id: string;
  email: string;
  nickname: string;
  role: "user" | "admin";
  status: UserStatus;
  examYear: number | null;
  createdAt: string;
}

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface AdminQuestion {
  id: string;
  subject: string;
  stem: string;
  type: string;
  source: "official" | "ugc";
  reviewStatus: ReviewStatus;
  creator: string | null;
  createdAt: string;
}

export interface UgcReviewItem {
  id: string;
  subject: string;
  stem: string;
  creator: string;
  submittedAt: string;
}

export interface AdminSchool {
  id: string;
  name: string;
  province: string;
  region: string;
  tags: string[];
  isPublished: boolean;
}

export interface DashboardStats {
  totalUsers: number;
  todayAnswers: number;
  aiCalls: number;
  pendingUgc: number;
}

export const DASHBOARD_STATS: DashboardStats = {
  totalUsers: 1284,
  todayAnswers: 3521,
  aiCalls: 216,
  pendingUgc: 8,
};

export const ADMIN_USERS: AdminUser[] = [
  { id: "u-001", email: "chen@example.com", nickname: "陈同学", role: "user", status: "active", examYear: 2027, createdAt: "2026-09-20" },
  { id: "u-002", email: "liu@example.com", nickname: "刘同学", role: "user", status: "active", examYear: 2027, createdAt: "2026-09-21" },
  { id: "u-003", email: "admin@example.com", nickname: "运营管理员", role: "admin", status: "active", examYear: null, createdAt: "2026-09-01" },
  { id: "u-004", email: "wang@example.com", nickname: "王同学", role: "user", status: "banned", examYear: 2028, createdAt: "2026-09-22" },
  { id: "u-005", email: "zhao@example.com", nickname: "赵同学", role: "user", status: "active", examYear: 2027, createdAt: "2026-09-24" },
  { id: "u-006", email: "sun@example.com", nickname: "孙同学", role: "user", status: "active", examYear: null, createdAt: "2026-09-25" },
];

export const ADMIN_QUESTIONS: AdminQuestion[] = [
  { id: "q-001", subject: "政治", stem: "唯物辩证法的实质和核心是（ ）", type: "单选", source: "official", reviewStatus: "approved", creator: null, createdAt: "2026-09-10" },
  { id: "q-002", subject: "英语", stem: "Choose the correct synonym of \"abandon\".", type: "单选", source: "official", reviewStatus: "approved", creator: null, createdAt: "2026-09-11" },
  { id: "q-003", subject: "数学", stem: "设函数 f(x) 连续，则下列命题正确的是（ ）", type: "单选", source: "ugc", reviewStatus: "pending", creator: "陈同学", createdAt: "2026-09-24" },
  { id: "q-004", subject: "政治", stem: "简述实践与认识的辩证关系。", type: "简答", source: "ugc", reviewStatus: "approved", creator: "刘同学", createdAt: "2026-09-22" },
  { id: "q-005", subject: "专业课", stem: "解释操作系统中进程与线程的区别。", type: "简答", source: "ugc", reviewStatus: "rejected", creator: "赵同学", createdAt: "2026-09-23" },
  { id: "q-006", subject: "英语", stem: "Fill in the blank: He ___ to school every day.", type: "填空", source: "ugc", reviewStatus: "pending", creator: "孙同学", createdAt: "2026-09-25" },
];

export const UGC_QUEUE: UgcReviewItem[] = [
  { id: "q-003", subject: "数学", stem: "设函数 f(x) 连续，则下列命题正确的是（ ）", creator: "陈同学", submittedAt: "2026-09-24 14:20" },
  { id: "q-006", subject: "英语", stem: "Fill in the blank: He ___ to school every day.", creator: "孙同学", submittedAt: "2026-09-25 09:05" },
  { id: "q-007", subject: "政治", stem: "剩余价值的本质是（ ）", creator: "刘同学", submittedAt: "2026-09-25 18:42" },
];

export const ADMIN_SCHOOLS: AdminSchool[] = [
  { id: "s-001", name: "清华大学", province: "北京", region: "华北", tags: ["985", "双一流", "自划线"], isPublished: true },
  { id: "s-002", name: "上海交通大学", province: "上海", region: "华东", tags: ["985", "双一流", "自划线"], isPublished: true },
  { id: "s-003", name: "华中科技大学", province: "湖北", region: "华中", tags: ["985", "双一流"], isPublished: true },
  { id: "s-004", name: "深圳大学", province: "广东", region: "华南", tags: ["省重点"], isPublished: false },
  { id: "s-005", name: "云南大学", province: "云南", region: "西南", tags: ["211", "双一流"], isPublished: true },
];
