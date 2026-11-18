import Link from "next/link";
import { FaCaretRight } from "react-icons/fa";
import ProductCard from "./ProductCard";
import type { Product } from "@/lib/data";

// Homepage: 2 rows × 4 discounted products + link to the full sale list.
export default function SaleProducts({ products: items }: { products: Product[] }) {
  if (items.length === 0) return null;
  return (
    <section className="sale-products section-padding pt0">
      <div className="container">
        <div className="section-title text-left">
          <h1>
            <span>ფასდაკლებული პროდუქცია</span>
          </h1>
        </div>
        <div className="row">
          {items.map((p) => (
            <div className="col-md-3 col-sm-6" key={p.id}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
        <div className="sale-more">
          <Link href="/catalog?sale=1" className="thm-btn arrow-push-out-right">
            <span>
              ყველას ნახვა <FaCaretRight />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
