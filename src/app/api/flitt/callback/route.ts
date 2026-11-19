import { headers } from "next/headers";
import { verifyFlittSignature } from "@/lib/flitt";
import { siteOrigin, syncFlittPayment } from "@/lib/payments";

/**
 * Flitt's server callback after a split payment. The state is read back from Flitt's status API
 * (whose answer is signature-checked), so a forged call can at most make us re-check an order.
 */
export async function POST(request: Request) {
  let body: Record<string, string> = {};
  try {
    body = (await request.json()) as Record<string, string>;
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const orderId = body.order_id;
  if (!orderId) return new Response("bad request", { status: 400 });
  if (!verifyFlittSignature(body)) console.warn(`Flitt callback for ${orderId}: bad signature, checking with Flitt`);
  try {
    const state = await syncFlittPayment(orderId, siteOrigin(await headers()));
    console.log(`Flitt callback ${orderId}: ${state}`);
  } catch (e) {
    console.error("Flitt callback failed", orderId, e);
    return new Response("error", { status: 500 }); // Flitt retries later
  }
  return new Response("ok");
}
