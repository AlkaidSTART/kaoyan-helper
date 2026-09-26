/**
 * 院校导入解析器（契约 ADMIN-SCH-06）：纯函数、无 IO。
 * CSV 按 RFC4180 解析（双引号转义、CRLF）；JSON 支持对象数组或 `{ schools: [...] }` 包装。
 * 校验错误逐行定位，供路由层以 422 `IMPORT_VALIDATION_FAILED` 返回 details。
 */

export interface ParsedProgramRow {
  majorCode: string;
  majorName: string;
  year: number;
  studyMode: string | null;
  planEnrollment: number | null;
  minScore: number | null;
  avgScore: number | null;
  isPublished: boolean;
}

export interface ParsedSchoolRow {
  name: string;
  province: string | null;
  region: string | null;
  is985: boolean;
  is211: boolean;
  isDoubleFirstClass: boolean;
  isSelfMarking: boolean;
  isPublished: boolean;
  programs: ParsedProgramRow[];
}

/** 行级校验错误（type 别名以满足 JsonValue 索引签名，供 422 details 直接返回）。 */
export type ImportRowError = {
  line: number;
  field: string | null;
  message: string;
};

export type ParseSchoolImportResult =
  | { ok: true; rows: ParsedSchoolRow[] }
  | { ok: false; errors: ImportRowError[] };

export const MAX_IMPORT_ROWS = 2_000;
export const MAX_IMPORT_BYTES = 2 * 1_024 * 1_024;

const PROGRAM_COLUMNS = [
  "majorCode",
  "majorName",
  "year",
  "studyMode",
  "planEnrollment",
  "minScore",
  "avgScore",
  "isPublished",
] as const;

export function parseSchoolImport(raw: string, format: "csv" | "json"): ParseSchoolImportResult {
  const table = format === "csv" ? parseCsvTable(raw) : null;

  if (table !== null) {
    return parseCsvRows(table);
  }

  return parseJsonRows(raw);
}

/** RFC4180：双引号包裹、`""` 转义引号、CRLF/LF 换行；空行跳过。 */
export function parseCsvTable(raw: string): string[][] {
  const table: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  const endCell = (): void => {
    row.push(cell);
    cell = "";
  };

  const endRow = (): void => {
    endCell();
    table.push(row);
    row = [];
  };

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];

    if (inQuotes) {
      if (char === '"') {
        if (raw[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }

      continue;
    }

    if (char === '"' && cell.length === 0) {
      inQuotes = true;
    } else if (char === ",") {
      endCell();
    } else if (char === "\n") {
      endRow();
    } else if (char === "\r") {
      if (raw[index + 1] === "\n") {
        index += 1;
      }

      endRow();
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    endRow();
  }

  return table.filter((tableRow) => tableRow.some((cellValue) => cellValue.length > 0));
}

function parseCsvRows(table: string[][]): ParseSchoolImportResult {
  if (table.length === 0) {
    return { ok: false, errors: [{ line: 1, field: "file", message: "文件为空" }] };
  }

  if (table.length - 1 > MAX_IMPORT_ROWS) {
    return {
      ok: false,
      errors: [{ line: 0, field: "file", message: `数据行数超过 ${MAX_IMPORT_ROWS} 行限制` }],
    };
  }

  const header = table[0].map((cell) => cell.trim());
  const missing = ["name", "province", "region"].filter((column) => !header.includes(column));

  if (missing.length > 0) {
    return {
      ok: false,
      errors: [{ line: 1, field: "header", message: `缺少必需列：${missing.join(", ")}` }],
    };
  }

  const errors: ImportRowError[] = [];
  const rows: ParsedSchoolRow[] = [];
  const seenNames = new Map<string, number>();

  for (let index = 1; index < table.length; index += 1) {
    const line = index + 1;
    const record: Record<string, string> = {};

    header.forEach((column, columnIndex) => {
      record[column] = (table[index][columnIndex] ?? "").trim();
    });

    const school = toSchoolRow(record, line, errors);

    if (school === null) {
      continue;
    }

    const previousLine = seenNames.get(school.name);

    if (previousLine !== undefined) {
      errors.push({
        line,
        field: "name",
        message: `校名与第 ${previousLine} 行重复`,
      });

      continue;
    }

    seenNames.set(school.name, line);
    rows.push(school);
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, rows };
}

function parseJsonRows(raw: string): ParseSchoolImportResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, errors: [{ line: 0, field: "file", message: "JSON 解析失败" }] };
  }

  const items = readJsonItems(parsed);

  if (items === null) {
    return {
      ok: false,
      errors: [{ line: 0, field: "file", message: "JSON 须为数组或 { schools: [...] } 结构" }],
    };
  }

  if (items.length > MAX_IMPORT_ROWS) {
    return {
      ok: false,
      errors: [{ line: 0, field: "file", message: `数据行数超过 ${MAX_IMPORT_ROWS} 行限制` }],
    };
  }

  const errors: ImportRowError[] = [];
  const rows: ParsedSchoolRow[] = [];
  const seenNames = new Map<string, number>();

  items.forEach((item, index) => {
    const line = index + 1;

    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      errors.push({ line, field: null, message: "院校记录必须是对象" });

      return;
    }

    const record = item as Record<string, unknown>;
    const school = toSchoolRow(
      {
        name: readString(record.name),
        province: readString(record.province),
        region: readString(record.region),
        is985: readBooleanInput(record.is985),
        is211: readBooleanInput(record.is211),
        isDoubleFirstClass: readBooleanInput(record.isDoubleFirstClass),
        isSelfMarking: readBooleanInput(record.isSelfMarking),
        isPublished: readBooleanInput(record.isPublished),
      },
      line,
      errors,
    );

    if (school === null) {
      return;
    }

    const previousLine = seenNames.get(school.name);

    if (previousLine !== undefined) {
      errors.push({ line, field: "name", message: `校名与第 ${previousLine} 行重复` });

      return;
    }

    const programs = parseJsonPrograms(record.programs, line, errors);

    if (programs === null) {
      return;
    }

    school.programs = programs;
    seenNames.set(school.name, line);
    rows.push(school);
  });

  return errors.length > 0 ? { ok: false, errors } : { ok: true, rows };
}

function readJsonItems(parsed: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(parsed)) {
    return parsed as Record<string, unknown>[];
  }

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    Array.isArray((parsed as { schools?: unknown }).schools)
  ) {
    return (parsed as { schools: Record<string, unknown>[] }).schools;
  }

  return null;
}

function parseJsonPrograms(
  value: unknown,
  line: number,
  errors: ImportRowError[],
): ParsedProgramRow[] | null {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    errors.push({ line, field: "programs", message: "programs 必须是数组" });

    return null;
  }

  const programs: ParsedProgramRow[] = [];

  for (const [index, item] of value.entries()) {
    const field = `programs[${index}]`;

    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      errors.push({ line, field, message: "专业记录必须是对象" });

      return null;
    }

    const record = item as Record<string, unknown>;
    const majorCode = readString(record.majorCode);
    const majorName = readString(record.majorName);

    if (majorCode.length === 0 || majorName.length === 0) {
      errors.push({ line, field, message: "majorCode 与 majorName 必填" });

      return null;
    }

    const year = readNumber(record.year);

    if (year === null || year < 1990 || year > 2100) {
      errors.push({ line, field: `${field}.year`, message: "year 须为 1990-2100 整数" });

      return null;
    }

    const planEnrollment = readNumber(record.planEnrollment);
    const minScore = readScore(record.minScore);
    const avgScore = readScore(record.avgScore);

    if (minScore === "invalid" || avgScore === "invalid") {
      errors.push({ line, field: `${field}.minScore/avgScore`, message: "分数须为 0-1000 数值" });

      return null;
    }

    const isPublished = readOptionalBoolean(record.isPublished);

    if (isPublished === "invalid") {
      errors.push({ line, field: `${field}.isPublished`, message: "isPublished 须为布尔值" });

      return null;
    }

    programs.push({
      majorCode,
      majorName,
      year,
      studyMode: readString(record.studyMode) || null,
      planEnrollment,
      minScore: minScore === null ? null : (minScore as number),
      avgScore: avgScore === null ? null : (avgScore as number),
      isPublished: isPublished === null ? true : isPublished,
    });
  }

  return programs;
}

function toSchoolRow(
  record: Record<string, string>,
  line: number,
  errors: ImportRowError[],
): ParsedSchoolRow | null {
  const name = record.name ?? "";

  if (name.length === 0) {
    errors.push({ line, field: "name", message: "校名必填" });

    return null;
  }

  if (name.length > 100) {
    errors.push({ line, field: "name", message: "校名长度不能超过 100" });

    return null;
  }

  const flags: [string, string][] = [
    ["is985", record.is985 ?? ""],
    ["is211", record.is211 ?? ""],
    ["isDoubleFirstClass", record.isDoubleFirstClass ?? ""],
    ["isSelfMarking", record.isSelfMarking ?? ""],
    ["isPublished", record.isPublished ?? ""],
  ];

  const parsedFlags: Record<string, boolean> = {
    is985: false,
    is211: false,
    isDoubleFirstClass: false,
    isSelfMarking: false,
    isPublished: false,
  };

  for (const [field, raw] of flags) {
    // 未提供的布尔字段默认 false（契约 ADMIN-SCH-06）。
    const parsed = raw === "" ? false : parseBooleanInput(raw);

    if (parsed === null) {
      errors.push({ line, field, message: `${field} 须为 true/false/1/0` });

      return null;
    }

    parsedFlags[field] = parsed;
  }

  return {
    name,
    province: record.province || null,
    region: record.region || null,
    is985: parsedFlags.is985,
    is211: parsedFlags.is211,
    isDoubleFirstClass: parsedFlags.isDoubleFirstClass,
    isSelfMarking: parsedFlags.isSelfMarking,
    isPublished: parsedFlags.isPublished,
    programs: [],
  };
}

function readBooleanInput(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  return "unknown";
}

/** `true/false/1/0`（不区分大小写）→ 布尔；其余 null。 */
function parseBooleanInput(value: string): boolean | null {
  const normalized = value.trim().toLowerCase();

  if (normalized === "true" || normalized === "1") {
    return true;
  }

  if (normalized === "false" || normalized === "0") {
    return false;
  }

  return null;
}

function readOptionalBoolean(value: unknown): boolean | "invalid" | null {
  const normalized = readBooleanInput(value);

  if (normalized === "") {
    return null;
  }

  const parsed = parseBooleanInput(normalized);

  return parsed === null ? "invalid" : parsed;
}

function readString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number(value.trim());
  }

  return null;
}

function readScore(value: unknown): number | "invalid" | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const score = typeof value === "number" ? value : Number(readString(value));

  if (!Number.isFinite(score) || score < 0 || score > 1_000) {
    return "invalid";
  }

  return score;
}

/** 供测试与调试使用的列名清单（JSON 模式专业字段）。 */
export const PROGRAM_COLUMN_NAMES = PROGRAM_COLUMNS;
