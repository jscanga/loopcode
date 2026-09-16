import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

/**
 * A single shared Prisma client, wired through the libSQL driver adapter.
 *
 * - Local development: no TURSO_* vars are set, so we fall back to a local
 *   SQLite file (DATABASE_URL, default `file:./prisma/dev.db`). Fully offline.
 * - Production (Vercel): set TURSO_DATABASE_URL + TURSO_AUTH_TOKEN and the same
 *   code talks to Turso (libSQL) over HTTPS — which works from serverless
 *   functions, unlike a local SQLite file on an ephemeral filesystem.
 *
 * Because both paths are SQLite, the schema and every query are identical.
 */
const url =
  process.env.TURSO_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "file:./prisma/dev.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const libsql = createClient({ url, authToken });
const adapter = new PrismaLibSQL(libsql);

export const prisma = new PrismaClient({ adapter });
