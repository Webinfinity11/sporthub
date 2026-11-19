// One-time move of images stored in Postgres (`media` table) to Cloudflare R2.
// Uploads each file, rewrites every "/media/<id>" reference to the R2 URL, and with --delete
// removes the moved rows from Postgres. Safe to run again (same keys are overwritten).
//
// Run: npm run media:r2 [-- --delete]
import { AwsClient } from "aws4fetch";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as s from "../src/db/schema";

const env = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`${k} is not set`);
  return v;
};
const account = env("R2_ACCOUNT_ID");
const bucket = env("R2_BUCKET");
const publicUrl = env("R2_PUBLIC_URL").replace(/\/+$/, "");
const r2 = new AwsClient({ accessKeyId: env("R2_ACCESS_KEY_ID"), secretAccessKey: env("R2_SECRET_ACCESS_KEY"), service: "s3", region: "auto" });
const del = process.argv.includes("--delete");

const url = env("DATABASE_URL");
const pool = new Pool({ connectionString: url, max: 1, ssl: /sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined });
const db = drizzle(pool, { schema: s });

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "image/gif": "gif" };

async function main() {
  const rows = await db.select({ id: s.media.id, mime: s.media.mime }).from(s.media);
  console.log(`${rows.length} images in Postgres`);
  let moved = 0;

  for (const { id, mime } of rows) {
    const [row] = await db.select().from(s.media).where(eq(s.media.id, id));
    const key = `uploads/${id}.${EXT[mime] ?? "bin"}`;
    const res = await r2.fetch(`https://${account}.r2.cloudflarestorage.com/${bucket}/${key}`, {
      method: "PUT",
      body: new Uint8Array(row.data),
      headers: { "Content-Type": mime, "Cache-Control": "public, max-age=31536000, immutable" },
    });
    if (!res.ok) throw new Error(`upload ${id} failed: ${res.status} ${await res.text()}`);

    const from = `/media/${id}`;
    const to = `${publicUrl}/${key}`;
    await db.transaction(async (tx) => {
      // products.images is a jsonb array of strings: replace the element in place
      await tx.execute(sql`
        update products set images = (
          select coalesce(jsonb_agg(case when e = ${from} then ${to} else e end order by i), '[]'::jsonb)
          from jsonb_array_elements_text(images) with ordinality as t(e, i)
        ) where images ? ${from}`);
      await tx.update(s.categories).set({ image: to }).where(eq(s.categories.image, from));
      await tx.update(s.heroSlides).set({ image: to }).where(eq(s.heroSlides.image, from));
      await tx.update(s.orderItems).set({ image: to }).where(eq(s.orderItems.image, from));
      if (del) await tx.delete(s.media).where(eq(s.media.id, id));
    });
    moved++;
    console.log(`${moved}/${rows.length}  ${from} -> ${to}`);
  }

  console.log(del ? "done, rows removed from Postgres" : "done. Check the site, then run again with --delete to free the database");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
