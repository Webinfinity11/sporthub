import "server-only";
import { AwsClient } from "aws4fetch";

/**
 * Cloudflare R2 storage for admin uploads (S3 compatible API).
 * Files are served straight from the bucket's public URL, so they never touch Postgres or the app server.
 * Without R2 variables (local dev) uploads fall back to the Postgres `media` table.
 */
const {
  R2_ACCOUNT_ID: account,
  R2_ACCESS_KEY_ID: accessKeyId,
  R2_SECRET_ACCESS_KEY: secretAccessKey,
  R2_BUCKET: bucket,
} = process.env;

/** e.g. https://media.sporthub.ge or https://pub-xxxx.r2.dev (no trailing slash) */
export const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");

export const r2Enabled = Boolean(account && accessKeyId && secretAccessKey && bucket && R2_PUBLIC_URL);

let client: AwsClient | null = null;
const r2 = () => (client ??= new AwsClient({ accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey!, service: "s3", region: "auto" }));

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

/** Uploads one image and returns its public URL. */
export async function putImage(data: Uint8Array<ArrayBuffer>, mime: string, name = crypto.randomUUID()): Promise<string> {
  const key = `uploads/${name}.${EXT[mime] ?? "bin"}`;
  const res = await r2().fetch(`https://${account}.r2.cloudflarestorage.com/${bucket}/${key}`, {
    method: "PUT",
    body: data,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(data.byteLength),
      // keys are unique per upload, so the content never changes
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
  if (!res.ok) throw new Error(`R2 upload failed: ${res.status} ${await res.text()}`);
  return `${R2_PUBLIC_URL}/${key}`;
}

/** Image URLs the admin forms accept: bundled files, legacy Postgres uploads, R2 uploads. */
export function isImageUrl(u: string) {
  if (/^\/(media|img)\//.test(u)) return true;
  return R2_PUBLIC_URL !== "" && u.startsWith(`${R2_PUBLIC_URL}/uploads/`);
}
