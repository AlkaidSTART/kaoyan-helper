import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AuthService } from "@/lib/auth/auth-service";
import { PrismaAuthRepository } from "@/lib/auth/prisma-auth-repository";
import { AdminActivityService } from "@/lib/services/admin/admin-activity-service";
import { PrismaAdminActivityRepository } from "@/lib/services/admin/prisma-admin-activity-repository";
import { ACTIVITY_TYPES } from "@/lib/services/activity/activity-recorder";

export const metadata: Metadata = { title: "用户活动" };

const PAGE_SIZE = 20;

const TYPE_LABELS: Record<string, string> = {
  login: "登录",
  question_attempt: "答题",
  card_review: "卡片复习",
};

const RATING_LABELS: Record<string, string> = {
  forgot: "忘记",
  fuzzy: "模糊",
  remembered: "记得",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readFirst(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;

  return raw?.trim() ? raw.trim() : null;
}

function summarize(type: string, summary: unknown): string {
  if (typeof summary !== "object" || summary === null) {
    return "—";
  }

  const data = summary as Record<string, unknown>;

  if (type === "login") {
    const device = typeof data.deviceName === "string" ? data.deviceName : null;

    return device ? `客户端登录 · ${device}` : "客户端登录";
  }

  if (type === "question_attempt") {
    const verdict = data.isCorrect === true ? "答对" : "答错";

    return `${verdict} · 题目 ${shortId(data.questionId)}`;
  }

  if (type === "card_review") {
    const rating = typeof data.rating === "string" ? RATING_LABELS[data.rating] ?? data.rating : "—";

    return `${rating} · 卡片 ${shortId(data.cardId)}`;
  }

  return "—";
}

function shortId(value: unknown): string {
  return typeof value === "string" ? value.slice(0, 8) : "—";
}

interface ActivitiesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** 用户活动观察页（契约 ADMIN-ACT-01）：只读，服务端直读活动事件。 */
export default async function ActivitiesPage({ searchParams }: ActivitiesPageProps) {
  const query = await searchParams;

  const authService = new AuthService({ repository: new PrismaAuthRepository() });
  const session = await authService
    .getSession((await cookies()).get("admin_session")?.value ?? null)
    .catch(() => null);

  if (!session) {
    redirect("/login");
  }

  const rawType = readFirst(query.type);
  const type = rawType !== null && ACTIVITY_TYPES.includes(rawType as never) ? rawType : null;
  const rawUserId = readFirst(query.userId);
  const userId = rawUserId !== null && UUID_PATTERN.test(rawUserId) ? rawUserId : null;
  const rawPage = Number(readFirst(query.page) ?? "1");
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? Math.min(rawPage, 10_000) : 1;

  const service = new AdminActivityService(new PrismaAdminActivityRepository());
  const { rows, total } = await service.list(
    { user: session.user },
    { userId, type },
    page,
    PAGE_SIZE,
  );

  const hasNext = page * PAGE_SIZE < total;
  const buildHref = (overrides: Record<string, string | null>): string => {
    const params = new URLSearchParams();

    const merged = { type, userId, page: String(page), ...overrides };

    for (const [key, value] of Object.entries(merged)) {
      if (value !== null && value !== "") {
        params.set(key, value);
      }
    }

    const qs = params.toString();

    return qs ? `/activities?${qs}` : "/activities";
  };

  return (
    <>
      <PageHeader
        title="用户活动"
        description="登录、答题与卡片复习的原始活动流（只读观测）"
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant={type === null ? "default" : "outline"}>
          <Link href={buildHref({ type: null, page: "1" })}>全部</Link>
        </Button>
        {ACTIVITY_TYPES.map((item) => (
          <Button
            key={item}
            asChild
            size="sm"
            variant={type === item ? "default" : "outline"}
          >
            <Link href={buildHref({ type: item, page: "1" })}>{TYPE_LABELS[item] ?? item}</Link>
          </Button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>时间</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>用户</TableHead>
              <TableHead>摘要</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="tabular-nums text-muted-foreground">
                  {row.occurredAt}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{TYPE_LABELS[row.type] ?? row.type}</Badge>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{row.user.nickname ?? "未命名"}</div>
                  <div className="text-xs text-muted-foreground">{row.user.email}</div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {summarize(row.type, row.summary)}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  暂无活动记录
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>共 {total} 条记录</span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Button asChild size="sm" variant="outline">
              <Link href={buildHref({ page: String(page - 1) })}>上一页</Link>
            </Button>
          ) : null}
          {hasNext ? (
            <Button asChild size="sm" variant="outline">
              <Link href={buildHref({ page: String(page + 1) })}>下一页</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </>
  );
}
