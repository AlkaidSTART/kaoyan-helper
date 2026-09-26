import { AppError, ERROR_CODES } from "../api/errors";
import { toUserDto, type AuthUserDto } from "./auth-service";
import type { AuthRepository } from "./auth-repository";
import type { AdminPermission } from "./permissions";
import { getPermissionsForRole } from "./permissions";
import type { EmailOtpClient } from "./otp-client";
import { isActivelyBanned } from "./user-session-service";
import type { UserSessionRepository } from "./user-session-repository";
import {
  REFRESH_TOKEN_TTL_SECONDS,
  UserSessionService,
  type UserTokenPair,
} from "./user-session-service";
import { SESSION_TTL_SECONDS, generateSessionToken, hashSessionToken } from "./session-token";

export const FLUTTER_CLIENT_TYPE = "flutter";

export const SEND_CODE_EXPIRES_IN_SECONDS = 600;

export const SEND_CODE_RETRY_AFTER_SECONDS = 60;

export interface SendCodeResult {
  expiresInSeconds: number;
  retryAfterSeconds: number;
}

export interface EmailCodeLoginInput {
  email: string;
  code: string;
  clientType: string;
  deviceName: string | null;
}

export interface FlutterLoginResult {
  mode: "flutter";
  tokens: UserTokenPair;
  user: AuthUserDto;
  permissions: string[];
}

export interface AdminCodeLoginResult {
  mode: "admin";
  token: string;
  expiresAt: Date;
  user: AuthUserDto;
  permissions: AdminPermission[];
}

export type EmailCodeLoginResult = FlutterLoginResult | AdminCodeLoginResult;

export interface EmailCodeAuthServiceDependencies {
  otpClient: EmailOtpClient;
  userRepository: UserSessionRepository;
  adminSessionRepository: AuthRepository;
  now?: () => Date;
  generateSessionTokenFn?: () => string;
  sessionTtlSeconds?: number;
}

/**
 * 邮箱验证码登录状态机：Supabase Auth 负责验证码，`public.users` 负责角色与封禁事实。
 * 身份事实（user id）只来自 OTP 校验结果，不信任客户端上传的任何身份字段。
 */
export class EmailCodeAuthService {
  private readonly otpClient: EmailOtpClient;

  private readonly userRepository: UserSessionRepository;

  private readonly adminSessionRepository: AuthRepository;

  private readonly now: () => Date;

  private readonly generateSessionTokenFn: () => string;

  private readonly sessionTtlSeconds: number;

  constructor(dependencies: EmailCodeAuthServiceDependencies) {
    this.otpClient = dependencies.otpClient;
    this.userRepository = dependencies.userRepository;
    this.adminSessionRepository = dependencies.adminSessionRepository;
    this.now = dependencies.now ?? (() => new Date());
    this.generateSessionTokenFn = dependencies.generateSessionTokenFn ?? generateSessionToken;
    this.sessionTtlSeconds = dependencies.sessionTtlSeconds ?? SESSION_TTL_SECONDS;
  }

  async sendCode(email: string): Promise<SendCodeResult> {
    await this.otpClient.sendCode(email.trim().toLowerCase());

    return {
      expiresInSeconds: SEND_CODE_EXPIRES_IN_SECONDS,
      retryAfterSeconds: SEND_CODE_RETRY_AFTER_SECONDS,
    };
  }

  async loginWithCode(input: EmailCodeLoginInput): Promise<EmailCodeLoginResult> {
    const now = this.now();
    const identity = await this.otpClient.verifyCode(
      input.email.trim().toLowerCase(),
      input.code.trim(),
    );

    const user = await this.userRepository.upsertUserByEmail({
      id: identity.id,
      email: identity.email,
      nickname: null,
      now,
    });

    if (isActivelyBanned(user, now)) {
      throw new AppError(ERROR_CODES.USER_BANNED);
    }

    if (input.clientType === FLUTTER_CLIENT_TYPE) {
      const sessionService = new UserSessionService({
        repository: this.userRepository,
        now: this.now,
      });
      const tokens = await sessionService.createSessionPair(user, {
        clientType: input.clientType,
        deviceName: input.deviceName,
      });

      return {
        mode: "flutter",
        tokens,
        user: toUserDto(user),
        permissions: getPermissionsForRole(user.role),
      };
    }

    if (user.role !== "admin") {
      throw new AppError(ERROR_CODES.ADMIN_REQUIRED);
    }

    const token = this.generateSessionTokenFn();
    const expiresAt = new Date(now.getTime() + this.sessionTtlSeconds * 1_000);

    await this.adminSessionRepository.createSession({
      userId: user.id,
      tokenHash: hashSessionToken(token),
      deviceName: input.deviceName,
      expiresAt,
      now,
    });

    return {
      mode: "admin",
      token,
      expiresAt,
      user: toUserDto(user),
      permissions: [],
    };
  }
}
