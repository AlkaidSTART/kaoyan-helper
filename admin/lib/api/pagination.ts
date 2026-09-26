import { AppError, ERROR_CODES } from "./errors";

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginationMeta extends PaginationParams {
  total: number;
  totalPages: number;
}

export interface ParsePaginationOptions {
  defaultPage?: number;
  defaultPageSize?: number;
  maxPageSize?: number;
}

type SearchParamsSource = URL | URLSearchParams;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_MAX_PAGE_SIZE = 100;

export function parsePagination(
  source: SearchParamsSource,
  options: ParsePaginationOptions = {},
): PaginationParams {
  const defaultPage = options.defaultPage ?? DEFAULT_PAGE;
  const defaultPageSize = options.defaultPageSize ?? DEFAULT_PAGE_SIZE;
  const maxPageSize = options.maxPageSize ?? DEFAULT_MAX_PAGE_SIZE;

  assertPositiveInteger(defaultPage, "defaultPage");
  assertPositiveInteger(defaultPageSize, "defaultPageSize");
  assertPositiveInteger(maxPageSize, "maxPageSize");

  if (defaultPageSize > maxPageSize) {
    throw new RangeError("defaultPageSize cannot exceed maxPageSize");
  }

  const searchParams = source instanceof URL ? source.searchParams : source;
  const page = readPositiveInteger(searchParams, "page") ?? defaultPage;
  const pageSize = readPositiveInteger(searchParams, "pageSize") ?? defaultPageSize;

  if (pageSize > maxPageSize) {
    throwPaginationError("pageSize");
  }

  return { page, pageSize };
}

export function createPaginationMeta(
  page: number,
  pageSize: number,
  total: number,
): PaginationMeta {
  assertPositiveInteger(page, "page");
  assertPositiveInteger(pageSize, "pageSize");

  if (!Number.isSafeInteger(total) || total < 0) {
    throw new RangeError("total must be a non-negative safe integer");
  }

  return {
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}

function readPositiveInteger(searchParams: URLSearchParams, key: string): number | null {
  const values = searchParams.getAll(key);

  if (values.length === 0) {
    return null;
  }

  if (values.length !== 1 || !/^[1-9]\d*$/.test(values[0])) {
    throwPaginationError(key);
  }

  const value = Number(values[0]);

  if (!Number.isSafeInteger(value) || value <= 0) {
    throwPaginationError(key);
  }

  return value;
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
}

function throwPaginationError(field: "page" | "pageSize"): never {
  throw new AppError(ERROR_CODES.PAGINATION_INVALID, {
    details: { field },
  });
}
