import type { Metadata } from "next";

import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ADMIN_SCHOOLS } from "@/lib/mock/admin-data";

export const metadata: Metadata = { title: "院校数据" };

export default function SchoolsPage() {
  return (
    <>
      <PageHeader title="院校数据" description="招生院校与发布状态（只读观测）">
        <StatusBadge tone="warning" label="示例数据" />
      </PageHeader>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>院校</TableHead>
              <TableHead>省份</TableHead>
              <TableHead>地区</TableHead>
              <TableHead>标签</TableHead>
              <TableHead className="text-right">发布状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ADMIN_SCHOOLS.map((school) => (
              <TableRow key={school.id}>
                <TableCell className="font-medium">{school.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {school.province}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {school.region}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {school.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <StatusBadge
                    tone={school.isPublished ? "success" : "neutral"}
                    label={school.isPublished ? "已发布" : "未发布"}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        管理端定位为只读观察台：院校数据维护与批量导入由数据侧流程承担。
      </p>
    </>
  );
}
