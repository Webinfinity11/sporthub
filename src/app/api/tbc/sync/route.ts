import { timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { siteOrigin, syncOpenInstallments } from "@/lib/payments";

/**
 * Re-checks open TBC installment applications (TBC has no callback, so we ask).
 * Called every few minutes by the timer in src/instrumentation.ts; protected by SESSION_SECRET.
 */
export async function POST(request: Request) {
  const key = Buffer.from(request.headers.get("x-sync-key") ?? "");
  const secret = Buffer.from(process.env.SESSION_SECRET ?? "");
  if (!secret.length || key.length !== secret.length || !timingSafeEqual(key, secret)) {
    return new Response("forbidden", { status: 403 });
  }
  const checked = await syncOpenInstallments(siteOrigin(await headers()));
  return Response.json({ checked });
}
