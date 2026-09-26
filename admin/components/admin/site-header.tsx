"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { StatusBadge } from "@/components/admin/status-badge";
import { UserNav } from "@/components/admin/user-nav";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const TITLES: Record<string, string> = {
  dashboard: "概览",
  users: "用户管理",
  questions: "题库管理",
  ugc: "UGC 审核",
  schools: "院校数据",
};

interface SiteHeaderProps {
  user: { nickname: string | null; email: string };
}

export function SiteHeader({ user }: SiteHeaderProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" aria-label="切换侧边栏" />
      <Separator orientation="vertical" className="mr-1 !h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            {segments.length > 1 ? (
              <BreadcrumbLink asChild>
                <Link href="/dashboard">管理后台</Link>
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage>管理后台</BreadcrumbPage>
            )}
          </BreadcrumbItem>
          {segments.length > 1 ? (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{TITLES[segments[0]] ?? segments[0]}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : null}
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        <StatusBadge tone="warning" label="示例数据" />
        <UserNav user={user} />
      </div>
    </header>
  );
}
