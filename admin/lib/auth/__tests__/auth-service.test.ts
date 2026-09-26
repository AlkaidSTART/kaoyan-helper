import { describe, expect, it, vi } from "vitest";

import { AppError } from "../../api/errors";
import { createErrorEnvelope } from "../../api/response";
import type {
  AdminCredentialRecord,
  AdminSessionRecord,
  AuthRepository,
  AuthUserRecord,
  CreateSessionInput,
  RotateSessionInput,
} from "../auth-repository";
import { ADMIN_CLIENT_TYPE, AuthService, type PasswordLoginInput } from "../auth-service";
import { hashSessionToken } from "../session-token";

const NOW = new Date("2026-09-26T10:00:00.000Z");
const OLD_TOKEN = "old_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const NEW_TOKEN = "new_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function createUser(overrides: Partial<AuthUserRecord> = {}): AuthUserRecord {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    email: "admin@example.com",
    nickname: "管理员",
    avatarUrl: null,
    examYear: null,
    role: "admin",
    isBanned: false,
    bannedUntil: null,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    updatedAt: new Date("2026-09-01T00:00:00.000Z"),
    ...overrides,
  };
}

function createSession(overrides: Partial<AdminSessionRecord> = {}): AdminSessionRecord {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    tokenHash: hashSessionToken(OLD_TOKEN),
    deviceName: "Chrome on macOS",
    expiresAt: new Date("2026-09-26T22:00:00.000Z"),
    revokedAt: null,
    lastSeenAt: new Date("2026-09-26T09:00:00.000Z"),
    user: createUser(),
    ...overrides,
  };
}

class FakeAuthRepository implements AuthRepository {
  credential: AdminCredentialRecord | null = null;

  session: AdminSessionRecord | null = null;

  rotated: AdminSessionRecord | null = null;

  readonly calls = {
    findCredentialByEmail: [] as string[],
    findSessionByTokenHash: [] as string[],
    createSession: [] as CreateSessionInput[],
    rotateSession: [] as RotateSessionInput[],
    revokeSessionByTokenHash: [] as { tokenHash: string; revokedAt: Date }[],
    touchSession: [] as { sessionId: string; lastSeenAt: Date }[],
  };

  async findCredentialByEmail(email: string): Promise<AdminCredentialRecord | null> {
    this.calls.findCredentialByEmail.push(email);

    return this.credential;
  }

  async findSessionByTokenHash(tokenHash: string): Promise<AdminSessionRecord | null> {
    this.calls.findSessionByTokenHash.push(tokenHash);

    return this.session;
  }

  async createSession(input: CreateSessionInput): Promise<AdminSessionRecord> {
    this.calls.createSession.push(input);

    return createSession({ tokenHash: input.tokenHash });
  }

  async rotateSession(input: RotateSessionInput): Promise<AdminSessionRecord | null> {
    this.calls.rotateSession.push(input);

    return this.rotated;
  }

  async revokeSessionByTokenHash(tokenHash: string, revokedAt: Date): Promise<boolean> {
    this.calls.revokeSessionByTokenHash.push({ tokenHash, revokedAt });

    return true;
  }

  async touchSession(sessionId: string, lastSeenAt: Date): Promise<void> {
    this.calls.touchSession.push({ sessionId, lastSeenAt });
  }
}

interface CreateServiceOptions {
  repository: FakeAuthRepository;
  passwordMatches?: boolean;
  token?: string;
}

function createService(options: CreateServiceOptions) {
  const verifyPassword = vi.fn(async () => options.passwordMatches ?? true);
  const performDummyPasswordCheck = vi.fn(async () => undefined);
  const generateToken = vi.fn(() => options.token ?? NEW_TOKEN);

  const service = new AuthService({
    repository: options.repository,
    now: () => NOW,
    generateToken,
    verifyPassword,
    performDummyPasswordCheck,
  });

  return { service, verifyPassword, performDummyPasswordCheck, generateToken };
}

function createLoginInput(overrides: Partial<PasswordLoginInput> = {}): PasswordLoginInput {
  return {
    email: "admin@example.com",
    password: "correct horse battery staple",
    clientType: ADMIN_CLIENT_TYPE,
    deviceName: "Chrome on macOS",
    ...overrides,
  };
}

async function expectAppError(promise: Promise<unknown>, code: string): Promise<AppError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);

    const appError = error as AppError;

    expect(appError.code).toBe(code);

    return appError;
  }

  throw new Error(`Expected AppError ${code}`);
}

describe("AuthService.loginWithPassword", () => {
  it("creates a session with the SHA-256 token digest and returns the raw token", async () => {
    const repository = new FakeAuthRepository();

    repository.credential = { passwordHash: "hash", user: createUser() };

    const { service, verifyPassword, performDummyPasswordCheck } = createService({ repository });
    const result = await service.loginWithPassword(createLoginInput());

    expect(result.token).toBe(NEW_TOKEN);
    expect(result.expiresAt).toEqual(new Date("2026-09-26T22:00:00.000Z"));
    expect(result.user).toMatchObject({ email: "admin@example.com", role: "admin" });
    expect(verifyPassword).toHaveBeenCalledWith("correct horse battery staple", "hash");
    expect(performDummyPasswordCheck).not.toHaveBeenCalled();

    const [created] = repository.calls.createSession;

    expect(created.tokenHash).toBe(hashSessionToken(NEW_TOKEN));
    expect(created.tokenHash).not.toBe(NEW_TOKEN);
    expect(created.deviceName).toBe("Chrome on macOS");
    expect(created.now).toEqual(NOW);
  });

  it("normalizes email casing and whitespace before querying", async () => {
    const repository = new FakeAuthRepository();

    repository.credential = { passwordHash: "hash", user: createUser() };

    const { service } = createService({ repository });

    await service.loginWithPassword(createLoginInput({ email: "  Admin@Example.COM " }));

    expect(repository.calls.findCredentialByEmail).toEqual(["admin@example.com"]);
  });

  it("runs a dummy compare and fails identically when the account is unknown", async () => {
    const repository = new FakeAuthRepository();
    const { service, verifyPassword, performDummyPasswordCheck } = createService({ repository });

    await expectAppError(service.loginWithPassword(createLoginInput()), "AUTH_INVALID_CREDENTIALS");

    expect(performDummyPasswordCheck).toHaveBeenCalledWith("correct horse battery staple");
    expect(verifyPassword).not.toHaveBeenCalled();
    expect(repository.calls.createSession).toHaveLength(0);
  });

  it("fails identically when the password is wrong", async () => {
    const repository = new FakeAuthRepository();

    repository.credential = { passwordHash: "hash", user: createUser() };

    const { service, performDummyPasswordCheck } = createService({
      repository,
      passwordMatches: false,
    });

    await expectAppError(service.loginWithPassword(createLoginInput()), "AUTH_INVALID_CREDENTIALS");

    expect(performDummyPasswordCheck).not.toHaveBeenCalled();
    expect(repository.calls.createSession).toHaveLength(0);
  });

  it("rejects non-admins with ADMIN_REQUIRED", async () => {
    const repository = new FakeAuthRepository();

    repository.credential = { passwordHash: "hash", user: createUser({ role: "user" }) };

    const { service } = createService({ repository });

    await expectAppError(service.loginWithPassword(createLoginInput()), "ADMIN_REQUIRED");
    expect(repository.calls.createSession).toHaveLength(0);
  });

  it("rejects an actively banned admin with USER_BANNED", async () => {
    const repository = new FakeAuthRepository();

    repository.credential = {
      passwordHash: "hash",
      user: createUser({ isBanned: true, bannedUntil: new Date("2026-09-27T00:00:00.000Z") }),
    };

    const { service } = createService({ repository });

    await expectAppError(service.loginWithPassword(createLoginInput()), "USER_BANNED");
    expect(repository.calls.createSession).toHaveLength(0);
  });

  it("allows an admin whose ban has already expired", async () => {
    const repository = new FakeAuthRepository();

    repository.credential = {
      passwordHash: "hash",
      user: createUser({ isBanned: true, bannedUntil: new Date("2026-09-25T00:00:00.000Z") }),
    };

    const { service } = createService({ repository });
    const result = await service.loginWithPassword(createLoginInput());

    expect(result.token).toBe(NEW_TOKEN);
    expect(repository.calls.createSession).toHaveLength(1);
  });

  it("rejects clients that are not the admin web app", async () => {
    const repository = new FakeAuthRepository();
    const { service } = createService({ repository });

    await expectAppError(
      service.loginWithPassword(createLoginInput({ clientType: "mobile" })),
      "PROVIDER_UNSUPPORTED",
    );
    expect(repository.calls.findCredentialByEmail).toHaveLength(0);
  });
});

describe("AuthService.refresh", () => {
  it("rotates the session to a new token digest", async () => {
    const repository = new FakeAuthRepository();

    repository.session = createSession();
    repository.rotated = createSession({ tokenHash: hashSessionToken(NEW_TOKEN) });

    const { service, generateToken } = createService({ repository });
    const result = await service.refresh(OLD_TOKEN);

    expect(generateToken).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      token: NEW_TOKEN,
      expiresAt: new Date("2026-09-26T22:00:00.000Z"),
      expiresIn: 43_200,
    });

    const [rotation] = repository.calls.rotateSession;

    expect(rotation.currentTokenHash).toBe(hashSessionToken(OLD_TOKEN));
    expect(rotation.nextTokenHash).toBe(hashSessionToken(NEW_TOKEN));
    expect(rotation.deviceName).toBe("Chrome on macOS");
  });

  it("rejects malformed or missing tokens without querying the repository", async () => {
    const repository = new FakeAuthRepository();
    const { service } = createService({ repository });

    await expectAppError(service.refresh(null), "REFRESH_INVALID");
    await expectAppError(service.refresh("short"), "REFRESH_INVALID");
    await expectAppError(service.refresh("a".repeat(44)), "REFRESH_INVALID");

    expect(repository.calls.findSessionByTokenHash).toHaveLength(0);
    expect(repository.calls.rotateSession).toHaveLength(0);
  });

  it("rejects unknown, revoked and expired sessions with REFRESH_INVALID", async () => {
    const repository = new FakeAuthRepository();
    const { service } = createService({ repository });

    repository.session = null;
    await expectAppError(service.refresh(OLD_TOKEN), "REFRESH_INVALID");

    repository.session = createSession({ revokedAt: NOW });
    await expectAppError(service.refresh(OLD_TOKEN), "REFRESH_INVALID");

    repository.session = createSession({ expiresAt: NOW });
    await expectAppError(service.refresh(OLD_TOKEN), "REFRESH_INVALID");

    expect(repository.calls.rotateSession).toHaveLength(0);
  });

  it("treats a competing rotation of the same token as a replay", async () => {
    const repository = new FakeAuthRepository();

    repository.session = createSession();
    repository.rotated = null;

    const { service } = createService({ repository });

    await expectAppError(service.refresh(OLD_TOKEN), "REFRESH_INVALID");
    expect(repository.calls.rotateSession).toHaveLength(1);
  });

  it("rejects banned admins", async () => {
    const repository = new FakeAuthRepository();

    repository.session = createSession({
      user: createUser({ isBanned: true, bannedUntil: null }),
    });

    const { service } = createService({ repository });

    await expectAppError(service.refresh(OLD_TOKEN), "USER_BANNED");
    expect(repository.calls.rotateSession).toHaveLength(0);
  });

  it("rejects sessions whose user is no longer an admin", async () => {
    const repository = new FakeAuthRepository();

    repository.session = createSession({ user: createUser({ role: "user" }) });

    const { service } = createService({ repository });

    await expectAppError(service.refresh(OLD_TOKEN), "ADMIN_REQUIRED");
    expect(repository.calls.rotateSession).toHaveLength(0);
  });
});

describe("AuthService.logout", () => {
  it("revokes the session matching the token digest", async () => {
    const repository = new FakeAuthRepository();
    const { service } = createService({ repository });

    await service.logout(OLD_TOKEN);

    expect(repository.calls.revokeSessionByTokenHash).toEqual([
      { tokenHash: hashSessionToken(OLD_TOKEN), revokedAt: NOW },
    ]);
  });

  it("stays idempotent and skips the repository for missing or malformed tokens", async () => {
    const repository = new FakeAuthRepository();
    const { service } = createService({ repository });

    await expect(service.logout(null)).resolves.toBeUndefined();
    await expect(service.logout("not-a-real-token")).resolves.toBeUndefined();

    expect(repository.calls.revokeSessionByTokenHash).toHaveLength(0);
  });
});

describe("AuthService.getSession", () => {
  it("returns the user, permissions and expiry and touches last seen", async () => {
    const repository = new FakeAuthRepository();

    repository.session = createSession();

    const { service } = createService({ repository });
    const result = await service.getSession(OLD_TOKEN);

    expect(result).toEqual({
      user: expect.objectContaining({ email: "admin@example.com", role: "admin" }),
      permissions: ["admin:dashboard:read"],
      expiresAt: "2026-09-26T22:00:00Z",
    });
    expect(repository.calls.touchSession).toEqual([{ sessionId: repository.session.id, lastSeenAt: NOW }]);
  });

  it("rejects a missing or malformed token as AUTH_REQUIRED without querying", async () => {
    const repository = new FakeAuthRepository();
    const { service } = createService({ repository });

    await expectAppError(service.getSession(null), "AUTH_REQUIRED");
    await expectAppError(service.getSession("bad token"), "AUTH_REQUIRED");
    await expectAppError(service.getSession("a".repeat(43) + "!"), "AUTH_REQUIRED");

    expect(repository.calls.findSessionByTokenHash).toHaveLength(0);
  });

  it("rejects an unknown session as AUTH_REQUIRED", async () => {
    const repository = new FakeAuthRepository();
    const { service } = createService({ repository });

    await expectAppError(service.getSession(OLD_TOKEN), "AUTH_REQUIRED");
  });

  it("distinguishes revoked (AUTH_REQUIRED) from expired (TOKEN_EXPIRED)", async () => {
    const repository = new FakeAuthRepository();
    const { service } = createService({ repository });

    repository.session = createSession({ revokedAt: NOW });
    await expectAppError(service.getSession(OLD_TOKEN), "AUTH_REQUIRED");

    repository.session = createSession({ expiresAt: NOW });
    await expectAppError(service.getSession(OLD_TOKEN), "TOKEN_EXPIRED");

    expect(repository.calls.touchSession).toHaveLength(0);
  });

  it("rejects non-admins and banned admins", async () => {
    const repository = new FakeAuthRepository();
    const { service } = createService({ repository });

    repository.session = createSession({ user: createUser({ role: "user" }) });
    await expectAppError(service.getSession(OLD_TOKEN), "ADMIN_REQUIRED");

    repository.session = createSession({ user: createUser({ isBanned: true }) });
    await expectAppError(service.getSession(OLD_TOKEN), "USER_BANNED");

    expect(repository.calls.touchSession).toHaveLength(0);
  });
});

describe("auth error serialization", () => {
  it("never carries password, token or cookie material in the response envelope", async () => {
    const repository = new FakeAuthRepository();

    repository.credential = { passwordHash: "hash", user: createUser() };

    const { service } = createService({ repository, passwordMatches: false });
    const password = "correct horse battery staple";
    const error = await expectAppError(
      service.loginWithPassword(createLoginInput({ password })),
      "AUTH_INVALID_CREDENTIALS",
    );
    const serialized = JSON.stringify(createErrorEnvelope("req_12345678", error));

    expect(serialized).not.toContain(password);
    expect(serialized).not.toContain("hash");
    expect(serialized).not.toContain("admin_session");
    expect(serialized).not.toContain("tokenHash");
  });

  it("keeps the dependency failure message generic", async () => {
    const repository = new FakeAuthRepository();
    const { service } = createService({ repository });

    const error = await expectAppError(service.getSession(OLD_TOKEN), "AUTH_REQUIRED");

    expect(error.message).toBe("请先登录");
    expect(error.status).toBe(401);
  });
});
