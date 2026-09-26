import type { PrismaClient } from "@/generated/prisma/client";

import { getPrismaClient } from "../../db/prisma";
import type {
  AdminDashboardRepository,
  TopMistakeItem,
} from "./admin-dashboard-service";

/**
 * 管理看板聚合仓储（契约 ADMIN-DASH-01）。
 * 全部为只读聚合查询；DAU/WAU 以答题行为活跃口径，AI 用量按自然日聚合。
 */
export class PrismaAdminDashboardRepository implements AdminDashboardRepository {
  private readonly injectedClient?: PrismaClient;

  private resolvedClient?: PrismaClient;

  constructor(client?: PrismaClient) {
    this.injectedClient = client;
  }

  private get client(): PrismaClient {
    if (!this.resolvedClient) {
      this.resolvedClient = this.injectedClient ?? getPrismaClient();
    }

    return this.resolvedClient;
  }

  async countDistinctAttemptUsers(from: Date, toExclusive: Date): Promise<number> {
    const rows = await this.client.questionAttempt.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: from, lt: toExclusive } },
      _count: { _all: true },
    });

    return rows.length;
  }

  async countQuestionAnswers(from: Date, toExclusive: Date): Promise<number> {
    return this.client.questionAttempt.count({
      where: { createdAt: { gte: from, lt: toExclusive } },
    });
  }

  async sumAiUsage(
    fromDay: Date,
    toDayExclusive: Date,
  ): Promise<{ calls: number; costEstimate: number }> {
    const aggregate = await this.client.aiUsageDaily.aggregate({
      where: { usageDate: { gte: fromDay, lt: toDayExclusive } },
      _sum: { callCount: true, costEstimate: true },
    });

    return {
      calls: aggregate._sum.callCount ?? 0,
      costEstimate: aggregate._sum.costEstimate === null
        ? 0
        : Number(aggregate._sum.costEstimate),
    };
  }

  async countTotalUsers(): Promise<number> {
    return this.client.user.count();
  }

  async countPendingUgc(): Promise<number> {
    return this.client.question.count({
      where: { source: "ugc", reviewStatus: "pending", isDeleted: false },
    });
  }

  async listTopMistakes(
    from: Date,
    toExclusive: Date,
    limit: number,
  ): Promise<TopMistakeItem[]> {
    const grouped = await this.client.mistakeRecord.groupBy({
      by: ["questionId"],
      where: { lastWrongAt: { gte: from, lt: toExclusive } },
      _count: { _all: true },
      orderBy: { _count: { questionId: "desc" } },
      take: limit,
    });

    if (grouped.length === 0) {
      return [];
    }

    const questionIds = grouped.map((row) => row.questionId);
    const questions = await this.client.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, stem: true },
    });
    const stemById = new Map(questions.map((question) => [question.id, question.stem]));

    return grouped.map((row) => ({
      questionId: row.questionId,
      stem: stemById.get(row.questionId) ?? "",
      errorCount: row._count._all,
    }));
  }
}

