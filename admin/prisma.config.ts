// Prisma 7 CLI 不再自动加载 .env，需在此显式加载（CI 环境则从平台环境变量取值）
import "dotenv/config";

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
