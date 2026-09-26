import type { Metadata } from "next";

import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge, type StatusTone } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ADMIN_QUESTIONS } from "@/lib/mock/admin-data";

export const metadata: Metadata = { title: "题库管理" };

const REVIEW_TONE: Record<string, { tone: StatusTone; label: string }> = {
  approved: { tone: "success", label: "已通过" },
  pending: { tone: "warning", label: "待审核" },
  rejected: { tone: "danger", label: "已驳回" },
};

export default function QuestionsPage() {
  return (
    <>
      <PageHeader title="题库管理" description="官方题库与用户贡献题目">
        <StatusBadge tone="warning" label="示例数据" />
      </PageHeader>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>题目</TableHead>
              <TableHead>学科</TableHead>
              <TableHead>题型</TableHead>
              <TableHead>来源</TableHead>
              <TableHead>审核状态</TableHead>
              <TableHead className="text-right">创建时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ADMIN_QUESTIONS.map((question) => {
              const review = REVIEW_TONE[question.reviewStatus] ?? REVIEW_TONE.pending;

              return (
                <TableRow key={question.id}>
                  <TableCell className="max-w-72 truncate font-medium">
                    {question.stem}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {question.subject}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {question.type}
                  </TableCell>
                  <TableCell>
                    <Badge variant={question.source === "official" ? "secondary" : "outline"}>
                      {question.source === "official" ? "官方" : "用户"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={review.tone} label={review.label} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {question.createdAt}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        题库增删改与导入将在管理接口（P2-10）接入后开放。
      </p>
    </>
  );
}
