import { describe, expect, it } from "vitest";

import { AppError, ERROR_CODES } from "../errors";
import { createPaginationMeta, parsePagination } from "../pagination";

describe("pagination", () => {
  it("uses the documented defaults", () => {
    expect(parsePagination(new URL("https://example.com/items"))).toEqual({
      page: 1,
      pageSize: 20,
    });
  });

  it("parses positive integers and accepts pageSize=100", () => {
    expect(parsePagination(new URL("https://example.com/items?page=3&pageSize=100"))).toEqual({
      page: 3,
      pageSize: 100,
    });
  });

  it.each(["0", "-1", "1.5", "", "abc"])(
    "rejects invalid page value %j",
    (value) => {
      const params = new URLSearchParams({ page: value });

      expect(() => parsePagination(params)).toThrow(AppError);

      try {
        parsePagination(params);
      } catch (error) {
        expect(error).toMatchObject({
          code: ERROR_CODES.PAGINATION_INVALID,
          details: { field: "page" },
        });
      }
    },
  );

  it("rejects duplicate pagination parameters", () => {
    const params = new URLSearchParams("page=1&page=2");

    expect(() => parsePagination(params)).toThrow(AppError);
  });

  it("rejects pageSize above the maximum", () => {
    const params = new URLSearchParams({ pageSize: "101" });

    expect(() => parsePagination(params)).toThrow(AppError);
  });

  it("calculates total pages and keeps empty results at zero", () => {
    expect(createPaginationMeta(1, 20, 137)).toEqual({
      page: 1,
      pageSize: 20,
      total: 137,
      totalPages: 7,
    });
    expect(createPaginationMeta(1, 20, 0)).toMatchObject({ totalPages: 0 });
  });
});
