import type { Metadata } from "next";

import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { UsersTable } from "@/app/(admin)/users/users-table";

export const metadata: Metadata = { title: "用户管理" };

export default function UsersPage() {
  return (
    <>
      <PageHeader title="用户管理" description="考生账号、角色与封禁状态">
        <StatusBadge tone="warning" label="示例数据" />
      </PageHeader>
      <UsersTable />
    </>
  );
}
