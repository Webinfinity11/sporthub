import "server-only";
import { AwsClient } from "aws4fetch";

/**
 * Cloudflare R2 storage for admin uploads (S3 compatible API).
 * Files are served straight from the bucket's public URL, so they never touch Postgres or the app server.
 * Without R2 variables (local dev) image uploads fall back to the Postgres `media` table.
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
const endpoint = (key = "") => `https://${account}.r2.cloudflarestorage.com/${bucket}/${key}`;

export const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

// keys are unique per upload, so the content never changes
const CACHE = "public, max-age=31536000, immutable";

export const newKey = (mime: string) => `uploads/${crypto.randomUUID()}.${EXT[mime] ?? "bin"}`;
export const publicUrl = (key: string) => `${R2_PUBLIC_URL}/${key}`;

/** Uploads a file and returns its public URL. */
export async function putObject(data: Uint8Array<ArrayBuffer>, mime: string): Promise<string> {
  const key = newKey(mime);
  const res = await r2().fetch(endpoint(key), {
    method: "PUT",
    body: data,
    headers: { "Content-Type": mime, "Content-Length": String(data.byteLength), "Cache-Control": CACHE },
  });
  if (!res.ok) throw new Error(`R2 upload failed: ${res.status} ${await res.text()}`);
  return publicUrl(key);
}

/**
 * Signed URL the browser PUTs a large file to directly (videos), so it never passes through the app server.
 * Type, exact size and cache header are part of the signature: the browser must send exactly `headers`,
 * so a different or larger file is rejected by R2.
 */
export async function presignPut(key: string, mime: string, size: number, expiresIn = 600) {
  const url = new URL(endpoint(key));
  url.searchParams.set("X-Amz-Expires", String(expiresIn));
  const headers = { "Content-Type": mime, "Content-Length": String(size), "Cache-Control": CACHE };
  const signed = await r2().sign(url.toString(), { method: "PUT", headers, aws: { signQuery: true, allHeaders: true } });
  // the browser sets Content-Length itself and refuses to have it set manually
  return { url: signed.url, headers: { "Content-Type": mime, "Cache-Control": CACHE } };
}

export async function deleteObject(key: string) {
  const res = await r2().fetch(endpoint(key), { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`R2 delete failed: ${res.status} ${await res.text()}`);
}

/** All objects under a prefix, with their upload time. */
export async function listObjects(prefix: string): Promise<{ key: string; modified: Date }[]> {
  const out: { key: string; modified: Date }[] = [];
  let token = "";
  do {
    const url = new URL(endpoint());
    url.searchParams.set("list-type", "2");
    url.searchParams.set("prefix", prefix);
    if (token) url.searchParams.set("continuation-token", token);
    const res = await r2().fetch(url.toString());
    if (!res.ok) throw new Error(`R2 list failed: ${res.status} ${await res.text()}`);
    const xml = await res.text();
    for (const [, body] of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const key = body.match(/<Key>([\s\S]*?)<\/Key>/)?.[1];
      const modified = body.match(/<LastModified>([\s\S]*?)<\/LastModified>/)?.[1];
      if (key && modified) out.push({ key: decodeXml(key), modified: new Date(modified) });
    }
    token = /<IsTruncated>true<\/IsTruncated>/.test(xml) ? decodeXml(xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/)?.[1] ?? "") : "";
  } while (token);
  return out;
}

const decodeXml = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

/** The bucket key of one of our uploads, or null for any other URL. */
export function keyOf(u: string) {
  const prefix = `${R2_PUBLIC_URL}/`;
  return R2_PUBLIC_URL !== "" && u.startsWith(`${prefix}uploads/`) ? u.slice(prefix.length) : null;
}

/** Image URLs the admin forms accept: bundled files, legacy Postgres uploads, R2 uploads. */
export function isImageUrl(u: string) {
  if (/^\/(media|img)\//.test(u)) return true;
  return /\.(jpg|png|webp|avif|gif)$/.test(keyOf(u) ?? "");
}

export function isVideoUrl(u: string) {
  return /\.(mp4|webm)$/.test(keyOf(u) ?? "");
}
