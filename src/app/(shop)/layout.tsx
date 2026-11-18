import { connection } from "next/server";
import { Suspense } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ScrollToTop from "@/components/ScrollToTop";
import { SiteSettingsProvider } from "@/components/SiteSettings";
import { StoreProvider } from "@/components/Store";
import { buildNav } from "@/lib/data";
import { getCategories, getProducts, getSiteSettings } from "@/lib/queries";

// Storefront shell. Rendered per request (the database is not reachable during the
// Railway build); the DB reads themselves are cached and refreshed from the admin.
export default function ShopLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={null}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }: { children: React.ReactNode }) {
  await connection();
  const [categories, products, settings] = await Promise.all([getCategories(), getProducts(), getSiteSettings()]);
  const top = categories.filter((c) => c.parentId === null);
  return (
    <SiteSettingsProvider value={settings}>
      <StoreProvider products={products}>
        <Header nav={buildNav(top)} />
        {children}
        <Footer categories={top} settings={settings} />
        <ScrollToTop />
      </StoreProvider>
    </SiteSettingsProvider>
  );
}
