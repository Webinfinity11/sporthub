import "server-only";
import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db, categories as categoriesT, heroSlides, products as productsT, siteSettings } from "@/db";
import { defaultSiteSettings, type Category, type CategoryNode, type Product, type SiteSettings, type Slide } from "./data";

// Public storefront reads. Cached and invalidated from the admin with updateTag(...).
export const TAGS = { catalog: "catalog", hero: "hero", settings: "settings" } as const;

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheTag(TAGS.catalog);
  cacheLife("days");
  const rows = await db
    .select()
    .from(categoriesT)
    .orderBy(asc(categoriesT.sortOrder), asc(categoriesT.id));
  return rows
    .filter((c) => c.active)
    .map((c) => ({ id: c.id, slug: c.slug, name: c.name, image: c.image, parentId: c.parentId }));
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
  const all = await getCategories();
  return all
    .filter((c) => c.parentId === null)
    .map((c) => ({ ...c, children: all.filter((x) => x.parentId === c.id) }));
}

export async function getProducts(): Promise<Product[]> {
  "use cache";
  cacheTag(TAGS.catalog);
  cacheLife("days");
  const [rows, cats] = await Promise.all([
    db.select().from(productsT).orderBy(asc(productsT.sortOrder), asc(productsT.id)),
    getCategories(),
  ]);
  const byId = new Map(cats.map((c) => [c.id, c]));
  return rows
    .filter((p) => p.active)
    .map((p) => {
      const cat = p.categoryId ? byId.get(p.categoryId) : undefined;
      const root = cat?.parentId ? byId.get(cat.parentId) : cat;
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        image: p.images[0] ?? "/img/categories/cat-weights.webp",
        images: p.images,
        price: p.price,
        oldPrice: p.oldPrice,
        deliveryTbilisi: p.deliveryTbilisi,
        deliveryRegions: p.deliveryRegions,
        categoryId: p.categoryId,
        categorySlug: cat?.slug ?? null,
        rootSlug: root?.slug ?? null,
        description: p.description,
        specs: p.specs,
        stock: p.stock,
      };
    });
}

export async function getProductBySlug(slug: string) {
  return (await getProducts()).find((p) => p.slug === slug);
}

export async function getProductsInCategory(slug: string) {
  return (await getProducts()).filter((p) => p.rootSlug === slug || p.categorySlug === slug);
}

export async function getHeroSlides(): Promise<Slide[]> {
  "use cache";
  cacheTag(TAGS.hero);
  cacheLife("days");
  const rows = await db.select().from(heroSlides).orderBy(asc(heroSlides.sortOrder), asc(heroSlides.id));
  return rows
    .filter((s) => s.active)
    .map((s) => ({
      id: s.id,
      image: s.image,
      video: s.video,
      align: s.align,
      position: s.position,
      shade: s.shade,
      titleLines: s.titleLines,
      primaryCta: { label: s.primaryLabel, href: s.primaryHref },
      secondaryCta: { label: s.secondaryLabel, href: s.secondaryHref },
    }));
}

export async function getSiteSettings(): Promise<SiteSettings> {
  "use cache";
  cacheTag(TAGS.settings);
  cacheLife("days");
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1);
  if (!row) return defaultSiteSettings;
  return {
    phones: row.phones,
    addresses: row.addresses,
    email: row.email,
    hours: row.hours,
    facebook: row.facebook,
    instagram: row.instagram,
    tiktok: row.tiktok,
  };
}
