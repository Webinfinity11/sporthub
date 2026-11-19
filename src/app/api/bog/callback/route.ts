import { headers } from "next/headers";
import { verifyBogSignature } from "@/lib/bog";
import { siteOrigin, syncBogPayment } from "@/lib/payments";

/**
 * Bank of Georgia calls this after a card payment (and on refunds).
 * The payment state is always read back from the bank's API, never taken from the request,
 * so a forged call can at most make us re-check an order. The signature is still verified and logged.
 */
export async function POST(request: Request) {
  const raw = await request.text(); // verify over the raw body, before parsing
  const signed = verifyBogSignature(raw, request.headers.get("Callback-Signature"));
  let orderId: string | undefined;
  try {
    orderId = (JSON.parse(raw) as { body?: { order_id?: string } }).body?.order_id;
  } catch {
    return new Response("bad request", { status: 400 });
  }
  if (!orderId) return new Response("bad request", { status: 400 });
  if (!signed) console.warn(`BOG callback for ${orderId}: signature missing or invalid, checking with the bank`);

  try {
    const state = await syncBogPayment(orderId, siteOrigin(await headers()));
    console.log(`BOG callback ${orderId}: ${state}`);
  } catch (e) {
    console.error("BOG callback failed", orderId, e);
    // a non-200 answer makes the bank retry later
    return new Response("error", { status: 500 });
  }
  return new Response("ok");
}
