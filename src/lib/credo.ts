import "server-only";
import { createHash } from "node:crypto";
import { installmentProducts, type InstallmentInput } from "./tbc";

/**
 * Credo Bank online installments (https://4developers.credo.ge/apidoc/docs-site/6000022).
 * The option appears at checkout only when CREDO_MERCHANT_ID and CREDO_SECRET_KEY are set.
 * The bank has no callback and no return address: we ask for the status.
 */
const { CREDO_MERCHANT_ID: merchantId, CREDO_SECRET_KEY: secret } = process.env;

export const credoEnabled = Boolean(merchantId && secret);

const BASE = "https://ganvadeba.credo.ge";
const md5 = (s: string) => createHash("md5").update(s, "utf8").digest("hex");

/** Starts an application; the buyer continues on Credo's page at `redirect`. The order number is the bank's orderCode. */
export async function createCredoOrder(o: InstallmentInput): Promise<{ redirect: string }> {
  // one entry per line (quantity 1, line total), discount spread over lines, delivery as its own line; prices in tetri
  const products = installmentProducts(o).products.map((p, i) => ({
    id: String(i + 1),
    title: p.name,
    amount: 1,
    price: Math.round(p.price * 100),
    type: "0",
  }));
  const check = md5(products.map((p) => `${p.id}${p.title}${p.amount}${p.price}${p.type}`).join("") + secret);
  const res = await fetch(`${BASE}/widget_api/order.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merchantId, orderCode: o.number, check, products }),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const text = await res.text();
  const url = res.ok ? (JSON.parse(text) as { data?: { URL?: string } }).data?.URL : undefined;
  if (!url) throw new Error(`Credo create order failed: ${res.status} ${text}`);
  return { redirect: url };
}

const STATUSES: Record<number, string> = {
  2: "განხილვაშია",
  3: "დამტკიცდა",
  4: "ხელმოსაწერია",
  5: "დასრულდა, თანხა ჩაირიცხა",
  6: "უარყოფილია",
  7: "გაუქმდა ან ვადა გაუვიდა",
  9: "გადაგზავნილია ფილიალში",
  10: "საჭიროა იდენტიფიკაცია",
  11: "შევსების პროცესშია",
  12: "ხელშეკრულება ხელმოწერილია, გააგზავნეთ პროდუქცია",
  13: "ვიდეო შემოწმებაზეა",
  14: "ბექ-ოფისშია",
};

/** Current status of an application; null while the bank has no record of it. */
export async function getCredoStatus(orderCode: string): Promise<{ statusId: number; description: string } | null> {
  const query = new URLSearchParams({ merchantId: merchantId ?? "", orderCode, hash: md5(`${merchantId}${orderCode}${secret}`) });
  const res = await fetch(`${BASE}/widget/api.php?${query}`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
  const text = await res.text();
  // the answer also carries the buyer's personal data ("info"), which we neither store nor log
  let body: { status?: number; message?: string; data?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`Credo status failed: ${res.status}`);
  }
  if (body.status === 404) return null;
  const statusId = Number(body.data);
  if (body.status !== 200 || !Number.isInteger(statusId)) throw new Error(`Credo status failed: ${body.status} ${body.message}`);
  return { statusId, description: STATUSES[statusId] ?? "" };
}

/** Our payment state: 12 = signed (the shop ships), 5 = money transferred; 6, 7 = declined or cancelled. */
export function credoStateOf(statusId: number): "pending" | "paid" | "failed" {
  if (statusId === 5 || statusId === 12) return "paid";
  if (statusId === 6 || statusId === 7) return "failed";
  return "pending";
}
