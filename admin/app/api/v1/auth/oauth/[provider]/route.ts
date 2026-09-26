import { z } from "zod";

import { AppError, ERROR_CODES } from "@/lib/api/errors";
import { handleApiRequest } from "@/lib/api/handler";
import { readAndValidateJson } from "@/lib/api/validation";

const oauthSchema = z.strictObject({
  redirectUri: z.string().url().max(2_048).optional(),
  clientType: z.enum(["flutter", "admin-web"]),
});

/**
 * AUTH-04 OAuth 扩展流程。MVP 阶段未启用任何第三方 Provider：
 * 契约标记为扩展项，统一返回 422 `PROVIDER_UNSUPPORTED`，不阻塞邮箱验证码登录。
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
): Promise<Response> {
  return handleApiRequest(request, async () => {
    const { provider } = await params;
    await readAndValidateJson(request, oauthSchema);

    if (!/^[a-z][a-z0-9_-]{0,31}$/.test(provider)) {
      throw new AppError(ERROR_CODES.PROVIDER_UNSUPPORTED);
    }

    throw new AppError(ERROR_CODES.PROVIDER_UNSUPPORTED);
  });
}
