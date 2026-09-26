import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/admin/app-sidebar";
import { SiteHeader } from "@/components/admin/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AuthService } from "@/lib/auth/auth-service";
import { PrismaAuthRepository } from "@/lib/auth/prisma-auth-repository";

/**
 * 管理布局第二层守卫：proxy.ts 只做 Cookie 存在性重定向，
 * 这里用 Prisma 会话做真实校验（过期/撤销/降权/封禁都会被拦截）。
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authService = new AuthService({ repository: new PrismaAuthRepository() });
  const session = await authService
    .getSession((await cookies()).get("admin_session")?.value ?? null)
    .catch(() => null);

  if (!session) {
    redirect("/login");
  }

  const user = { nickname: session.user.nickname, email: session.user.email };

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <SiteHeader user={user} />
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
