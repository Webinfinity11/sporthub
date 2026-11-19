import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { FaSearch } from "react-icons/fa";
import { db, orders, type OrderStatus } from "@/db";
import { fmtDate, fmtPhone } from "@/lib/admin-format";
import { requireAdmin } from "@/lib/auth";
import { formatPrice, orderStatuses, paymentLabel, paymentStates, statusLabel } from "@/lib/data";

export const instant = false;

export const metadata: Metadata = { title: "შეკვეთები" };

const PER_PAGE = 30;

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  const sp = await searchParams;
  const status = orderStatuses.some((s) => s.id === sp.status) ? (sp.status as OrderStatus) : null;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const where: SQL[] = [];
  if (status) where.push(eq(orders.status, status));
  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    where.push(or(ilike(orders.number, like), ilike(orders.name, like), ilike(orders.phone, like.replace(/\s/g, "")))!);
  }

  const [rows, [{ total }], counts] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(where.length ? and(...where) : undefined)
      .orderBy(desc(orders.createdAt))
      .limit(PER_PAGE)
      .offset((page - 1) * PER_PAGE),
    db.select({ total: count() }).from(orders).where(where.length ? and(...where) : undefined),
    db.select({ status: orders.status, n: count() }).from(orders).groupBy(orders.status),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;
  const all = counts.reduce((a, c) => a + c.n, 0);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  const href = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (q) p.set("q", q);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    const s = p.toString();
    return s ? `/admin/orders?${s}` : "/admin/orders";
  };

  return (
    <>
      <header className="adm-head">
        <div>
          <h1>შეკვეთები</h1>
          <p className="adm-muted">{all} შეკვეთა სულ</p>
        </div>
      </header>

      <div className="adm-toolbar">
        <nav className="adm-tabs" aria-label="სტატუსი">
          <Link href={href({ status: null, page: null })} className={!status ? "active" : undefined}>
            ყველა <span>{all}</span>
          </Link>
          {orderStatuses.map((s) => (
            <Link key={s.id} href={href({ status: s.id, page: null })} className={status === s.id ? "active" : undefined}>
              {s.label} <span>{countOf(s.id)}</span>
            </Link>
          ))}
        </nav>
        <form className="adm-search" action="/admin/orders">
          {status && <input type="hidden" name="status" value={status} />}
          <FaSearch aria-hidden />
          <input name="q" defaultValue={q} placeholder="ნომერი, სახელი ან ტელეფონი" aria-label="ძებნა" />
        </form>
      </div>

      <section className="adm-panel flush">
        {rows.length === 0 ? (
          <p className="adm-empty">{q || status ? "ამ ფილტრით შეკვეთა ვერ მოიძებნა." : "შეკვეთები ჯერ არ არის."}</p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>ნომერი</th>
                <th>თარიღი</th>
                <th>მყიდველი</th>
                <th>მიწოდება</th>
                <th>გადახდა</th>
                <th className="num">ჯამი</th>
                <th>სტატუსი</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className={o.status === "new" ? "is-new" : undefined}>
                  <td>
                    <Link href={`/admin/orders/${o.id}`} className="adm-strong-link">
                      {o.number}
                    </Link>
                  </td>
                  <td className="adm-muted nowrap">{fmtDate(o.createdAt)}</td>
                  <td>
                    <span className="adm-cell-main">{o.name}</span>
                    <span className="adm-cell-sub">{fmtPhone(o.phone)}</span>
                  </td>
                  <td>{o.city}</td>
                  <td className="adm-muted">
                    {paymentLabel(o.payment)}
                    {o.paymentStatus && <span className={`adm-pay p-${o.paymentStatus}`}>{paymentStates[o.paymentStatus] ?? o.paymentStatus}</span>}
                  </td>
                  <td className="num">{formatPrice(o.total)}</td>
                  <td>
                    <span className={`adm-status s-${o.status}`}>{statusLabel(o.status)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {pages > 1 && (
        <nav className="adm-pager" aria-label="გვერდები">
          {page > 1 && <Link href={href({ page: String(page - 1) })}>წინა</Link>}
          <span>
            {page} / {pages}
          </span>
          {page < pages && <Link href={href({ page: String(page + 1) })}>შემდეგი</Link>}
        </nav>
      )}
    </>
  );
}
