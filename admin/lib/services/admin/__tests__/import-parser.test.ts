import { describe, expect, it } from "vitest";

import { parseCsvTable, parseSchoolImport } from "../import-parser";

describe("parseCsvTable", () => {
  it("解析引号转义与 CRLF", () => {
    const table = parseCsvTable('name,province\r\n"清华,园","北京"\r\n"say ""hi""",上海\n');

    expect(table).toEqual([
      ["name", "province"],
      ["清华,园", "北京"],
      ['say "hi"', "上海"],
    ]);
  });
});

describe("parseSchoolImport csv", () => {
  const header = "name,province,region,is985,is211,isDoubleFirstClass,isSelfMarking,isPublished";

  it("解析合法行并默认布尔值", () => {
    const result = parseSchoolImport(`${header}\n清华大学,北京,华北,true,true,true,false,true\n`, "csv");

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        name: "清华大学",
        province: "北京",
        is985: true,
        isPublished: true,
        programs: [],
      });
    }
  });

  it("缺少必需列报 header 错误", () => {
    const result = parseSchoolImport("name,province\n清华大学,北京\n", "csv");

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({ line: 1, field: "header" });
    }
  });

  it("校名重复报行级错误", () => {
    const result = parseSchoolImport(
      `${header}\nA大学,北京,华北,0,0,0,0,1\nA大学,上海,华东,0,0,0,0,1\n`,
      "csv",
    );

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({ line: 3, field: "name" });
    }
  });

  it("非法布尔值逐行报错", () => {
    const result = parseSchoolImport(`${header}\nA大学,北京,华北,perhaps,0,0,0,1\n`, "csv");

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({ line: 2, field: "is985" });
    }
  });
});

describe("parseSchoolImport json", () => {
  it("解析嵌套 programs", () => {
    const raw = JSON.stringify({
      schools: [
        {
          name: "清华大学",
          province: "北京",
          is985: true,
          isPublished: true,
          programs: [
            {
              majorCode: "085400",
              majorName: "电子信息",
              year: 2025,
              planEnrollment: 120,
              minScore: 355,
            },
          ],
        },
      ],
    });
    const result = parseSchoolImport(raw, "json");

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.rows[0]?.programs[0]).toMatchObject({
        majorCode: "085400",
        year: 2025,
        planEnrollment: 120,
        minScore: 355,
        isPublished: true,
      });
    }
  });

  it("非数组结构报错", () => {
    const result = parseSchoolImport('{"name":"x"}', "json");

    expect(result.ok).toBe(false);
  });

  it("非法 JSON 报 file 错误", () => {
    const result = parseSchoolImport("{broken", "json");

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.errors[0]).toMatchObject({ field: "file" });
    }
  });
});
