"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ERROR_MESSAGES: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: "邮箱或密码错误",
  ADMIN_REQUIRED: "该账号不是管理员",
  USER_BANNED: "账号已被封禁，请联系其他管理员",
  VALIDATION_FAILED: "请输入合法的邮箱和密码",
  INVALID_ARGUMENT: "请求格式不正确",
  DEPENDENCY_UNAVAILABLE: "服务暂时不可用，请稍后重试",
  INTERNAL_ERROR: "服务器内部错误，请稍后重试",
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch("/api/v1/auth/login/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, clientType: "admin-web" }),
      });
      const payload = (await response.json()) as {
        success: boolean;
        error?: { code: string };
      };

      if (!response.ok || !payload.success) {
        const message =
          ERROR_MESSAGES[payload.error?.code ?? ""] ?? "登录失败，请稍后重试";

        toast.error(message);
        setSubmitting(false);

        return;
      }

      const target = searchParams.get("from");

      router.replace(target && target.startsWith("/") ? target : "/dashboard");
      router.refresh();
    } catch {
      toast.error("网络异常，请检查连接后重试");
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>管理员登录</CardTitle>
        <CardDescription>使用邮箱与密码验证身份</CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="mt-6">
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                正在登录
              </>
            ) : (
              "登录"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
