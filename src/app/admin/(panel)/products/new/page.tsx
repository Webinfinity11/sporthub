import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import { categories, db } from "@/db";
import { requireAdmin } from "@/lib/auth";
import ProductForm from "../ProductForm";

export const instant = false;

export const metadata: Metadata = { title: "ახალი პროდუქტი" };

export default async function NewProductPage() {
  await requireAdmin();
  const cats = await db
    .select({ id: categories.id, name: categories.name, parentId: categories.parentId })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.id));
  return (
    <ProductForm
      categories={cats}
      product={{
        name: "",
        slug: "",
        description: "",
        price: null,
        oldPrice: null,
        stock: 0,
        categoryId: null,
        images: [],
        specs: [],
        active: true,
      }}
    />
  );
}
