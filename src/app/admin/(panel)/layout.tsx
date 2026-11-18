import { count, eq } from "drizzle-orm";
import { Suspense } from "react";
import Sidebar from "@/components/admin/Sidebar";
import { db, orders } from "@/db";
import { isAdmin } from "@/lib/auth";

// Only decorates the menu: it must never redirect on its own (pages and the proxy guard access).
async function NewOrdersBadge() {
  if (!(await isAdmin())) return null;
  const [{ n }] = await db.select({ n: count() }).from(orders).where(eq(orders.status, "new"));
  return n > 0 ? <span className="adm-badge">{n}</span> : null;
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="adm-shell">
      <Sidebar
        newOrders={
          <Suspense fallback={null}>
            <NewOrdersBadge />
          </Suspense>
        }
      />
      <main className="adm-main">
        <Suspense fallback={<div className="adm-loading" aria-label="იტვირთება" />}>{children}</Suspense>
      </main>
    </div>
  );
}
