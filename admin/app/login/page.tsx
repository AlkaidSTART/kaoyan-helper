import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Suspense } from "react";
import { GraduationCap } from "lucide-react";

import { AuthService } from "@/lib/auth/auth-service";
import { readSessionCookie } from "@/lib/auth/cookie";
import { PrismaAuthRepository } from "@/lib/auth/prisma-auth-repository";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "登录" };

export default async function LoginPage() {
  const authService = new AuthService({ repository: new PrismaAuthRepository() });

  try {
    await authService.getSession(readSessionCookie(await cookies()));

    redirect("/dashboard");
  } catch {
    // 未登录是登录页的正常状态，继续渲染表单。
  }

  return (
    <main className="flex min-h-svh flex-1 flex-col items-center justify-center bg-muted/40 px-4">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="size-6" aria-hidden />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">登科管理后台</h1>
            <p className="text-sm text-muted-foreground">请使用管理员账号登录</p>
          </div>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="text-center text-xs text-muted-foreground">
          仅限授权管理员访问，操作将被记录审计日志
        </p>
      </div>
    </main>
  );
}
