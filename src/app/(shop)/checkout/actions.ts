"use server";

import { and, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { db, orderItems, orders, products, promoCodes } from "@/db";
import { deliveryCost, isDeliveryZone, normalizePromo, paymentLabel, paymentMethods, PROMO_RE, promoDiscount, zoneLabel } from "@/lib/data";
import { bogEnabled, createBogOrder } from "@/lib/bog";
import { sendOrderEmails } from "@/lib/order-emails";
import { siteOrigin } from "@/lib/payments";
import { createInstallment, tbcEnabled } from "@/lib/tbc";
import { getSiteSettings } from "@/lib/queries";

export type OrderState =
  | { status: "idle" }
  /** `values`: what the customer typed, so the form can show it again (React resets the form after the action) */
  | { status: "error"; message: string; fields: Record<string, string>; values: Record<string, string> }
  | { status: "ok"; orderNumber: string; total: number }
  /** card payment: the buyer goes to the bank's payment page */
  | { status: "redirect"; url: string };

export type PromoCheck = { ok: true; code: string; percent: number } | { ok: false; error: string };

const usable = (code: string) =>
  and(
    eq(promoCodes.code, code),
    eq(promoCodes.active, true),
    or(isNull(promoCodes.maxUses), lt(promoCodes.usedCount, promoCodes.maxUses)),
    or(isNull(promoCodes.expiresAt), gt(promoCodes.expiresAt, sql`now()`)),
  );

// slows down guessing codes: 20 checks per 10 minutes per visitor
const checks = new Map<string, { n: number; until: number }>();

/** Checkout preview only; the code is checked again (and used up) when the order is placed. */
export async function checkPromo(raw: string): Promise<PromoCheck> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const c = checks.get(ip);
  const n = c && c.until > now ? c.n + 1 : 1;
  checks.set(ip, { n, until: c && c.until > now ? c.until : now + 10 * 60 * 1000 });
  if (n > 20) return { ok: false, error: "ძალიან ბევრი მცდელობა, სცადეთ მოგვიანებით" };

  const code = normalizePromo(raw);
  if (!PROMO_RE.test(code)) return { ok: false, error: "პრომო კოდი არასწორია" };
  const [row] = await db.select({ percent: promoCodes.percent }).from(promoCodes).where(usable(code)).limit(1);
  if (!row) return { ok: false, error: "პრომო კოდი არასწორია ან აღარ მოქმედებს" };
  return { ok: true, code, percent: row.percent };
}

class PromoGone extends Error {}

/** Validates the order, recomputes prices from the database and stores it. */
export async function placeOrder(_prev: OrderState, form: FormData): Promise<OrderState> {
  const get = (k: string) => String(form.get(k) ?? "").trim();
  const fields: Record<string, string> = {};
  const values = Object.fromEntries(["name", "phone", "email", "address", "comment", "payment"].map((k) => [k, get(k)]));

  const name = get("name").slice(0, 120);
  const phone = get("phone").replace(/[\s-]/g, "");
  const zoneRaw = get("zone");
  const email = get("email").slice(0, 160);
  const address = get("address").slice(0, 300);
  const comment = get("comment").slice(0, 1000);
  const payment = get("payment");
  const promo = normalizePromo(get("promo"));

  if (name.length < 2) fields.name = "მიუთითეთ სახელი და გვარი";
  if (!/^(\+?995)?5\d{8}$/.test(phone)) fields.phone = "მიუთითეთ სწორი მობილურის ნომერი (5XX XXX XXX)";
  const zone = isDeliveryZone(zoneRaw) ? zoneRaw : null;
  if (!zone) fields.zone = "აირჩიეთ მიწოდების ზონა";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fields.email = "ელ-ფოსტა არასწორია";
  if (address.length < 5) fields.address = "მიუთითეთ მისამართი";
  const offline = (payment === "card" && !bogEnabled) || (payment === "installment" && !tbcEnabled);
  if (!paymentMethods.some((m) => m.id === payment) || offline) fields.payment = "აირჩიეთ გადახდის მეთოდი";

  let raw: unknown = [];
  try {
    raw = JSON.parse(get("items"));
  } catch {
    raw = [];
  }
  const wanted = (Array.isArray(raw) ? raw : [])
    .map((i) => ({ id: Number(i?.id), qty: Math.max(1, Math.min(20, Math.round(Number(i?.qty) || 1))) }))
    .filter((i) => Number.isInteger(i.id) && i.id > 0)
    .slice(0, 50);

  const rows = wanted.length
    ? await db.select().from(products).where(inArray(products.id, wanted.map((w) => w.id)))
    : [];
  const lines = wanted
    .map((w) => ({ product: rows.find((r) => r.id === w.id && r.active), qty: w.qty }))
    .filter((l): l is { product: (typeof rows)[number]; qty: number } => !!l.product);

  if (lines.length === 0) return { status: "error", message: "კალათა ცარიელია ან პროდუქტები აღარ არის ხელმისაწვდომი", fields, values };
  if (Object.keys(fields).length > 0) {
    return { status: "error", message: "გთხოვთ, შეავსოთ მონიშნული ველები", fields, values };
  }

  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  // each product's delivery price for the chosen zone, from the database (promo codes do not touch it)
  const ship = deliveryCost(
    lines.map((l) => l.product),
    zone!,
  );
  const number = `SH-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 10)}`;
  let discount = 0;
  let total = subtotal + ship;
  let orderId = 0;

  try {
    await db.transaction(async (tx) => {
      if (promo) {
        // counts the use only if the code is still valid, so a single-use code cannot be used twice
        const [used] = await tx
          .update(promoCodes)
          .set({ usedCount: sql`${promoCodes.usedCount} + 1` })
          .where(usable(promo))
          .returning({ percent: promoCodes.percent });
        if (!used) throw new PromoGone();
        discount = promoDiscount(subtotal, used.percent);
        total = subtotal - discount + ship;
      }
      const [order] = await tx
        .insert(orders)
        .values({
          number,
          name,
          phone: phone.replace(/^\+?995/, ""),
          email,
          city: zoneLabel(zone!),
          address,
          comment,
          payment,
          paymentStatus: payment === "card" || payment === "installment" ? "pending" : "",
          subtotal,
          delivery: ship,
          promoCode: promo || null,
          discount,
          total,
        })
        .returning({ id: orders.id });
      orderId = order.id;
      await tx.insert(orderItems).values(
        lines.map((l) => ({
          orderId: order.id,
          productId: l.product.id,
          name: l.product.name,
          image: l.product.images[0] ?? null,
          price: l.product.price,
          qty: l.qty,
        })),
      );
    });
  } catch (e) {
    if (e instanceof PromoGone) {
      return { status: "error", message: "პრომო კოდი აღარ მოქმედებს. წაშალეთ ის და სცადეთ თავიდან.", fields: { promo: "პრომო კოდი აღარ მოქმედებს" }, values };
    }
    throw e;
  }
  updateTag("orders");

  // links in emails and bank redirects: SITE_URL (the public domain) or the address of this request
  const origin = siteOrigin(await headers());

  // card: the order waits for the bank; emails go out when the payment is confirmed (lib/payments.ts)
  if (payment === "card") {
    try {
      const bog = await createBogOrder({
        number,
        items: lines.map((l) => ({ productId: l.product.id, name: l.product.name, qty: l.qty, price: l.product.price, image: l.product.images[0] ?? null })),
        discount,
        delivery: ship,
        total,
        origin,
        buyer: { name, phone: phone.replace(/^\+?995/, ""), email: email || undefined },
      });
      await db.update(orders).set({ bogOrderId: bog.id }).where(eq(orders.id, orderId));
      return { status: "redirect", url: bog.redirect };
    } catch (e) {
      console.error(e);
      await db.update(orders).set({ paymentStatus: "failed" }).where(eq(orders.id, orderId));
      return {
        status: "error",
        message: "ბარათით გადახდა ახლა ვერ მოხერხდა. სცადეთ თავიდან ან აირჩიეთ სხვა მეთოდი.",
        fields: { payment: "ბარათით გადახდა დროებით მიუწვდომელია" },
        values,
      };
    }
  }

  // installment: the buyer applies on TBC's page; the order waits for the bank's decision
  if (payment === "installment") {
    try {
      const app = await createInstallment({
        number,
        items: lines.map((l) => ({ name: l.product.name, qty: l.qty, price: l.product.price })),
        discount,
        delivery: ship,
      });
      await db.update(orders).set({ tbcSessionId: app.sessionId }).where(eq(orders.id, orderId));
      return { status: "redirect", url: app.redirect };
    } catch (e) {
      console.error(e);
      await db.update(orders).set({ paymentStatus: "failed" }).where(eq(orders.id, orderId));
      return {
        status: "error",
        message: "განვადების განაცხადი ახლა ვერ შეიქმნა. სცადეთ თავიდან ან აირჩიეთ სხვა მეთოდი.",
        fields: { payment: "განვადება დროებით მიუწვდომელია" },
        values,
      };
    }
  }

  // emails go out after the response, so the buyer does not wait for the mail server
  const mail = {
    id: orderId,
    number,
    name,
    phone: phone.replace(/^\+?995/, ""),
    email,
    zone: zoneLabel(zone!),
    address,
    comment,
    payment: paymentLabel(payment),
    items: lines.map((l) => ({ name: l.product.name, qty: l.qty, price: l.product.price, image: l.product.images[0] ?? null })),
    subtotal,
    discount,
    promoCode: promo || null,
    delivery: ship,
    total,
  };
  after(async () => sendOrderEmails(origin, mail, await getSiteSettings()));

  return { status: "ok", orderNumber: number, total };
}

/** "Pay again" on the result page: a new bank payment for an order whose card payment failed. */
export async function retryCardPayment(number: string) {
  const [o] = await db.select().from(orders).where(eq(orders.number, number)).limit(1);
  // only after a failed attempt: a pending one may still complete, and a second payment would charge twice
  if (!o || o.payment !== "card" || o.paymentStatus !== "failed" || !bogEnabled) redirect(`/checkout/result?order=${encodeURIComponent(number)}`);
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
  const bog = await createBogOrder({
    number: o.number,
    items: items.map((i) => ({ productId: i.productId ?? i.id, name: i.name, qty: i.qty, price: i.price, image: i.image })),
    discount: o.discount,
    delivery: o.delivery,
    total: o.total,
    origin: siteOrigin(await headers()),
    buyer: { name: o.name, phone: o.phone, email: o.email || undefined },
  });
  await db.update(orders).set({ bogOrderId: bog.id, paymentStatus: "pending", updatedAt: new Date() }).where(eq(orders.id, o.id));
  updateTag("orders");
  redirect(bog.redirect);
}
