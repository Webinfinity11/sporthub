import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
// `next build` may load this module without a database; fail only when the server actually runs.
if (!url && process.env.NEXT_PHASE !== "phase-production-build") throw new Error("DATABASE_URL is not set");

// Reuse one pool across hot reloads in development.
const g = globalThis as unknown as { __pgPool?: Pool };
const pool =
  g.__pgPool ??
  new Pool({
    connectionString: url,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    ssl: /sslmode=require/.test(url ?? "") ? { rejectUnauthorized: false } : undefined,
  });
if (process.env.NODE_ENV !== "production") g.__pgPool = pool;

export const db = drizzle(pool, { schema });
export * from "./schema";
