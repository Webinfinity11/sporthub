import { connection } from "next/server";
import { Suspense } from "react";
import HeroSlider from "@/components/HeroSlider";
import ProductCarousel from "@/components/ProductCarousel";
import SaleProducts from "@/components/SaleProducts";
import CallCta from "@/components/CallCta";
import { CategoryBanners, WhyUs } from "@/components/Sections";
import { discountPercent } from "@/lib/data";
import { getCategories, getHeroSlides, getProducts } from "@/lib/queries";

// Static sections render at once; the DB-backed sections stream in behind
// Suspense boundaries so navigating here stays instant.
export default function Home() {
  return (
    <>
      <Suspense fallback={<div aria-busy="true" style={{ minHeight: "70vh" }} />}>
        <TopSections />
      </Suspense>
      <WhyUs />
      <Suspense fallback={null}>
        <CategoryCarousels />
      </Suspense>
      <CallCta />
    </>
  );
}

async function TopSections() {
  await connection(); // DB data: render per request (no DB during the Railway build)
  const [slides, categories, products] = await Promise.all([getHeroSlides(), getCategories(), getProducts()]);
  const top = categories.filter((c) => c.parentId === null);
  return (
    <>
      {slides.length > 0 && <HeroSlider slides={slides} />}
      <CategoryBanners categories={top.slice(0, 4)} />
      <SaleProducts products={products.filter((p) => discountPercent(p) > 0).slice(0, 8)} />
    </>
  );
}

async function CategoryCarousels() {
  await connection();
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);
  // homepage carousels: the first two top-level categories that have products
  const carousels = categories
    .filter((c) => c.parentId === null)
    .map((c) => ({ c, items: products.filter((p) => p.rootSlug === c.slug) }))
    .filter((x) => x.items.length > 0)
    .slice(0, 2);
  return carousels.map(({ c, items }, i) => (
    <ProductCarousel key={c.id} title={c.name} products={items} className={i > 0 ? "pt0" : ""} />
  ));
}
