import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ADMIN_USERS,
  UGC_QUEUE,
} from "@/lib/mock/admin-data";

export const metadata: Metadata = { title: "概览" };

const STATS = [
  { label: "注册用户", value: "1,284", hint: "较上周 +6.2%", icon: Users },
  { label: "今日答题", value: "3,521", hint: "较昨日 +12.4%", icon: BookOpen },
  { label: "AI 调用", value: "216", hint: "今日配额内", icon: Sparkles },
  { label: "待审核 UGC", value: "8", hint: "需要处理", icon: ShieldCheck },
] as const;

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="概览"
        description="平台运营数据与待办事项"
      >
        <StatusBadge tone="warning" label="示例数据" />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <stat.icon className="size-4 text-muted-foreground" aria-hidden />
                {stat.label}
              </CardDescription>
              <CardTitle className="text-2xl tabular-nums">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{stat.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base">待审核 UGC</CardTitle>
              <CardDescription>用户提交的题目等待审核</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/ugc">
                全部
                <ArrowUpRight aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>题目</TableHead>
                  <TableHead>提交人</TableHead>
                  <TableHead className="text-right">提交时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {UGC_QUEUE.slice(0, 3).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-64 truncate">{item.stem}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.creator}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {item.submittedAt}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="text-base">最近注册</CardTitle>
              <CardDescription>最新加入的考生</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/users">
                全部
                <ArrowUpRight aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>昵称</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead className="text-right">注册时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ADMIN_USERS.slice(0, 4).map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.nickname}
                      {user.role === "admin" ? (
                        <Badge variant="outline" className="ml-2">
                          管理员
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {user.createdAt}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
