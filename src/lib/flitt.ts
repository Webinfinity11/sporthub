import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Flitt (https://docs.flitt.com): TBC "განაწილება", the cost split into 4 equal parts.
 * Shown at checkout only when FLITT_MERCHANT_ID and FLITT_SECRET_KEY are set.
 * FLITT_TEST=1 uses the demo bank (payment_method "x") so the flow can be tried with
 * Flitt's public test merchant (1549901 / "test") without real money.
 */
const merchantId = process.env.FLITT_MERCHANT_ID;
const secret = process.env.FLITT_SECRET_KEY;
const test = process.env.FLITT_TEST === "1";

export const flittEnabled = Boolean(merchantId && secret);

const API = "https://pay.flitt.com/api";

type Params = Record<string, string | number | null | undefined>;

/** SHA-1 of "secret|value1|value2..." with keys sorted alphabetically, empty values and `signature` left out. */
export function flittSignature(params: Params, key = secret ?? "") {
  const values = Object.keys(params)
    .filter((k) => k !== "signature" && k !== "response_signature_string")
    .sort()
    .map((k) => params[k])
    .filter((v) => v !== "" && v !== null && v !== undefined)
    .map(String);
  return createHash("sha1").update([key, ...values].join("|"), "utf8").digest("hex");
}

/** Checks the signature Flitt puts on callbacks, return redirects and status responses. */
export function verifyFlittSignature(params: Params) {
  const got = Buffer.from(String(params.signature ?? ""));
  const want = Buffer.from(flittSignature(params));
  return got.length === want.length && timingSafeEqual(got, want);
}

async function post(path: string, request: Params) {
  const body = { request: { ...request, signature: flittSignature(request) } };
  const res = await fetch(`${API}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
  const j = (await res.json()) as { response: Params & { response_status?: string; error_message?: string } };
  if (!res.ok || j.response?.response_status !== "success") throw new Error(`Flitt ${path} failed: ${res.status} ${JSON.stringify(j.response)}`);
  return j.response;
}

/**
 * Flitt order ids must be unique per merchant (the public test merchant is shared by everyone),
 * so every attempt gets its own id: "sporthub-<order number>-<attempt>".
 */
export const flittOrderId = (number: string) => `sporthub-${number}-${Date.now().toString(36)}`;

/** Starts a split payment; the buyer continues on Flitt's page at `url`. Amount is in tetri. */
export async function createFlittCheckout(o: { flittOrderId: string; number: string; total: number; origin: string; email?: string }) {
  const r = await post("/checkout/url", {
    version: "1.0.1",
    merchant_id: merchantId,
    order_id: o.flittOrderId,
    order_desc: `SportHub შეკვეთა ${o.number}`,
    amount: Math.round(o.total * 100),
    currency: "GEL",
    lang: "ka",
    payment_systems: "installments",
    payment_method: test ? "x" : "tbc",
    server_callback_url: `${o.origin}/api/flitt/callback`,
    response_url: `${o.origin}/api/flitt/return`,
    sender_email: o.email || undefined,
    lifetime: 3600,
  });
  return { url: String(r.checkout_url) };
}

/** Current state of a Flitt order, straight from Flitt (signature of the answer is checked). */
export async function getFlittStatus(flittOrderId: string) {
  const r = await post("/status/order_id", { version: "1.0.1", merchant_id: merchantId, order_id: flittOrderId });
  if (!verifyFlittSignature(r)) throw new Error("Flitt status response has a bad signature");
  return { status: String(r.order_status ?? ""), amount: Number(r.amount ?? 0) };
}

/** Our payment state for a Flitt order_status. */
export function flittStateOf(status: string): "pending" | "paid" | "failed" | "refunded" {
  if (status === "approved") return "paid";
  if (status === "declined" || status === "expired") return "failed";
  if (status === "reversed") return "refunded";
  return "pending"; // created, processing
}
