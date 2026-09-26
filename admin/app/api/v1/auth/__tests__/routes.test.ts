import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AdminCredentialRecord,
  AdminSessionRecord,
  AuthRepository,
  CreateSessionInput,
  RotateSessionInput,
} from "@/lib/auth/auth-repository";

const repositoryState = {
  credential: null as AdminCredentialRecord | null,
  session: null as AdminSessionRecord | null,
  calls: {
    findCredentialByEmail: 0,
    findSessionByTokenHash: 0,
    createSession: [] as CreateSessionInput[],
    rotateSession: [] as RotateSessionInput[],
    revokeSessionByTokenHash: 0,
    touchSession: 0,
  },
};

function resetRepositoryState(): void {
  repositoryState.credential = null;
  repositoryState.session = null;
  repositoryState.calls.findCredentialByEmail = 0;
  repositoryState.calls.findSessionByTokenHash = 0;
  repositoryState.calls.createSession = [];
  repositoryState.calls.rotateSession = [];
  repositoryState.calls.revokeSessionByTokenHash = 0;
  repositoryState.calls.touchSession = 0;
}

vi.mock("@/lib/auth/prisma-user-session-repository", () => ({
  PrismaUserSessionRepository: class {},
}));

vi.mock("@/lib/auth/prisma-auth-repository", () => ({
  PrismaAuthRepository: class implements AuthRepository {
    async findCredentialByEmail(): Promise<AdminCredentialRecord | null> {
      repositoryState.calls.findCredentialByEmail += 1;

      return repositoryState.credential;
    }

    async findSessionByTokenHash(): Promise<AdminSessionRecord | null> {
      repositoryState.calls.findSessionByTokenHash += 1;

      return repositoryState.session;
    }

    async createSession(input: CreateSessionInput): Promise<AdminSessionRecord> {
      repositoryState.calls.createSession.push(input);
      throw new Error("createSession should not be called in route tests");
    }

    async rotateSession(input: RotateSessionInput): Promise<AdminSessionRecord | null> {
      repositoryState.calls.rotateSession.push(input);

      return null;
    }

    async revokeSessionByTokenHash(): Promise<boolean> {
      repositoryState.calls.revokeSessionByTokenHash += 1;

      return false;
    }

    async touchSession(): Promise<void> {
      repositoryState.calls.touchSession += 1;
    }
  },
}));

const { POST: login } = await import("../login/password/route");
const { POST: refresh } = await import("../refresh/route");
const { POST: logout } = await import("../logout/route");
const { GET: session } = await import("../session/route");

const VALID_SESSION_COOKIE = "admin_session=old_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function jsonRequest(path: string, body: unknown): Request {
  return new Request(`https://admin.example.com${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

interface ErrorEnvelopeBody {
  success: false;
  error: { code: string };
}

beforeEach(() => {
  resetRepositoryState();
});

describe("POST /api/v1/auth/login/password", () => {
  it("rejects a non-admin-web client type with 422 PROVIDER_UNSUPPORTED", async () => {
    const response = await login(
      jsonRequest("/api/v1/auth/login/password", {
        email: "admin@example.com",
        password: "correct horse battery staple",
        clientType: "mobile",
      }),
    );
    const body = (await response.json()) as ErrorEnvelopeBody;

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("PROVIDER_UNSUPPORTED");
    expect(repositoryState.calls.findCredentialByEmail).toBe(0);
  });

  it("rejects malformed input with 422 VALIDATION_FAILED and clears the cookie", async () => {
    const response = await login(
      jsonRequest("/api/v1/auth/login/password", {
        email: "not-an-email",
        password: "",
        clientType: "admin-web",
      }),
    );
    const body = (await response.json()) as ErrorEnvelopeBody;

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("VALIDATION_FAILED");
    expect(response.headers.get("set-cookie")).toContain("admin_session=");
    expect(repositoryState.calls.findCredentialByEmail).toBe(0);
  });

  it("returns 401 AUTH_INVALID_CREDENTIALS for an unknown email", async () => {
    const response = await login(
      jsonRequest("/api/v1/auth/login/password", {
        email: "unknown@example.com",
        password: "correct horse battery staple",
        clientType: "admin-web",
      }),
    );
    const body = (await response.json()) as ErrorEnvelopeBody;

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_INVALID_CREDENTIALS");
    expect(repositoryState.calls.findCredentialByEmail).toBe(1);
  });
});

describe("POST /api/v1/auth/refresh", () => {
  it("returns 401 REFRESH_INVALID without touching the session table when the cookie is missing", async () => {
    const response = await refresh(
      new Request("https://admin.example.com/api/v1/auth/refresh", { method: "POST" }),
    );
    const body = (await response.json()) as ErrorEnvelopeBody;

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("REFRESH_INVALID");
    expect(repositoryState.calls.findSessionByTokenHash).toBe(0);
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("is idempotent: succeeds and clears the cookie even without a session cookie", async () => {
    const response = await logout(
      new Request("https://admin.example.com/api/v1/auth/logout", { method: "POST" }),
    );
    const body = (await response.json()) as { success: boolean; data: unknown };

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toBeNull();
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(repositoryState.calls.revokeSessionByTokenHash).toBe(0);
  });

  it("does not query the database for an invalid token format", async () => {
    const response = await logout(
      new Request("https://admin.example.com/api/v1/auth/logout", {
        method: "POST",
        headers: { cookie: "admin_session=short" },
      }),
    );

    expect(response.status).toBe(200);
    expect(repositoryState.calls.revokeSessionByTokenHash).toBe(0);
  });
});

describe("GET /api/v1/auth/session", () => {
  it("returns 401 AUTH_REQUIRED without touching the database when the cookie is missing", async () => {
    const response = await session(
      new Request("https://admin.example.com/api/v1/auth/session"),
    );
    const body = (await response.json()) as ErrorEnvelopeBody;

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_REQUIRED");
    expect(repositoryState.calls.findSessionByTokenHash).toBe(0);
  });

  it("returns 401 for an unknown but well-formed session token", async () => {
    const response = await session(
      new Request("https://admin.example.com/api/v1/auth/session", {
        headers: { cookie: VALID_SESSION_COOKIE },
      }),
    );
    const body = (await response.json()) as ErrorEnvelopeBody;

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("AUTH_REQUIRED");
    expect(repositoryState.calls.findSessionByTokenHash).toBe(1);
  });
});
