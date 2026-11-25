import "server-only";
import { and, eq, gt, inArray, ne, sql } from "drizzle-orm";
import { db, orderItems, orders } from "@/db";
import { bogEnabled, getBogReceipt, paymentStateOf } from "./bog";
import { flittEnabled, flittStateOf, getFlittStatus } from "./flitt";
import { installmentStateOf, installmentStatus, tbcEnabled } from "./tbc";
import { paymentLabel } from "./data";
import { sendOrderEmails, type OrderMail } from "./order-emails";
import { getSiteSettings } from "./queries";

/** Everything the order emails need, read back from the database. */
export async function orderMail(orderId: number): Promise<OrderMail | null> {
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  return {
    id: o.id,
    number: o.number,
    name: o.name,
    phone: o.phone,
    email: o.email,
    zone: o.city,
    address: o.address,
    comment: o.comment,
    payment:
      o.paymentStatus === "paid"
        ? `${paymentLabel(o.payment)} (გადახდილია)`
        : o.paymentStatus === "awaiting"
          ? `${paymentLabel(o.payment)} (ბანკმა დაამტკიცა)`
          : paymentLabel(o.payment),
    items: items.map((i) => ({ name: i.name, qty: i.qty, price: i.price, image: i.image })),
    subtotal: o.subtotal,
    discount: o.discount,
    promoCode: o.promoCode,
    delivery: o.delivery,
    total: o.total,
  };
}

/**
 * Asks the bank for the current state of an order's card payment and stores it.
 * The first time it turns "paid", the shop and the buyer get their emails (exactly once,
 * because only the update that changes the state returns a row).
 */
export async function syncBogPayment(bogOrderId: string, origin: string) {
  const receipt = await getBogReceipt(bogOrderId);
  const state = paymentStateOf(receipt.order_status.key);
  const [changed] = await db
    .update(orders)
    .set({ paymentStatus: state, ...(state === "paid" ? { paidAt: new Date() } : {}), updatedAt: new Date() })
    .where(and(eq(orders.bogOrderId, bogOrderId), ne(orders.paymentStatus, state)))
    .returning({ id: orders.id });
  if (changed) {
    if (state === "paid") {
      const mail = await orderMail(changed.id);
      if (mail) await sendOrderEmails(origin, mail, await getSiteSettings());
    }
  }
  return state;
}

/** Same as syncBogPayment, for a Flitt split payment (looked up by its Flitt order id). */
export async function syncFlittPayment(flittOrderId: string, origin: string) {
  const st = await getFlittStatus(flittOrderId);
  const state = flittStateOf(st.status);
  const [changed] = await db
    .update(orders)
    .set({ paymentStatus: state, paymentDetail: st.status, ...(state === "paid" ? { paidAt: new Date() } : {}), updatedAt: new Date() })
    .where(and(eq(orders.flittOrderId, flittOrderId), ne(orders.paymentStatus, state)))
    .returning({ id: orders.id });
  if (changed) {
    if (state === "paid") {
      const mail = await orderMail(changed.id);
      if (mail) await sendOrderEmails(origin, mail, await getSiteSettings());
    }
  }
  return state;
}

/**
 * Asks TBC for the state of an order's installment application and stores it.
 * When the bank approves and the buyer signs (state "awaiting"), the shop must confirm the same
 * day, so that is when the emails go out (exactly once, like card payments).
 */
export async function syncInstallment(orderId: number, origin: string) {
  const [o] = await db.select({ session: orders.tbcSessionId, state: orders.paymentStatus }).from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o?.session) return null;
  const st = await installmentStatus(o.session);
  const state = installmentStateOf(st.statusId);
  const detail = `${st.statusId}: ${st.description ?? ""}`.slice(0, 300);
  const [changed] = await db
    .update(orders)
    .set({ paymentStatus: state, paymentDetail: detail, ...(state === "paid" ? { paidAt: new Date() } : {}), updatedAt: new Date() })
    .where(and(eq(orders.id, orderId), ne(orders.paymentDetail, detail)))
    .returning({ id: orders.id });
  if (changed) {
    // first time the bank's approval arrives (a paid status may skip "awaiting" when the bank confirms on its own)
    if ((state === "awaiting" || state === "paid") && o.state !== "awaiting" && o.state !== "paid") {
      const mail = await orderMail(orderId);
      if (mail) await sendOrderEmails(origin, mail, await getSiteSettings());
    }
  }
  return state;
}

/** Re-checks every open installment application (called every few minutes, see instrumentation.ts). */
export async function syncOpenInstallments(origin: string) {
  if (!tbcEnabled) return 0;
  const open = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.payment, "installment"),
        inArray(orders.paymentStatus, ["pending", "awaiting"]),
        gt(orders.createdAt, sql`now() - interval '35 days'`),
      ),
    );
  for (const o of open) {
    try {
      await syncInstallment(o.id, origin);
    } catch (e) {
      console.error("installment sync failed for order", o.id, e);
    }
  }
  return open.length;
}

/**
 * Card and split payments still "pending": asks the bank again (the buyer may have closed the bank's
 * page, so neither the result page nor a callback came). The bank's payment page lives 30 minutes
 * (ttl in bog.ts), so a payment still pending 35 minutes after the order can no longer complete and
 * is marked failed. A late "paid" callback would still turn it paid. Called when the admin opens orders.
 */
export async function syncStalePayments(origin: string) {
  const open = await db
    .select({ id: orders.id, payment: orders.payment, bog: orders.bogOrderId, flitt: orders.flittOrderId })
    .from(orders)
    .where(
      and(
        inArray(orders.payment, ["card", "bogloan", "split"]),
        eq(orders.paymentStatus, "pending"),
        sql`${orders.createdAt} < now() - interval '2 minutes'`,
        gt(orders.createdAt, sql`now() - interval '7 days'`),
      ),
    )
    .limit(15);
  for (const o of open) {
    try {
      if ((o.payment === "card" || o.payment === "bogloan") && o.bog && bogEnabled) await syncBogPayment(o.bog, origin);
      if (o.payment === "split" && o.flitt && flittEnabled) await syncFlittPayment(o.flitt, origin);
    } catch (e) {
      console.error("payment re-check failed for order", o.id, e);
    }
  }
  await db
    .update(orders)
    .set({ paymentStatus: "failed", paymentDetail: "გადახდა არ დასრულდა, ბანკის გვერდის ვადა გავიდა", updatedAt: new Date() })
    .where(
      and(
        inArray(orders.payment, ["card", "bogloan", "split"]),
        eq(orders.paymentStatus, "pending"),
        sql`${orders.createdAt} < now() - interval '35 minutes'`,
      ),
    );
}

/** Public address for links in emails and bank redirects. */
export const siteOrigin = (h: Headers) =>
  process.env.SITE_URL?.replace(/\/+$/, "") || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
