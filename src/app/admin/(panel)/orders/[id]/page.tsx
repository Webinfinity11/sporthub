/* eslint-disable @next/next/no-img-element */
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FaArrowLeft, FaPhoneAlt } from "react-icons/fa";
import { db, orderItems, orders } from "@/db";
import { fmtDate, fmtPhone } from "@/lib/admin-format";
import { requireAdmin } from "@/lib/auth";
import { formatPrice, paymentLabel, paymentStates } from "@/lib/data";
import BankPanel from "./BankPanel";
import OrderControls from "./OrderControls";

export const instant = false;

export const metadata: Metadata = { title: "შეკვეთა" };

export default async function OrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) notFound();
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));

  return (
    <>
      <Link href="/admin/orders" className="adm-back">
        <FaArrowLeft /> შეკვეთები
      </Link>
      <header className="adm-head">
        <div>
          <h1>შეკვეთა {order.number}</h1>
          <p className="adm-muted">{fmtDate(order.createdAt)}</p>
        </div>
        <a href={`tel:+995${order.phone.replace(/\D/g, "")}`} className="adm-btn ghost">
          <FaPhoneAlt /> დარეკვა
        </a>
      </header>

      <div className="adm-detail-grid">
        <div className="adm-stack">
          <section className="adm-panel">
            <div className="adm-panel-head">
              <h2>პროდუქცია</h2>
              <span className="adm-muted">{items.reduce((s, i) => s + i.qty, 0)} ერთეული</span>
            </div>
            <ul className="adm-order-items">
              {items.map((it) => (
                <li key={it.id}>
                  <img src={it.image ?? "/img/categories/cat-weights.webp"} alt="" />
                  <div>
                    {it.productId ? (
                      <Link href={`/admin/products/${it.productId}`} className="adm-strong-link">
                        {it.name}
                      </Link>
                    ) : (
                      <strong>{it.name}</strong>
                    )}
                    <span className="adm-cell-sub">
                      {formatPrice(it.price)} x {it.qty}
                    </span>
                  </div>
                  <strong className="num">{formatPrice(it.price * it.qty)}</strong>
                </li>
              ))}
            </ul>
            <dl className="adm-totals">
              <div>
                <dt>პროდუქცია</dt>
                <dd>{formatPrice(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div>
                  <dt>პრომო კოდი {order.promoCode}</dt>
                  <dd>-{formatPrice(order.discount)}</dd>
                </div>
              )}
              <div>
                <dt>მიწოდება</dt>
                <dd>{order.delivery === 0 ? "უფასო" : formatPrice(order.delivery)}</dd>
              </div>
              <div className="grand">
                <dt>სულ</dt>
                <dd>{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </section>

          <section className="adm-panel">
            <div className="adm-panel-head">
              <h2>მყიდველი</h2>
            </div>
            <dl className="adm-info">
              <div>
                <dt>სახელი</dt>
                <dd>{order.name}</dd>
              </div>
              <div>
                <dt>ტელეფონი</dt>
                <dd>
                  <a href={`tel:+995${order.phone.replace(/\D/g, "")}`}>{fmtPhone(order.phone)}</a>
                </dd>
              </div>
              {order.email && (
                <div>
                  <dt>ელ-ფოსტა</dt>
                  <dd>
                    <a href={`mailto:${order.email}`}>{order.email}</a>
                  </dd>
                </div>
              )}
              <div>
                <dt>მისამართი</dt>
                <dd>
                  {order.city}, {order.address}
                </dd>
              </div>
              <div>
                <dt>გადახდა</dt>
                <dd>
                  {paymentLabel(order.payment)}
                  {order.paymentStatus && <span className={`adm-pay p-${order.paymentStatus}`}>{paymentStates[order.paymentStatus] ?? order.paymentStatus}</span>}
                </dd>
              </div>
              {order.comment && (
                <div>
                  <dt>კომენტარი</dt>
                  <dd className="adm-quote">{order.comment}</dd>
                </div>
              )}
            </dl>
          </section>
          {(order.payment === "card" || order.payment === "installment") && (
            <BankPanel
              id={order.id}
              payment={order.payment}
              state={order.paymentStatus}
              detail={order.paymentDetail}
              reference={order.payment === "card" ? order.bogOrderId : order.tbcSessionId}
            />
          )}
        </div>

        <OrderControls id={order.id} status={order.status} note={order.adminNote} updatedAt={fmtDate(order.updatedAt)} />
      </div>
    </>
  );
}
