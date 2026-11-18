/* eslint-disable @next/next/no-img-element */
import { asc, desc } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { FaSearch } from "react-icons/fa";
import { categories, db, products } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { discountPercent, formatPrice } from "@/lib/data";
import ProductActiveSwitch from "./ProductActiveSwitch";

export const instant = false;

export const metadata: Metadata = { title: "პროდუქცია" };

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const cat = Number(sp.category) || 0;
  const show = sp.show === "hidden" ? "hidden" : sp.show === "sale" ? "sale" : "all";

  const [rows, cats] = await Promise.all([
    db.select().from(products).orderBy(desc(products.updatedAt)),
    db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id)),
  ]);
  const catName = (id: number | null) => cats.find((c) => c.id === id)?.name ?? "უკატეგორიო";
  const inCat = (id: number | null) => {
    if (!cat) return true;
    if (id === cat) return true;
    return cats.find((c) => c.id === id)?.parentId === cat;
  };
  const list = rows.filter(
    (p) =>
      inCat(p.categoryId) &&
      (!q || p.name.toLowerCase().includes(q) || p.slug.includes(q)) &&
      (show === "all" || (show === "hidden" ? !p.active : discountPercent(p) > 0)),
  );
  const top = cats.filter((c) => !c.parentId);

  return (
    <>
      <header className="adm-head">
        <div>
          <h1>პროდუქცია</h1>
          <p className="adm-muted">
            {rows.length} პროდუქტი, {rows.filter((p) => !p.active).length} დამალული
          </p>
        </div>
        <Link href="/admin/products/new" className="adm-btn primary">
          ახალი პროდუქტი
        </Link>
      </header>

      <form className="adm-toolbar" action="/admin/products">
        <div className="adm-search">
          <FaSearch aria-hidden />
          <input name="q" defaultValue={q} placeholder="ძებნა დასახელებით" aria-label="ძებნა" />
        </div>
        <select name="category" defaultValue={cat || ""} className="adm-select" aria-label="კატეგორია">
          <option value="">ყველა კატეგორია</option>
          {top.map((c) => (
            <optgroup key={c.id} label={c.name}>
              <option value={c.id}>{c.name} (ყველა)</option>
              {cats
                .filter((s) => s.parentId === c.id)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <select name="show" defaultValue={show} className="adm-select" aria-label="ჩვენება">
          <option value="all">ყველა</option>
          <option value="sale">ფასდაკლებული</option>
          <option value="hidden">დამალული</option>
        </select>
        <button type="submit" className="adm-btn ghost">
          გაფილტვრა
        </button>
      </form>

      <section className="adm-panel flush">
        {list.length === 0 ? (
          <p className="adm-empty">პროდუქტი ვერ მოიძებნა.</p>
        ) : (
          <table className="adm-table products">
            <thead>
              <tr>
                <th colSpan={2}>პროდუქტი</th>
                <th>კატეგორია</th>
                <th className="num">ფასი</th>
                <th className="num">მარაგი</th>
                <th>საიტზე</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const d = discountPercent(p);
                return (
                  <tr key={p.id} className={p.active ? undefined : "is-muted"}>
                    <td className="thumb">
                      <img src={p.images[0] ?? "/img/categories/cat-weights.webp"} alt="" />
                    </td>
                    <td>
                      <Link href={`/admin/products/${p.id}`} className="adm-strong-link">
                        {p.name}
                      </Link>
                      <span className="adm-cell-sub">/{p.slug}</span>
                    </td>
                    <td className="adm-muted">{catName(p.categoryId)}</td>
                    <td className="num">
                      <span className="adm-cell-main">{formatPrice(p.price)}</span>
                      {d > 0 && (
                        <span className="adm-cell-sub">
                          <del>{formatPrice(p.oldPrice!)}</del> <span className="adm-off">-{d}%</span>
                        </span>
                      )}
                    </td>
                    <td className="num">
                      <span className={`adm-stock${p.stock === 0 ? " zero" : p.stock <= 3 ? " low" : ""}`}>{p.stock}</span>
                    </td>
                    <td>
                      <ProductActiveSwitch id={p.id} active={p.active} name={p.name} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
