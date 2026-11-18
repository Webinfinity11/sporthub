import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import CatalogView from "@/components/CatalogView";
import PageTitle from "@/components/PageTitle";
import { getCategoryTree, getProducts } from "@/lib/queries";

export const metadata: Metadata = { title: "კატალოგი" };

// The title renders at once; the product grid streams in behind a Suspense
// boundary so navigating here stays instant.
export default function CatalogPage() {
  return (
    <>
      <PageTitle title="კატალოგი" />
      <Suspense fallback={<section className="catalog catalog-page section-padding" aria-busy="true" style={{ minHeight: "60vh" }} />}>
        <Catalog />
      </Suspense>
    </>
  );
}

async function Catalog() {
  await connection(); // DB data: render per request (no DB during the Railway build)
  const [products, tree] = await Promise.all([getProducts(), getCategoryTree()]);
  return <CatalogView products={products} tree={tree} />;
}
