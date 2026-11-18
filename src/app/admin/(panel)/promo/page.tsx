import { desc, getTableColumns, sql } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { db, promoCodes } from "@/db";
import { fmtDate } from "@/lib/admin-format";
import { requireAdmin } from "@/lib/auth";
import PromoForm from "./PromoForm";
import PromoRowControls from "./PromoRowControls";

export const instant = false;

export const metadata: Metadata = { title: "პრომო კოდები" };

type Row = typeof promoCodes.$inferSelect & { expired: boolean };

function status(p: Row) {
  if (!p.active) return { label: "გამორთული", cls: "s-cancelled" };
  if (p.expired) return { label: "ვადაგასული", cls: "s-cancelled" };
  if (p.maxUses !== null && p.usedCount >= p.maxUses) return { label: "ამოწურული", cls: "s-shipped" };
  return { label: "აქტიური", cls: "s-delivered" };
}

export default async function PromoPage({ searchParams }: PageProps<"/admin/promo">) {
  await requireAdmin();
  const sp = await searchParams;
  const rows = await db
    .select({ ...getTableColumns(promoCodes), expired: sql<boolean>`coalesce(${promoCodes.expiresAt} <= now(), false)` })
    .from(promoCodes)
    .orderBy(desc(promoCodes.createdAt));
  const formOpen = sp.new === "1";
  const created = typeof sp.created === "string" ? sp.created : null;

  return (
    <>
      <header className="adm-head">
        <div>
          <h1>პრომო კოდები</h1>
          <p className="adm-muted">ფასდაკლება ვრცელდება პროდუქციაზე, მიწოდებაზე არა. მყიდველი კოდს შეკვეთის გაფორმებისას წერს.</p>
        </div>
        {!formOpen && (
          <Link href="/admin/promo?new=1" className="adm-btn primary">
            ახალი კოდი
          </Link>
        )}
      </header>

      {created && (
        <p className="adm-saved" role="status" style={{ marginBottom: 16 }}>
          კოდი {created} შეიქმნა
        </p>
      )}

      <div className={`adm-split${formOpen ? " with-form" : ""}`}>
        <section className="adm-panel flush">
          {rows.length === 0 ? (
            <p className="adm-empty">პრომო კოდები ჯერ არ არის.</p>
          ) : (
            <table className="adm-table">
              <thead>
                <tr>
                  <th>კოდი</th>
                  <th>ფასდაკლება</th>
                  <th>გამოყენება</th>
                  <th>ვადა</th>
                  <th>სტატუსი</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const st = status(p);
                  return (
                    <tr key={p.id} className={st.cls === "s-delivered" ? undefined : "is-muted"}>
                      <td>
                        <span className="adm-cell-main adm-code">{p.code}</span>
                        <span className="adm-cell-sub">{p.maxUses === 1 ? "ერთჯერადი" : "მრავალჯერადი"}</span>
                      </td>
                      <td className="num">{p.percent}%</td>
                      <td className="num">
                        {p.usedCount}
                        {p.maxUses !== null ? ` / ${p.maxUses}` : ""}
                      </td>
                      <td>{p.expiresAt ? fmtDate(p.expiresAt) : "უვადო"}</td>
                      <td>
                        <span className={`adm-status ${st.cls}`}>{st.label}</span>
                      </td>
                      <td>
                        <PromoRowControls id={p.id} code={p.code} active={p.active} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {formOpen && <PromoForm />}
      </div>
    </>
  );
}
