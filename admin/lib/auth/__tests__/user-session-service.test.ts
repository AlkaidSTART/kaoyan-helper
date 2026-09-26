import { describe, expect, it, vi } from "vitest";

import { ERROR_CODES } from "../../api/errors";
import type { AuthUserRecord } from "../auth-repository";
import type {
  UserSessionRecord,
  UserSessionRepository,
} from "../user-session-repository";
import {
  ACCESS_TOKEN_PREFIX,
  REFRESH_TOKEN_PREFIX,
  UserSessionService,
} from "../user-session-service";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-09-26T10:00:00Z");

function userRecord(overrides: Partial<AuthUserRecord> = {}): AuthUserRecord {
  return {
    id: USER_ID,
    email: "user@example.com",
    nickname: "登科同学",
    avatarUrl: null,
    examYear: 2027,
    role: "user",
    isBanned: false,
    bannedUntil: null,
    createdAt: new Date("2026-09-01T00:00:00Z"),
    updatedAt: new Date("2026-09-01T00:00:00Z"),
    ...overrides,
  };
}

class FakeUserSessionRepository implements UserSessionRepository {
  sessions = new Map<string, UserSessionRecord>();

  users = new Map<string, AuthUserRecord>([[USER_ID, userRecord()]]);

  rotateSpy = vi.fn();

  async findSessionByTokenHash(tokenHash: string): Promise<UserSessionRecord | null> {
    return this.sessions.get(tokenHash) ?? null;
  }

  async findUserById(userId: string): Promise<AuthUserRecord | null> {
    return this.users.get(userId) ?? null;
  }

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    return [...this.users.values()].find((user) => user.email === email) ?? null;
  }

  async upsertUserByEmail(input: { id: string | null; email: string }): Promise<AuthUserRecord> {
    const existing = await this.findUserByEmail(input.email);

    if (existing) {
      return existing;
    }

    const created = userRecord({ id: input.id ?? USER_ID, email: input.email });

    this.users.set(created.id, created);

    return created;
  }

  async createSession(input: {
    userId: string;
    tokenHash: string;
    clientType: string;
    expiresAt: Date;
    now: Date;
  }): Promise<UserSessionRecord> {
    const record: UserSessionRecord = {
      id: `session-${this.sessions.size + 1}`,
      tokenHash: input.tokenHash,
      clientType: input.clientType,
      deviceName: null,
      expiresAt: input.expiresAt,
      revokedAt: null,
      lastSeenAt: input.now,
      user: this.users.get(input.userId)!,
    };

    this.sessions.set(input.tokenHash, record);

    return record;
  }

  async rotateSession(input: {
    userId: string;
    currentTokenHash: string;
    nextTokenHash: string;
    expiresAt: Date;
    now: Date;
  }): Promise<UserSessionRecord | null> {
    this.rotateSpy(input);

    const current = this.sessions.get(input.currentTokenHash);

    if (!current || current.revokedAt !== null || current.expiresAt.getTime() <= input.now.getTime()) {
      return null;
    }

    this.sessions.set(input.currentTokenHash, { ...current, revokedAt: input.now });

    return this.createSession({
      userId: input.userId,
      tokenHash: input.nextTokenHash,
      clientType: current.clientType,
      expiresAt: input.expiresAt,
      now: input.now,
    });
  }

  async revokeSessionByTokenHash(tokenHash: string, revokedAt: Date): Promise<boolean> {
    const session = this.sessions.get(tokenHash);

    if (!session || session.revokedAt !== null) {
      return false;
    }

    this.sessions.set(tokenHash, { ...session, revokedAt });

    return true;
  }

  async touchSession(sessionId: string, lastSeenAt: Date): Promise<void> {
    for (const [hash, session] of this.sessions) {
      if (session.id === sessionId) {
        this.sessions.set(hash, { ...session, lastSeenAt });
      }
    }
  }
}

function fixedToken(): (kind: "access" | "refresh") => string {
  let counter = 0;

  return (kind: "access" | "refresh") =>
    (kind === "access" ? ACCESS_TOKEN_PREFIX : REFRESH_TOKEN_PREFIX) +
    `token${String(++counter).padStart(38, "0")}`;
}

function createService(repository = new FakeUserSessionRepository()): {
  repository: FakeUserSessionRepository;
  service: UserSessionService;
} {
  const service = new UserSessionService({
    repository,
    now: () => NOW,
    generateToken: fixedToken(),
  });

  return { repository, service };
}

describe("UserSessionService", () => {
  it("issues an access/refresh pair with distinct prefixes", async () => {
    const { service } = createService();
    const pair = await service.createSessionPair(userRecord(), { clientType: "flutter" });

    expect(pair.accessToken.startsWith(ACCESS_TOKEN_PREFIX)).toBe(true);
    expect(pair.refreshToken.startsWith(REFRESH_TOKEN_PREFIX)).toBe(true);
    expect(pair.accessToken).not.toBe(pair.refreshToken);
    expect(pair.expiresIn).toBe(7_200);
  });

  it("rotates refresh tokens and returns a new pair", async () => {
    const { repository, service } = createService();
    const pair = await service.createSessionPair(userRecord());

    const refreshed = await service.refresh(pair.refreshToken);

    expect(refreshed.accessToken.startsWith(ACCESS_TOKEN_PREFIX)).toBe(true);
    expect(refreshed.refreshToken).not.toBe(pair.refreshToken);
    expect(repository.rotateSpy).toHaveBeenCalled();
  });

  it("treats a replayed refresh token as REFRESH_INVALID", async () => {
    const { service } = createService();
    const pair = await service.createSessionPair(userRecord());

    await service.refresh(pair.refreshToken);

    await expect(service.refresh(pair.refreshToken)).rejects.toMatchObject({
      code: ERROR_CODES.REFRESH_INVALID,
      status: 401,
    });
  });

  it("rejects access tokens used for refresh with REFRESH_INVALID", async () => {
    const { service } = createService();
    const pair = await service.createSessionPair(userRecord());

    await expect(service.refresh(pair.accessToken)).rejects.toMatchObject({
      code: ERROR_CODES.REFRESH_INVALID,
    });
  });

  it("returns the user and permissions for a valid access token", async () => {
    const { service } = createService();
    const pair = await service.createSessionPair(userRecord());

    const session = await service.getSession(pair.accessToken);

    expect(session.user.id).toBe(USER_ID);
    expect(session.permissions).toContain("quiz:read");
    expect(session.expiresAt).toBe("2026-09-26T12:00:00Z");
  });

  it("distinguishes missing (AUTH_REQUIRED) from expired (TOKEN_EXPIRED)", async () => {
    const { repository, service } = createService();
    const pair = await service.createSessionPair(userRecord());

    await expect(service.getSession(null)).rejects.toMatchObject({
      code: ERROR_CODES.AUTH_REQUIRED,
    });

    const tokenHash = Array.from(repository.sessions.keys()).find((hash) =>
      repository.sessions.get(hash)!.user.id,
    );

    if (tokenHash) {
      repository.sessions.set(tokenHash, {
        ...repository.sessions.get(tokenHash)!,
        expiresAt: new Date("2026-09-26T09:00:00Z"),
      });
    }

    await expect(service.getSession(pair.accessToken)).rejects.toMatchObject({
      code: ERROR_CODES.TOKEN_EXPIRED,
    });
  });

  it("rejects banned users with 403 USER_BANNED", async () => {
    const repository = new FakeUserSessionRepository();

    repository.users.set(
      USER_ID,
      userRecord({ isBanned: true, bannedUntil: null }),
    );

    const { service } = createService(repository);
    const pair = await service.createSessionPair(repository.users.get(USER_ID)!);

    await expect(service.getSession(pair.accessToken)).rejects.toMatchObject({
      code: ERROR_CODES.USER_BANNED,
      status: 403,
    });
  });

  it("stays idempotent when logging out with a malformed token", async () => {
    const { repository, service } = createService();

    await expect(service.logout(null)).resolves.toBeUndefined();
    await expect(service.logout("short")).resolves.toBeUndefined();
    expect(repository.sessions.size).toBe(0);
  });
});
