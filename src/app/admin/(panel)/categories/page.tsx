/* eslint-disable @next/next/no-img-element */
import { asc, count } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { FaPen, FaPlus } from "react-icons/fa";
import { categories, db, products } from "@/db";
import { requireAdmin } from "@/lib/auth";
import CategoryForm from "./CategoryForm";

export const instant = false;

export const metadata: Metadata = { title: "კატეგორიები" };

export default async function CategoriesPage({ searchParams }: PageProps<"/admin/categories">) {
  await requireAdmin();
  const sp = await searchParams;
  const [cats, counts] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id)),
    db.select({ id: products.categoryId, n: count() }).from(products).groupBy(products.categoryId),
  ]);
  const n = (id: number) => counts.find((c) => c.id === id)?.n ?? 0;
  const top = cats.filter((c) => !c.parentId);
  const editId = sp.edit === "new" ? "new" : Number(sp.edit) || null;
  const editing = typeof editId === "number" ? cats.find((c) => c.id === editId) : undefined;
  const newParent = Number(sp.parent) || null;

  const row = (c: (typeof cats)[number], sub = false) => (
    <li key={c.id} className={`adm-cat${sub ? " sub" : ""}${c.active ? "" : " is-muted"}${editId === c.id ? " editing" : ""}`}>
      <span className="adm-cat-img">{c.image ? <img src={c.image} alt="" /> : null}</span>
      <span className="adm-cat-name">
        <strong>{c.name}</strong>
        <span className="adm-cell-sub">
          /{c.slug}
          {!c.active && " · დამალული"}
        </span>
      </span>
      <span className="adm-cat-count">{n(c.id) + (sub ? 0 : cats.filter((s) => s.parentId === c.id).reduce((a, s) => a + n(s.id), 0))} პროდ.</span>
      <span className="adm-cat-actions">
        {!sub && (
          <Link href={`/admin/categories?edit=new&parent=${c.id}`} className="adm-icon-btn" aria-label={`${c.name}: ქვეკატეგორიის დამატება`} title="ქვეკატეგორია">
            <FaPlus />
          </Link>
        )}
        <Link href={`/admin/categories?edit=${c.id}`} className="adm-icon-btn" aria-label={`${c.name}: რედაქტირება`} title="რედაქტირება">
          <FaPen />
        </Link>
      </span>
    </li>
  );

  return (
    <>
      <header className="adm-head">
        <div>
          <h1>კატეგორიები</h1>
          <p className="adm-muted">
            {top.length} კატეგორია, {cats.length - top.length} ქვეკატეგორია. მთავარ გვერდზე პირველი 4 ჩანს.
          </p>
        </div>
        <Link href="/admin/categories?edit=new" className="adm-btn primary">
          ახალი კატეგორია
        </Link>
      </header>

      <div className={`adm-split${editId ? " with-form" : ""}`}>
        <section className="adm-panel flush">
          {top.length === 0 ? (
            <p className="adm-empty">კატეგორიები ჯერ არ არის.</p>
          ) : (
            <ul className="adm-cat-list">
              {top.map((c) => [row(c), ...cats.filter((s) => s.parentId === c.id).map((s) => row(s, true))])}
            </ul>
          )}
        </section>

        {editId && (editId === "new" || editing) && (
          <CategoryForm
            key={String(editId) + (newParent ?? "")}
            saved={sp.saved === "1"}
            parents={top.filter((c) => c.id !== editing?.id).map((c) => ({ id: c.id, name: c.name }))}
            hasChildren={!!editing && cats.some((s) => s.parentId === editing.id)}
            category={
              editing
                ? {
                    id: editing.id,
                    name: editing.name,
                    slug: editing.slug,
                    parentId: editing.parentId,
                    image: editing.image,
                    sortOrder: editing.sortOrder,
                    active: editing.active,
                  }
                : { name: "", slug: "", parentId: newParent, image: null, sortOrder: top.length, active: true }
            }
          />
        )}
      </div>
    </>
  );
}
