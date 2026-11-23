import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer loads .env automatically. Load it when present so
// `prisma migrate` keeps working locally as it did with Prisma 6.
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

// Prisma 7 reads the connection URL from this file instead of schema.prisma.
// DATABASE_URL is optional for this app (it falls back to an in-memory store),
// so read it directly rather than with `env()`, which throws when it is unset
// and would break `prisma generate` in CI and builds.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
