export const ADMIN_PERMISSIONS = ["admin:dashboard:read"] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export function getPermissionsForRole(role: string): AdminPermission[] {
  return role === "admin" ? [...ADMIN_PERMISSIONS] : [];
}
