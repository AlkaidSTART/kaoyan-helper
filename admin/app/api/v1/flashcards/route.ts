import { z } from "zod";

import { createPaginationMeta, parsePagination } from "@/lib/api/pagination";
import { handleApiRequest } from "@/lib/api/handler";
import { searchParamsToObject } from "@/lib/api/params";
import { createSuccessResponse } from "@/lib/api/response";
import { readAndValidateJson } from "@/lib/api/validation";
import { getActor, requirePermission } from "@/lib/auth/actor";
import {
  FlashcardService,
  toCardDto,
} from "@/lib/services/flashcards/flashcard-service";
import { PrismaFlashcardRepository } from "@/lib/services/flashcards/prisma-flashcard-repository";

const createCardSchema = z.strictObject({
  category: z.string().trim().min(1).max(50),
  front: z.string().trim().min(1).max(2_000),
  back: z.string().trim().min(1).max(4_000),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
});

export async function GET(request: Request): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "flashcard:read");

    const query = searchParamsToObject(request.url);
    const pagination = parsePagination(new URL(request.url));
    const service = new FlashcardService(new PrismaFlashcardRepository(), "Asia/Shanghai");
    const { rows, total } = await service.list(
      actor.user.id,
      {
        category: query.category?.trim() || null,
        source: query.source?.trim() === "system" || query.source?.trim() === "ugc" ? query.source.trim() : null,
        search: query.search?.trim() || null,
      },
      pagination.page,
      pagination.pageSize,
    );

    return createSuccessResponse(
      context.requestId,
      rows.map((row) => toCardDto(row, actor.user.id)),
      { pagination: createPaginationMeta(pagination.page, pagination.pageSize, total) },
    );
  });
}

export async function POST(request: Request): Promise<Response> {
  return handleApiRequest(request, async (context) => {
    const actor = await getActor(request);

    requirePermission(actor, "flashcard:write:own");

    const input = await readAndValidateJson(request, createCardSchema);
    const service = new FlashcardService(new PrismaFlashcardRepository(), "Asia/Shanghai");
    const card = await service.create(actor.user.id, {
      category: input.category,
      front: input.front,
      back: input.back,
      tags: input.tags ?? [],
    });

    return createSuccessResponse(context.requestId, card);
  });
}
