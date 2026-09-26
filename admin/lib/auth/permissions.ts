export const USER_PERMISSIONS = [
  "user:self:read",
  "user:self:update",
  "user:target:read",
  "user:target:write",
  "dashboard:self:read",
  "quiz:read",
  "quiz:submit",
  "quiz:create",
  "quiz:update:own",
  "quiz:delete:own",
  "mistake:read:own",
  "mistake:write:own",
  "flashcard:read",
  "flashcard:write:own",
  "flashcard:review:own",
  "school:read",
  "ai:chat",
] as const;

export const ADMIN_PERMISSIONS = [
  "admin:dashboard:read",
  "admin:users:read",
  "admin:users:ban",
  "admin:questions:read",
  "admin:questions:write",
  "admin:ugc:read",
  "admin:ugc:review",
  "admin:schools:read",
  "admin:schools:write",
  "admin:audit:read",
] as const;

export type UserPermission = (typeof USER_PERMISSIONS)[number];

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export type Permission = UserPermission | AdminPermission;

/**
 * 角色到权限集合的映射。`admin` 继承全部普通用户能力并附加管理权限。
 * 返回值仅用于客户端 UI 展示；每次受保护请求仍由服务端重新判定。
 */
export function getPermissionsForRole(role: string): string[] {
  if (role === "admin") {
    return [...USER_PERMISSIONS, ...ADMIN_PERMISSIONS];
  }

  if (role === "user") {
    return [...USER_PERMISSIONS];
  }

  return [];
}

export function hasPermission(permissions: readonly string[], required: Permission): boolean {
  return permissions.includes(required);
}
