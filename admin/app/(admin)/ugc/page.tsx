import type { Metadata } from "next";

import { PageHeader } from "@/components/admin/page-header";
import { ReviewActions } from "@/app/(admin)/ugc/review-actions";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UGC_QUEUE } from "@/lib/mock/admin-data";

export const metadata: Metadata = { title: "UGC 审核" };

export default function UgcPage() {
  return (
    <>
      <PageHeader
        title="UGC 审核"
        description="用户提交题目的审核队列"
      >
        <StatusBadge tone="warning" label="示例数据" />
      </PageHeader>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>题目</TableHead>
              <TableHead>学科</TableHead>
              <TableHead>提交人</TableHead>
              <TableHead>提交时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {UGC_QUEUE.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="max-w-72 truncate font-medium">
                  {item.stem}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.subject}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.creator}
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {item.submittedAt}
                </TableCell>
                <TableCell className="text-right">
                  <ReviewActions questionId={item.id} />
                </TableCell>
              </TableRow>
            ))}
            {UGC_QUEUE.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  队列已清空
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        审核动作要求服务端事务与审计日志，将在管理接口（P2-10）接入后生效。
      </p>
    </>
  );
}
