import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db, orders } from "@/db";
import { siteOrigin, syncFlittPayment } from "@/lib/payments";

/**
 * Where Flitt sends the buyer back (a browser POST with the payment fields, or a plain GET).
 * Re-checks the payment with Flitt, then redirects to the shop's result page.
 */
async function handle(request: Request) {
  let flittOrderId = new URL(request.url).searchParams.get("order_id") ?? "";
  if (request.method === "POST") {
    const type = request.headers.get("content-type") ?? "";
    try {
      const data = type.includes("application/json")
        ? ((await request.json()) as Record<string, string>)
        : Object.fromEntries((await request.formData()).entries());
      flittOrderId = String(data.order_id ?? flittOrderId);
    } catch {
      /* fall back to the query string */
    }
  }
  const origin = siteOrigin(await headers());
  const [o] = flittOrderId
    ? await db.select({ number: orders.number }).from(orders).where(eq(orders.flittOrderId, flittOrderId)).limit(1)
    : [];
  if (!o) return Response.redirect(`${origin}/checkout/result`, 303);
  try {
    await syncFlittPayment(flittOrderId, origin);
  } catch (e) {
    console.error("Flitt return check failed", flittOrderId, e);
  }
  return Response.redirect(`${origin}/checkout/result?order=${encodeURIComponent(o.number)}`, 303);
}

export const POST = handle;
export const GET = handle;
