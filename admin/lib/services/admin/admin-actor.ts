import { AppError, ERROR_CODES } from "../../api/errors";

/** 管理端执行者（路由层 getActor 结果的领域侧视图）。 */
export interface AdminActorUser {
  id: string;
  email: string;
  nickname: string | null;
  role: string;
  isBanned: boolean;
}

export interface AdminActor {
  user: AdminActorUser;
}

/**
 * 服务层管理员复核（契约 §11.2）：路由层 `requirePermission` 之外的第二道检查。
 * 管理接口不允许仅依赖路由层判断；角色或封禁状态以数据库实时读取为准。
 */
export function assertAdminActor(actor: AdminActor): void {
  if (actor.user.role !== "admin" || actor.user.isBanned) {
    throw new AppError(ERROR_CODES.ADMIN_REQUIRED);
  }
}
