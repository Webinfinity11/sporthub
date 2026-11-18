import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { FaSearch } from "react-icons/fa";
import { categories, db, products } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { discountPercent } from "@/lib/data";
import ProductTable from "./ProductTable";

export const instant = false;

export const metadata: Metadata = { title: "პროდუქცია" };

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const cat = Number(sp.category) || 0;
  const show = sp.show === "hidden" ? "hidden" : sp.show === "sale" ? "sale" : "all";

  const [rows, cats] = await Promise.all([
    db.select().from(products).orderBy(asc(products.sortOrder), asc(products.id)),
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
          <ProductTable
            rows={list.map((p) => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              image: p.images[0] ?? null,
              categoryName: catName(p.categoryId),
              price: p.price,
              oldPrice: p.oldPrice,
              stock: p.stock,
              active: p.active,
            }))}
          />
        )}
      </section>
    </>
  );
}
