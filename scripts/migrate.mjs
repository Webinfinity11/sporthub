// Applies pending SQL migrations from ./drizzle. Runs before `next start` (Railway) and via `npm run db:migrate`.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* production: env comes from the platform */
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url,
  max: 1,
  ssl: /sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined,
});

try {
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.log("migrations applied");
} finally {
  await pool.end();
}
