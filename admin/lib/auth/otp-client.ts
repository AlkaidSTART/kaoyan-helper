import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { AppError, ERROR_CODES } from "../api/errors";

/**
 * 邮箱验证码（OTP）客户端契约。Supabase Auth 是身份提供方：
 * 发送走 `signInWithOtp`，校验走 `verifyOtp`；本层不自行存储验证码。
 */
export interface VerifiedEmailIdentity {
  id: string | null;
  email: string;
}

export interface EmailOtpClient {
  sendCode(email: string): Promise<void>;

  verifyCode(email: string, code: string): Promise<VerifiedEmailIdentity>;
}

let cachedClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new AppError(ERROR_CODES.DEPENDENCY_UNAVAILABLE);
  }

  if (!cachedClient) {
    cachedClient = createClient(url, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return cachedClient;
}

export class SupabaseEmailOtpClient implements EmailOtpClient {
  async sendCode(email: string): Promise<void> {
    const client = getSupabaseClient();
    // 上游错误一律收敛为依赖不可用，不向客户端泄漏 Supabase 细节或账号存在性。
    const result = await client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });

    if (result.error) {
      throw new AppError(ERROR_CODES.DEPENDENCY_UNAVAILABLE, { cause: result.error });
    }
  }

  async verifyCode(email: string, code: string): Promise<VerifiedEmailIdentity> {
    const client = getSupabaseClient();
    const result = await client.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });

    if (result.error || !result.data.user) {
      // 不区分“不存在 / 已使用 / 过期”，统一映射，避免账号枚举。
      throw new AppError(ERROR_CODES.EMAIL_CODE_INVALID, { cause: result.error ?? undefined });
    }

    return {
      id: result.data.user.id,
      email: result.data.user.email ?? email,
    };
  }
}
