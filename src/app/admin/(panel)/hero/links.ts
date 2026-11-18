import "server-only";
import { asc } from "drizzle-orm";
import { categories, db } from "@/db";

/** Suggestions for hero button links (catalog, sale, every category). */
export async function heroLinkOptions() {
  const cats = await db
    .select({ slug: categories.slug, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.id));
  return [
    { href: "/catalog", label: "კატალოგი" },
    { href: "/catalog?sale=1", label: "ფასდაკლებები" },
    ...cats.map((c) => ({ href: `/catalog?category=${c.slug}`, label: c.name })),
    { href: "/contact", label: "კონტაქტი" },
  ];
}
