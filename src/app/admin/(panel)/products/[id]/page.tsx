import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { categories, db, products } from "@/db";
import { requireAdmin } from "@/lib/auth";
import ProductForm from "../ProductForm";

export const instant = false;

export const metadata: Metadata = { title: "პროდუქტი" };

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [[p], cats, sp] = await Promise.all([
    db.select().from(products).where(eq(products.id, id)).limit(1),
    db
      .select({ id: categories.id, name: categories.name, parentId: categories.parentId })
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.id)),
    searchParams,
  ]);
  if (!p) notFound();
  return (
    <ProductForm
      categories={cats}
      saved={sp.saved === "1"}
      product={{
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        deliveryTbilisi: p.deliveryTbilisi,
        deliveryRegions: p.deliveryRegions,
        oldPrice: p.oldPrice,
        stock: p.stock,
        categoryId: p.categoryId,
        images: p.images,
        specs: p.specs,
        active: p.active,
      }}
    />
  );
}
