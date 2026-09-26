import { handleApiRequest } from "@/lib/api/handler";
import { AppError, ERROR_CODES } from "@/lib/api/errors";
import { consumeRateLimit, MemoryRateLimiter } from "@/lib/api/rate-limit";
import { createSuccessResponse } from "@/lib/api/response";
import { getActor, requirePermission } from "@/lib/auth/actor";
import { AdminSchoolService } from "@/lib/services/admin/admin-school-service";
import { MAX_IMPORT_BYTES } from "@/lib/services/admin/import-parser";
import { PrismaAdminSchoolRepository } from "@/lib/services/admin/prisma-admin-school-repository";

const importRateLimiter = new MemoryRateLimiter();
const MAX_IMPORT_LINE_BYTES = MAX_IMPORT_BYTES;

function readImportFormat(value: FormDataEntryValue | null): "csv" | "json" {
  if (value === "csv" || value === "json") {
    return value;
  }

  throw new AppError(ERROR_CODES.VALIDATION_FAILED, { details: { field: "format" } });
}

function readImportMode(value: FormDataEntryValue | null): "validate" | "commit" {
  if (value === "commit") {
    return "commit";
  }

  return "validate";
}

/** 院校导入（契约 ADMIN-SCH-06）：multipart；validate/commit 两模式；10 次/分钟。 */
export async function POST(request: Request): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "admin:schools:write");

    let form: FormData;

    try {
      form = await request.formData();
    } catch {
      throw new AppError(ERROR_CODES.INVALID_ARGUMENT);
    }

    const format = readImportFormat(form.get("format"));
    const mode = readImportMode(form.get("mode"));
    const file = form.get("file");

    if (!(file instanceof File)) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, { details: { field: "file" } });
    }

    if (file.size === 0 || file.size > MAX_IMPORT_LINE_BYTES) {
      throw new AppError(ERROR_CODES.IMPORT_VALIDATION_FAILED, {
        details: { field: "file", message: "文件须为 1 字节至 2MB 之间" },
      });
    }

    await consumeRateLimit(importRateLimiter, `admin-import:${actor.user.id}`, {
      limit: 10,
      windowMs: 60_000,
    });

    const content = await file.text();
    const service = new AdminSchoolService(new PrismaAdminSchoolRepository());
    const result = await service.import(actor, {
      raw: content,
      format,
      mode,
      requestId: context.requestId,
    });

    return createSuccessResponse(context.requestId, result);
  });
}
