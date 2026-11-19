import "server-only";
import { inArray, sql } from "drizzle-orm";
import sharp from "sharp";
import { db, media } from "@/db";
import { deleteObject, listObjects, r2Enabled } from "./storage";

/** Longest side of a stored photo. Hero banners need the most (full width on large screens). */
const MAX_SIDE = 2400;

/**
 * Shrinks a photo to MAX_SIDE and re-encodes it as WebP (transparency is kept).
 * GIFs stay as they are (may be animated). If the result is not smaller, the original is kept.
 */
export async function optimizeImage(data: Buffer, mime: string): Promise<{ data: Buffer; mime: string }> {
  if (mime === "image/gif") return { data, mime };
  try {
    const out = await sharp(data, { failOn: "error" })
      .rotate() // apply the camera's EXIF orientation before the metadata is dropped
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 })
      .toBuffer();
    return out.length < data.length ? { data: out, mime: "image/webp" } : { data, mime };
  } catch {
    return { data, mime };
  }
}

/**
 * Identity of an uploaded file regardless of the domain it was saved with
 * ("uploads/<uuid>.webp" for R2, "/media/<uuid>" for legacy Postgres files), so changing
 * R2_PUBLIC_URL later never makes stored files look unused.
 */
const fileId = (u: string) => u.match(/\/(uploads\/[^/?#]+)$/)?.[1] ?? u.match(/^\/media\/[0-9a-f-]{36}$/i)?.[0] ?? null;

/** Every uploaded file the database still points to. Order items keep photos of past purchases. */
async function referencedFiles(): Promise<Set<string>> {
  const { rows } = await db.execute<{ u: string }>(sql`
    select jsonb_array_elements_text(images) as u from products
    union select image from categories where image is not null
    union select image from hero_slides
    union select video from hero_slides where video is not null
    union select image from order_items where image is not null`);
  return new Set(rows.map((r) => fileId(r.u)).filter((id): id is string => Boolean(id)));
}

/**
 * Deletes files that are no longer used anywhere: call after an image was removed from a
 * product, category or slide, or after one of those was deleted. Files still referenced
 * elsewhere (another product, an old order) are kept. Never throws.
 */
export async function releaseMedia(urls: (string | null | undefined)[]) {
  const ids = [...new Set(urls.map((u) => (u ? fileId(u) : null)).filter((id): id is string => Boolean(id)))];
  if (!ids.length) return;
  try {
    const used = await referencedFiles();
    const unused = ids.filter((id) => !used.has(id));
    const legacy = unused.filter((id) => id.startsWith("/media/")).map((id) => id.slice("/media/".length));
    if (legacy.length) await db.delete(media).where(inArray(media.id, legacy));
    if (r2Enabled) {
      for (const key of unused) if (key.startsWith("uploads/")) await deleteObject(key);
    }
  } catch (e) {
    console.error("releaseMedia failed", e);
  }
}

/** Uploads younger than this are left alone: the admin may still be filling in the form. */
const ORPHAN_AGE = 24 * 60 * 60 * 1000;
const SWEEP_EVERY = 6 * 60 * 60 * 1000;
let lastSweep = 0;

/**
 * Removes uploads that were never saved to anything (uploaded, then the form was abandoned).
 * Runs at most every few hours per server process; triggered from the admin upload actions.
 */
export async function sweepOrphans(force = false) {
  // Opt-in (MEDIA_SWEEP=on, set only on the live server): only the production database knows every
  // file in the bucket. A local server pointed at the same bucket would see production files as unused.
  if (process.env.MEDIA_SWEEP !== "on") return { deleted: 0 };
  if (!r2Enabled || (!force && Date.now() - lastSweep < SWEEP_EVERY)) return { deleted: 0 };
  lastSweep = Date.now();
  try {
    const [objects, used] = await Promise.all([listObjects("uploads/"), referencedFiles()]);
    const cutoff = Date.now() - ORPHAN_AGE;
    const stale = objects.filter((o) => o.modified.getTime() < cutoff && !used.has(o.key));
    for (const o of stale) await deleteObject(o.key);
    if (stale.length) console.log(`sweepOrphans: deleted ${stale.length} unused uploads`);
    return { deleted: stale.length };
  } catch (e) {
    console.error("sweepOrphans failed", e);
    return { deleted: 0 };
  }
}
