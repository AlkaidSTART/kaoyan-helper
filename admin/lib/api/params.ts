import { AppError, ERROR_CODES } from "./errors";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 读取路径参数中的 UUID：格式非法视为资源不存在（404 防枚举），
 * 不返回 422 以避免暴露参数语义。
 */
export function readUuidParam(value: string): string {
  if (!UUID_PATTERN.test(value)) {
    throw new AppError(ERROR_CODES.NOT_FOUND);
  }

  return value;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 读取 `YYYY-MM-DD` 查询参数；非法返回 422。 */
export function readDateParam(value: string | null, field: string): string | null {
  if (value === null || value.length === 0) {
    return null;
  }

  if (!DATE_PATTERN.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, { details: { field } });
  }

  return value;
}

/** 把查询参数转为普通对象（同名参数取最后一个）。 */
export function searchParamsToObject(url: string): Record<string, string> {
  return Object.fromEntries(new URL(url).searchParams.entries());
}
