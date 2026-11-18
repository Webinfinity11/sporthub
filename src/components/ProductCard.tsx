/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { FaEye } from "react-icons/fa";
import CartButton from "./CartButton";
import { WishlistButton } from "./Store";
import { discountPercent, formatPrice, productHref, productKey, type Product } from "@/lib/data";

export default function ProductCard({ product }: { product: Product }) {
  const href = productHref(product);
  const discount = discountPercent(product);
  return (
    <div className="single-product-item">
      {discount > 0 && (
        <span className="discount-badge" aria-label={`ფასდაკლება ${discount}%`}>
          <span>{`-${discount}%`}</span>
        </span>
      )}
      <WishlistButton id={productKey(product)} name={product.name} className="card-wish" />
      <div className="img-holder">
        <Link href={href} tabIndex={-1} aria-hidden>
          <img src={product.image} alt="" />
        </Link>
        <div className="overlay">
          <div className="icon-holder">
            <ul>
              <li>
                <CartButton id={productKey(product)} name={product.name} />
              </li>
              <li>
                <Link href={href} aria-label={`${product.name}: დათვალიერება`}>
                  <FaEye />
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="title">
        <Link href={href}>
          <h3>{product.name}</h3>
        </Link>
        <h2>
          {product.oldPrice && <del className="before-rate">{formatPrice(product.oldPrice)}</del>}
          {formatPrice(product.price)}
        </h2>
      </div>
    </div>
  );
}
