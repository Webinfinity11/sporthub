import { and, count, desc, eq, gte, lte, ne, sql, sum } from "drizzle-orm";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { db, orders, products } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { siteOrigin, syncStalePayments } from "@/lib/payments";
import { formatPrice, paymentLabel, paymentStates, statusLabel } from "@/lib/data";
import { fmtDate } from "@/lib/admin-format";

export const instant = false;

export const metadata: Metadata = { title: "მიმოხილვა" };

export default async function Dashboard() {
  await requireAdmin();
  // payments left on the bank's page: ask the bank, mark expired ones
  await syncStalePayments(siteOrigin(await headers())).catch((e) => console.error("stale payment sync failed", e));
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const notCancelled = ne(orders.status, "cancelled");

  const [[newCount], [today], [month], [activeProducts], recent, lowStock] = await Promise.all([
    db.select({ n: count() }).from(orders).where(eq(orders.status, "new")),
    db.select({ n: count(), sum: sum(orders.total) }).from(orders).where(and(gte(orders.createdAt, dayStart), notCancelled)),
    db.select({ n: count(), sum: sum(orders.total) }).from(orders).where(and(gte(orders.createdAt, monthStart), notCancelled)),
    db.select({ n: count() }).from(products).where(eq(products.active, true)),
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(8),
    db
      .select({ id: products.id, name: products.name, stock: products.stock, images: products.images })
      .from(products)
      .where(and(eq(products.active, true), lte(products.stock, 3)))
      .orderBy(products.stock, sql`${products.name}`)
      .limit(6),
  ]);

  const kpis = [
    { label: "ახალი შეკვეთები", value: String(newCount.n), href: "/admin/orders?status=new", accent: newCount.n > 0 },
    { label: "დღეს", value: formatPrice(Number(today.sum ?? 0)), sub: `${today.n} შეკვეთა` },
    { label: "ამ თვეში", value: formatPrice(Number(month.sum ?? 0)), sub: `${month.n} შეკვეთა` },
    { label: "აქტიური პროდუქცია", value: String(activeProducts.n), href: "/admin/products" },
  ];

  return (
    <>
      <header className="adm-head">
        <div>
          <h1>მიმოხილვა</h1>
          <p className="adm-muted">{fmtDate(now, false)}</p>
        </div>
        <Link href="/admin/products/new" className="adm-btn primary">
          ახალი პროდუქტი
        </Link>
      </header>

      <section className="adm-kpis">
        {kpis.map((k) => {
          const body = (
            <>
              <span className="k-label">{k.label}</span>
              <strong className="k-value">{k.value}</strong>
              {k.sub && <span className="k-sub">{k.sub}</span>}
            </>
          );
          return k.href ? (
            <Link key={k.label} href={k.href} className={`adm-kpi${k.accent ? " accent" : ""}`}>
              {body}
            </Link>
          ) : (
            <div key={k.label} className="adm-kpi">
              {body}
            </div>
          );
        })}
      </section>

      <div className="adm-dash-grid">
        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2>ბოლო შეკვეთები</h2>
            <Link href="/admin/orders" className="adm-link">
              ყველა
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="adm-empty">შეკვეთები ჯერ არ არის. საიტიდან პირველი შეკვეთა აქ გამოჩნდება.</p>
          ) : (
            <table className="adm-table">
              <thead>
                <tr>
                  <th>ნომერი</th>
                  <th>მყიდველი</th>
                  <th>თარიღი</th>
                  <th className="num">ჯამი</th>
                  <th>გადახდა</th>
                  <th>სტატუსი</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/admin/orders/${o.id}`} className="adm-strong-link">
                        {o.number}
                      </Link>
                    </td>
                    <td>{o.name}</td>
                    <td className="adm-muted">{fmtDate(o.createdAt)}</td>
                    <td className="num">{formatPrice(o.total)}</td>
                    <td>
                      {o.paymentStatus ? (
                        <span className={`adm-pay flat p-${o.paymentStatus}`}>{paymentStates[o.paymentStatus] ?? o.paymentStatus}</span>
                      ) : (
                        <span className="adm-muted">{paymentLabel(o.payment)}</span>
                      )}
                    </td>
                    <td>
                      <span className={`adm-status s-${o.status}`}>{statusLabel(o.status)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2>მარაგი იწურება</h2>
          </div>
          {lowStock.length === 0 ? (
            <p className="adm-empty">ყველა აქტიურ პროდუქტს საკმარისი მარაგი აქვს.</p>
          ) : (
            <ul className="adm-stock-list">
              {lowStock.map((p) => (
                <li key={p.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.images[0] ?? "/img/categories/cat-weights.webp"} alt="" />
                  <Link href={`/admin/products/${p.id}`}>{p.name}</Link>
                  <span className={`adm-stock${p.stock === 0 ? " zero" : ""}`}>{p.stock === 0 ? "ამოიწურა" : `${p.stock} ც`}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
