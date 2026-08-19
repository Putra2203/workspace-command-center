import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// This project keeps secrets in .env.local (Next.js convention), not the
// plain .env dotenv/config loads by default — load it explicitly so the
// Prisma CLI and `next dev` read the same file.
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // The Prisma CLI (migrate/introspect) needs a direct, non-pooled connection —
    // DATABASE_URL (Supavisor's transaction pooler) doesn't support the prepared
    // statements/advisory locks migrations require. There is no separate
    // "directUrl" field in Prisma 7's config (unlike the old schema.prisma
    // datasource block) — just this one `url`, which is CLI-only.
    // The running app's PrismaClient (src/infrastructure/db/client.ts) reads
    // DATABASE_URL itself via its own driver-adapter connection string,
    // entirely independent of this config.
    url: process.env["DIRECT_URL"],
  },
});
