import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { FaCalendarCheck, FaCheckCircle, FaShieldAlt, FaTimesCircle, FaTruck } from "react-icons/fa";
import BuyBox from "@/components/BuyBox";
import ProductCarousel from "@/components/ProductCarousel";
import ProductGallery from "@/components/ProductGallery";
import { categoryHref, delivery, discountPercent, formatPrice, productKey, telHref } from "@/lib/data";
import { getCategories, getProductBySlug, getProducts, getSiteSettings } from "@/lib/queries";

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const p = await getProductBySlug(decodeURIComponent(slug));
  return p ? { title: p.name, description: p.description.slice(0, 160) } : {};
}

// The product streams in behind a Suspense boundary so navigating here stays instant.
export default function ProductPage({ params }: PageProps<"/product/[slug]">) {
  return (
    <Suspense fallback={<section className="product-page" aria-busy="true" style={{ minHeight: "80vh" }} />}>
      <Product params={params} />
    </Suspense>
  );
}

async function Product({ params }: { params: PageProps<"/product/[slug]">["params"] }) {
  await connection(); // DB data: render per request (no DB during the Railway build)
  const { slug } = await params;
  const product = await getProductBySlug(decodeURIComponent(slug));
  if (!product) notFound();

  const [categories, products, settings] = await Promise.all([getCategories(), getProducts(), getSiteSettings()]);
  const phone = settings.phones[0];
  const cat = categories.find((c) => c.id === product.categoryId);
  const root = cat?.parentId ? categories.find((c) => c.id === cat.parentId) : undefined;
  const discount = discountPercent(product);
  const related = products.filter((p) => p.id !== product.id && p.rootSlug && p.rootSlug === product.rootSlug);
  const inStock = product.stock > 0;

  return (
    <>
      <section className="product-page">
        <div className="container">
          <nav className="crumbs" aria-label="breadcrumb">
            <Link href="/">მთავარი</Link>
            <span aria-hidden>/</span>
            <Link href="/catalog">კატალოგი</Link>
            {root && (
              <>
                <span aria-hidden>/</span>
                <Link href={categoryHref(root.slug)}>{root.name}</Link>
              </>
            )}
            {cat && (
              <>
                <span aria-hidden>/</span>
                <Link href={categoryHref(cat.slug)}>{cat.name}</Link>
              </>
            )}
          </nav>

          <div className="product-main">
            <ProductGallery images={product.images} name={product.name} discount={discount} />

            <div className="product-info">
              {cat && (
                <Link href={categoryHref(cat.slug)} className="product-cat">
                  {cat.name}
                </Link>
              )}
              <h1>{product.name}</h1>

              <div className="product-price">
                <span className="now">{formatPrice(product.price)}</span>
                {product.oldPrice && product.oldPrice > product.price && (
                  <>
                    <del>{formatPrice(product.oldPrice)}</del>
                    <span className="save">დაზოგავთ {formatPrice(product.oldPrice - product.price)}</span>
                  </>
                )}
              </div>

              {inStock ? (
                <p className="stock">
                  <FaCheckCircle /> მარაგშია
                </p>
              ) : (
                <p className="stock out">
                  <FaTimesCircle /> მარაგში არ არის
                </p>
              )}

              {product.description && <p className="product-desc">{product.description}</p>}

              {inStock && <BuyBox id={productKey(product)} name={product.name} />}

              <ul className="product-perks">
                <li>
                  <FaTruck />
                  <span>მიწოდება 1-3 დღეში, {delivery.freeFrom} ₾-დან უფასოდ</span>
                </li>
                <li>
                  <FaShieldAlt />
                  <span>ოფიციალური გარანტია</span>
                </li>
                <li>
                  <FaCalendarCheck />
                  <span>შესაძლებელია განვადებით</span>
                </li>
              </ul>

              {phone && (
                <p className="product-help">
                  კითხვა გაქვთ? დაგვირეკეთ: <a href={telHref(phone)}>{phone}</a>
                </p>
              )}
            </div>
          </div>

          {product.specs.length > 0 && (
            <div className="product-specs">
              <h2>მახასიათებლები</h2>
              <dl>
                {product.specs.map(([k, v], i) => (
                  <div key={`${k}-${i}`}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </section>

      {related.length > 0 && <ProductCarousel title="მსგავსი პროდუქტები" products={related} className="pt0" />}
    </>
  );
}
