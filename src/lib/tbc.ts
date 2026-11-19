import "server-only";
import { request as httpsRequest } from "node:https";

/**
 * TBC Bank online installments (https://developers.tbcbank.ge/docs/installment-overview).
 * The option appears at checkout only when TBC_API_KEY and TBC_API_SECRET are set.
 * TBC_ENV=production switches to the live API; until then the test API and the public test
 * merchantKey / campaignId from the docs are used.
 */
const { TBC_API_KEY: apiKey, TBC_API_SECRET: apiSecret } = process.env;
const production = process.env.TBC_ENV === "production";

export const tbcEnabled = Boolean(apiKey && apiSecret);

const BASE = production ? "https://api.tbcbank.ge" : "https://test-api.tbcbank.ge";
const MERCHANT_KEY = process.env.TBC_MERCHANT_KEY || (production ? "" : "000000000-ce21da5e-da92-48f3-8009-4d438cbcc137");
const CAMPAIGN_ID = process.env.TBC_CAMPAIGN_ID || (production ? "" : "204");

type Res = { status: number; headers: Record<string, string | string[] | undefined>; body: string };

/** HTTPS call that also allows a JSON body on GET (the status endpoints expect one, which fetch() refuses). */
function call(method: string, path: string, headers: Record<string, string>, body?: string): Promise<Res> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      `${BASE}${path}`,
      { method, headers: { ...headers, ...(body ? { "Content-Length": Buffer.byteLength(body).toString() } : {}) }, timeout: 20000 },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (data += c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: data }));
      },
    );
    req.on("timeout", () => req.destroy(new Error(`TBC ${method} ${path} timed out`)));
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

let token: { value: string; until: number } | null = null;

async function accessToken() {
  if (token && Date.now() < token.until) return token.value;
  const res = await call(
    "POST",
    "/oauth/token",
    {
      Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    new URLSearchParams({ grant_type: "client_credentials", scope: "online_installments" }).toString(),
  );
  if (res.status !== 200) throw new Error(`TBC auth failed: ${res.status} ${res.body}`);
  const j = JSON.parse(res.body) as { access_token: string };
  // the documented lifetime is long (and its unit unclear); refresh hourly
  token = { value: j.access_token, until: Date.now() + 55 * 60 * 1000 };
  return token.value;
}

async function api(method: string, path: string, body: object) {
  const res = await call(method, `/v1/online-installments${path}`, { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" }, JSON.stringify(body));
  if (res.status < 200 || res.status >= 300) throw new Error(`TBC ${method} ${path} failed: ${res.status} ${res.body}`);
  return res;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export type InstallmentInput = {
  number: string;
  items: { name: string; qty: number; price: number }[];
  discount: number;
  delivery: number;
};

/**
 * TBC requires priceTotal to equal the sum of the product prices. Each line goes as one entry
 * (quantity 1, line total), a promo discount is spread over the lines, and delivery is its own line.
 */
export function installmentProducts(o: InstallmentInput) {
  const lines = o.items.map((i) => ({ name: i.qty > 1 ? `${i.name} x ${i.qty}` : i.name, price: round2(i.price * i.qty), quantity: 1 }));
  const subtotal = lines.reduce((s, l) => s + l.price, 0);
  if (o.discount > 0 && subtotal > 0) {
    for (const l of lines) l.price = round2(l.price * (1 - o.discount / subtotal));
    // rounding leftovers go to the most expensive line so the total stays exact
    const want = round2(subtotal - o.discount);
    const got = round2(lines.reduce((s, l) => s + l.price, 0));
    const top = lines.reduce((a, b) => (b.price > a.price ? b : a));
    top.price = round2(top.price + (want - got));
  }
  if (o.delivery > 0) lines.push({ name: "მიწოდება", price: round2(o.delivery), quantity: 1 });
  return { products: lines, priceTotal: round2(lines.reduce((s, l) => s + l.price, 0)) };
}

/** Starts an application; the buyer continues on TBC's page at `redirect`. */
export async function createInstallment(o: InstallmentInput): Promise<{ sessionId: string; redirect: string }> {
  const { products, priceTotal } = installmentProducts(o);
  const res = await api("POST", "/applications", {
    merchantKey: MERCHANT_KEY,
    ...(CAMPAIGN_ID ? { campaignId: CAMPAIGN_ID } : {}),
    invoiceId: o.number,
    priceTotal,
    products,
  });
  const location = res.headers.location;
  const redirect = Array.isArray(location) ? location[0] : location;
  const { sessionId } = JSON.parse(res.body) as { sessionId: string };
  if (!sessionId || !redirect) throw new Error(`TBC application without sessionId/location: ${res.body}`);
  return { sessionId, redirect };
}

export async function installmentStatus(sessionId: string): Promise<{ statusId: number; description: string; amount: number | null }> {
  const res = await api("GET", `/applications/${encodeURIComponent(sessionId)}/status`, { merchantKey: MERCHANT_KEY });
  return JSON.parse(res.body);
}

/** The shop confirms the products are available, so the loan can be disbursed (status 5). */
export const confirmInstallment = (sessionId: string) => api("POST", `/applications/${encodeURIComponent(sessionId)}/confirm`, { merchantKey: MERCHANT_KEY });
export const cancelInstallment = (sessionId: string) => api("POST", `/applications/${encodeURIComponent(sessionId)}/cancel`, { merchantKey: MERCHANT_KEY });

/**
 * Our payment state for a TBC status id:
 * 5 = the buyer signed and the bank waits for the shop's confirm/cancel;
 * 8, 9 = disbursed (confirmed by both sides); 3, 4, 6, 7 = expired, cancelled or declined.
 */
export function installmentStateOf(statusId: number): "pending" | "awaiting" | "paid" | "failed" {
  if (statusId === 5) return "awaiting";
  if (statusId === 8 || statusId === 9) return "paid";
  if ([3, 4, 6, 7].includes(statusId)) return "failed";
  return "pending"; // 0, 1, 2, 10, 11, 12, 13: still in progress on the bank's side
}
