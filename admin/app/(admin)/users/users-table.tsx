"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ADMIN_USERS } from "@/lib/mock/admin-data";

export function UsersTable() {
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "banned">("all");

  const users = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();

    return ADMIN_USERS.filter((user) => {
      const matchesKeyword =
        normalized.length === 0 ||
        user.email.toLowerCase().includes(normalized) ||
        user.nickname.toLowerCase().includes(normalized);

      return matchesKeyword && (status === "all" || user.status === status);
    });
  }, [keyword, status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-64">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索邮箱或昵称"
            className="pl-8"
            aria-label="搜索用户"
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) =>
            setStatus(value as "all" | "active" | "banned")
          }
        >
          <SelectTrigger className="sm:w-32" aria-label="按状态筛选">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="active">正常</SelectItem>
            <SelectItem value="banned">已封禁</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground sm:ml-auto">
          共 {users.length} 位用户
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>昵称</TableHead>
              <TableHead>邮箱</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>考试年份</TableHead>
              <TableHead className="text-right">注册时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.nickname}</TableCell>
                <TableCell className="text-muted-foreground">
                  {user.email}
                </TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "default" : "outline"}>
                    {user.role === "admin" ? "管理员" : "用户"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <StatusBadge
                    tone={user.status === "active" ? "success" : "danger"}
                    label={user.status === "active" ? "正常" : "已封禁"}
                  />
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {user.examYear ?? "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {user.createdAt}
                </TableCell>
              </TableRow>
            ))}
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  没有匹配的用户
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        封禁 / 解封操作将在管理接口（P2-10）接入后开放。
      </p>
    </div>
  );
}
