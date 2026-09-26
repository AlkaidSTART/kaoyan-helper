import { Prisma } from "@/generated/prisma/client";

import { AppError, ERROR_CODES } from "../../api/errors";
import { PrismaClientConfigurationError } from "../../db/prisma";

/**
 * Prisma 错误统一映射：唯一约束 P2002 → 409 `CONFLICT`；
 * 其余 Prisma 错误 → 503 `DEPENDENCY_UNAVAILABLE`；未知错误 → 500 `INTERNAL_ERROR`。
 * 不把 Prisma 原始错误信息透出到响应。
 */
export function mapAdminPrismaError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return new AppError(ERROR_CODES.CONFLICT, { cause: error });
    }

    if (error.code === "P2025") {
      return new AppError(ERROR_CODES.NOT_FOUND, { cause: error });
    }

    return new AppError(ERROR_CODES.DEPENDENCY_UNAVAILABLE, { cause: error });
  }

  if (
    error instanceof PrismaClientConfigurationError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    return new AppError(ERROR_CODES.DEPENDENCY_UNAVAILABLE, { cause: error });
  }

  return new AppError(ERROR_CODES.INTERNAL_ERROR, { cause: error });
}
