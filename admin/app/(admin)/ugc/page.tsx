import type { Metadata } from "next";

import { PageHeader } from "@/components/admin/page-header";
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

export const metadata: Metadata = { title: "UGC 内容" };

export default function UgcPage() {
  return (
    <>
      <PageHeader
        title="UGC 内容"
        description="用户提交题目队列（只读观测，不在管理端执行审核）"
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
              <TableHead className="text-right">提交时间</TableHead>
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
                <TableCell className="tabular-nums text-right text-muted-foreground">
                  {item.submittedAt}
                </TableCell>
              </TableRow>
            ))}
            {UGC_QUEUE.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  暂无提交
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        管理端定位为只读观察台：不提供通过 / 驳回等审核操作，UGC 治理由产品侧流程承担。
      </p>
    </>
  );
}
