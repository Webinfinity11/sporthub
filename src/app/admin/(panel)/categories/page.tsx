import { asc, count } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { categories, db, products } from "@/db";
import { requireAdmin } from "@/lib/auth";
import CategoryForm from "./CategoryForm";
import CategoryList, { type CategoryItem } from "./CategoryList";

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

  const total = (id: number) => n(id) + cats.filter((s) => s.parentId === id).reduce((a, s) => a + n(s.id), 0);
  const item = (c: (typeof cats)[number], children: CategoryItem[] = []): CategoryItem => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    image: c.image,
    active: c.active,
    count: children.length ? total(c.id) : n(c.id),
    children,
  });
  const tree = top.map((c) => item(c, cats.filter((s) => s.parentId === c.id).map((s) => item(s))));

  return (
    <>
      <header className="adm-head">
        <div>
          <h1>კატეგორიები</h1>
          <p className="adm-muted">
            {top.length} კატეგორია, {cats.length - top.length} ქვეკატეგორია. მთავარ გვერდზე პირველი 4 ჩანს. რიგის შესაცვლელად გადაათრიეთ.
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
            <CategoryList tree={tree} editId={editId} />
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
                    active: editing.active,
                  }
                : { name: "", slug: "", parentId: newParent, image: null, active: true }
            }
          />
        )}
      </div>
    </>
  );
}
