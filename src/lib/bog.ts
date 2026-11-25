import "server-only";
import { createVerify } from "node:crypto";

/**
 * Bank of Georgia online payments (https://api.bog.ge/docs/payments/introduction).
 * Card payments appear at checkout only when BOG_CLIENT_ID and BOG_CLIENT_SECRET are set.
 */
const { BOG_CLIENT_ID: clientId, BOG_CLIENT_SECRET: clientSecret } = process.env;

export const bogEnabled = Boolean(clientId && clientSecret);
/** public part of the credentials, used by the bank's installment calculator in the browser */
export const bogClientId = clientId ?? "";

const TOKEN_URL = "https://oauth2.bog.ge/auth/realms/bog/protocol/openid-connect/token";
const API = "https://api.bog.ge/payments/v1";

/** Key the bank signs callbacks with (from the callback page of the docs). BOG_PUBLIC_KEY overrides it. */
const BOG_PUBLIC_KEY =
  process.env.BOG_PUBLIC_KEY?.replace(/\\n/g, "\n") ??
  `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu4RUyAw3+CdkS3ZNILQh
zHI9Hemo+vKB9U2BSabppkKjzjjkf+0Sm76hSMiu/HFtYhqWOESryoCDJoqffY0Q
1VNt25aTxbj068QNUtnxQ7KQVLA+pG0smf+EBWlS1vBEAFbIas9d8c9b9sSEkTrr
TYQ90WIM8bGB6S/KLVoT1a7SnzabjoLc5Qf/SLDG5fu8dH8zckyeYKdRKSBJKvhx
tcBuHV4f7qsynQT+f2UYbESX/TLHwT5qFWZDHZ0YUOUIvb8n7JujVSGZO9/+ll/g
4ZIWhC1MlJgPObDwRkRd8NFOopgxMcMsDIZIoLbWKhHVq67hdbwpAq9K9WMmEhPn
PwIDAQAB
-----END PUBLIC KEY-----
`;

let token: { value: string; until: number } | null = null;

async function accessToken() {
  if (token && Date.now() < token.until) return token.value;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`BOG auth failed: ${res.status} ${await res.text()}`);
  const j = (await res.json()) as { access_token: string; expires_in?: number };
  // expires_in is documented in seconds; the docs' example is not, so cap the cache at 10 minutes
  const seconds = Math.min(Number(j.expires_in) || 300, 600);
  token = { value: j.access_token, until: Date.now() + (seconds - 30) * 1000 };
  return token.value;
}

export type BogOrderInput = {
  number: string;
  items: { productId: number; name: string; qty: number; price: number; image: string | null }[];
  discount: number;
  delivery: number;
  total: number;
  origin: string;
  buyer?: { name: string; phone: string; email?: string };
  /** installment plan chosen in the bank's calculator; without it the payment is a normal card payment */
  loan?: { type: string; month: number };
};

const money = (n: number) => Math.round(n * 100) / 100;

/** Creates the payment at the bank; returns its id and the page the buyer is sent to. */
export async function createBogOrder(o: BogOrderInput): Promise<{ id: string; redirect: string }> {
  const back = `${o.origin}/checkout/result?order=${encodeURIComponent(o.number)}`;
  const res = await fetch(`${API}/ecommerce/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      "Accept-Language": "ka",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      callback_url: `${o.origin}/api/bog/callback`,
      external_order_id: o.number,
      purchase_units: {
        currency: "GEL",
        total_amount: money(o.total),
        ...(o.discount > 0 ? { total_discount_amount: money(o.discount) } : {}),
        basket: o.items.map((i) => ({
          product_id: String(i.productId),
          description: i.name.slice(0, 100),
          quantity: i.qty,
          unit_price: money(i.price),
          ...(i.image ? { image: i.image.startsWith("/") ? o.origin + i.image : i.image } : {}),
        })),
        delivery: { amount: money(o.delivery) },
      },
      redirect_urls: { success: back, fail: `${back}&fail=1` },
      ttl: 30,
      ...(o.loan ? { payment_method: ["bog_loan"], config: { loan: o.loan } } : {}),
      ...(o.buyer ? { buyer: { full_name: o.buyer.name, masked_phone: o.buyer.phone, ...(o.buyer.email ? { masked_email: o.buyer.email } : {}) } } : {}),
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`BOG create order failed: ${res.status} ${await res.text()}`);
  const j = (await res.json()) as { id: string; _links: { redirect: { href: string } } };
  return { id: j.id, redirect: j._links.redirect.href };
}

export type BogReceipt = {
  order_id: string;
  external_order_id?: string;
  order_status: { key: string; value?: string };
  purchase_units?: { request_amount?: string; transfer_amount?: string; currency_code?: string };
  reject_reason?: string | null;
};

/** Current state of a payment, straight from the bank. */
export async function getBogReceipt(bogOrderId: string): Promise<BogReceipt> {
  const res = await fetch(`${API}/receipt/${encodeURIComponent(bogOrderId)}`, {
    headers: { Authorization: `Bearer ${await accessToken()}`, "Accept-Language": "ka" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`BOG receipt failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as BogReceipt;
}

/** Checks the Callback-Signature header (SHA256withRSA over the raw body, base64). */
export function verifyBogSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  try {
    return createVerify("RSA-SHA256").update(rawBody, "utf8").verify(BOG_PUBLIC_KEY, signature.trim(), "base64");
  } catch {
    return false;
  }
}

/** Our payment state for a bank order_status.key. */
export function paymentStateOf(key: string): "pending" | "paid" | "failed" | "refunded" {
  if (key === "completed") return "paid";
  if (key === "rejected") return "failed";
  if (key === "refunded" || key === "refunded_partially" || key === "refund_requested") return "refunded";
  return "pending"; // created, processing, auth_requested, blocked, partial_completed
}
