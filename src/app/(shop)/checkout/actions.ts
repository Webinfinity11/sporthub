"use server";

import { and, eq, gt, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { db, orderItems, orders, products, promoCodes } from "@/db";
import { deliveryCost, isBogPayment, isDeliveryZone, isOnlinePayment, normalizePromo, paymentLabel, paymentMethods, PROMO_RE, promoDiscount, zoneLabel } from "@/lib/data";
import { bogEnabled, createBogOrder } from "@/lib/bog";
import { createCredoOrder, credoEnabled } from "@/lib/credo";
import { sendOrderEmails } from "@/lib/order-emails";
import { siteOrigin } from "@/lib/payments";
import { createFlittCheckout, flittEnabled, flittOrderId } from "@/lib/flitt";
import { createInstallment, tbcEnabled } from "@/lib/tbc";
import { getSiteSettings } from "@/lib/queries";

export type OrderState =
  | { status: "idle" }
  /** `values`: what the customer typed, so the form can show it again (React resets the form after the action) */
  | { status: "error"; message: string; fields: Record<string, string>; values: Record<string, string> }
  | { status: "ok"; orderNumber: string; total: number }
  /** card payment: the buyer goes to the bank's payment page */
  /** `clear`: empty the cart now, because the bank does not send the buyer back */
  | { status: "redirect"; url: string; clear?: boolean };

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
  const offline = (isBogPayment(payment) && !bogEnabled) || (payment === "credo" && !credoEnabled) || (payment === "installment" && !tbcEnabled) || (payment === "split" && !flittEnabled);
  if (!paymentMethods.some((m) => m.id === payment) || offline) fields.payment = "აირჩიეთ გადახდის მეთოდი";

  // BOG installment and part-by-part: the plan the buyer picked in the bank's calculator
  const loan = { type: get("loanType"), month: Number(get("loanMonth")) };
  const withPlan = payment === "bogloan" || payment === "bogbnpl";
  if (withPlan && !(/^[\w-]{1,40}$/.test(loan.type) && Number.isInteger(loan.month) && loan.month > 0 && loan.month <= 60)) {
    fields.payment = "აირჩიეთ განვადების ვადა";
  }

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
          paymentStatus: isOnlinePayment(payment) ? "pending" : "",
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
  if (isBogPayment(payment)) {
    try {
      const bog = await createBogOrder({
        number,
        items: lines.map((l) => ({ productId: l.product.id, name: l.product.name, qty: l.qty, price: l.product.price, image: l.product.images[0] ?? null })),
        discount,
        delivery: ship,
        total,
        origin,
        buyer: { name, phone: phone.replace(/^\+?995/, ""), email: email || undefined },
        loan: withPlan ? loan : undefined,
        bnpl: payment === "bogbnpl",
      });
      await db.update(orders).set({ bogOrderId: bog.id }).where(eq(orders.id, orderId));
      return { status: "redirect", url: bog.redirect };
    } catch (e) {
      console.error(e);
      await db.update(orders).set({ paymentStatus: "failed" }).where(eq(orders.id, orderId));
      const what = payment === "bogloan" ? "განვადების გაფორმება" : payment === "bogbnpl" ? "ნაწილ-ნაწილ გადახდა" : "ბარათით გადახდა";
      return {
        status: "error",
        message: `${what} ახლა ვერ მოხერხდა. სცადეთ თავიდან ან აირჩიეთ სხვა მეთოდი.`,
        fields: { payment: `${what} დროებით მიუწვდომელია` },
        values,
      };
    }
  }

  // split (Flitt): the buyer pays in 4 parts on Flitt's page; emails go out once approved
  if (payment === "split") {
    try {
      const fid = flittOrderId(number);
      const f = await createFlittCheckout({ flittOrderId: fid, number, total, origin, email });
      await db.update(orders).set({ flittOrderId: fid }).where(eq(orders.id, orderId));
      return { status: "redirect", url: f.url };
    } catch (e) {
      console.error(e);
      await db.update(orders).set({ paymentStatus: "failed" }).where(eq(orders.id, orderId));
      return {
        status: "error",
        message: "განაწილება ახლა ვერ გაფორმდა. სცადეთ თავიდან ან აირჩიეთ სხვა მეთოდი.",
        fields: { payment: "განაწილება დროებით მიუწვდომელია" },
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

  // Credo: the buyer applies on the bank's page. There is no callback, so the emails go out now
  let credoUrl = "";
  if (payment === "credo") {
    try {
      credoUrl = (await createCredoOrder({ number, items: lines.map((l) => ({ name: l.product.name, qty: l.qty, price: l.product.price })), discount, delivery: ship })).redirect;
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

  if (credoUrl) return { status: "redirect", url: credoUrl, clear: true };
  return { status: "ok", orderNumber: number, total };
}

/** "Pay again" on the result page: a new card or split payment for an order whose last attempt failed. */
export async function retryCardPayment(number: string) {
  const [o] = await db.select().from(orders).where(eq(orders.number, number)).limit(1);
  const back = `/checkout/result?order=${encodeURIComponent(number)}`;
  // only after a failed attempt: a pending one may still complete, and a second payment would charge twice
  if (!o || o.paymentStatus !== "failed") redirect(back);
  const origin = siteOrigin(await headers());
  if (o.payment === "split" && flittEnabled) {
    const fid = flittOrderId(o.number);
    const f = await createFlittCheckout({ flittOrderId: fid, number: o.number, total: o.total, origin, email: o.email });
    await db.update(orders).set({ flittOrderId: fid, paymentStatus: "pending", updatedAt: new Date() }).where(eq(orders.id, o.id));
    updateTag("orders");
    redirect(f.url);
  }
  if (o.payment !== "card" || !bogEnabled) redirect(back);
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
  const bog = await createBogOrder({
    number: o.number,
    items: items.map((i) => ({ productId: i.productId ?? i.id, name: i.name, qty: i.qty, price: i.price, image: i.image })),
    discount: o.discount,
    delivery: o.delivery,
    total: o.total,
    origin,
    buyer: { name: o.name, phone: o.phone, email: o.email || undefined },
  });
  await db.update(orders).set({ bogOrderId: bog.id, paymentStatus: "pending", updatedAt: new Date() }).where(eq(orders.id, o.id));
  updateTag("orders");
  redirect(bog.redirect);
}
