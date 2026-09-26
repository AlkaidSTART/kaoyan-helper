import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Prisma Client 惰性单例。
 *
 * - 模块导入时不建立数据库连接，只有真正调用 `getPrismaClient()` 才创建实例。
 * - 开发环境复用 `globalThis` 缓存，避免 Next.js 热更新时耗尽数据库连接。
 * - 连接串缺失时抛出通用错误，不把 `DATABASE_URL` 内容写入错误信息或日志。
 */
type PrismaGlobal = typeof globalThis & {
  kaoyanPrismaClient?: PrismaClient;
};

const globalForPrisma = globalThis as PrismaGlobal;

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Database connection is not configured");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

export function getPrismaClient(): PrismaClient {
  const existing = globalForPrisma.kaoyanPrismaClient;

  if (existing) {
    return existing;
  }

  const client = createPrismaClient();
  globalForPrisma.kaoyanPrismaClient = client;

  return client;
}
