"use client";

import Link from "next/link";
import { useState } from "react";
import { FaCheck, FaRegHeart, FaShoppingCart, FaTrashAlt } from "react-icons/fa";
import ProductCard from "./ProductCard";
import { useStore } from "./Store";
import { formatPrice, productKey } from "@/lib/data";

export default function WishlistView() {
  const { products, wishlist, addToCart, clearWishlist } = useStore();
  const [allAdded, setAllAdded] = useState(false);
  const items = products.filter((p) => wishlist.includes(productKey(p)));
  const total = items.reduce((s, p) => s + p.price, 0);

  if (items.length === 0) {
    return (
      <section className="catalog section-padding">
        <div className="container">
          <div className="catalog-empty">
            <FaRegHeart className="empty-icon" />
            <h2>სურვილების სია ცარიელია</h2>
            <p>პროდუქტის ბარათზე გულს დააჭირეთ და ის აქ შეინახება.</p>
            <Link href="/catalog" className="thm-btn">
              კატალოგი
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="catalog section-padding">
      <div className="container">
        <div className="list-toolbar">
          <p className="list-summary">
            <strong>{items.length} პროდუქტი</strong>
            <span>ჯამური ღირებულება: {formatPrice(total)}</span>
          </p>
          <div className="list-actions">
            <button type="button" className="text-btn" onClick={clearWishlist}>
              <FaTrashAlt /> სიის გასუფთავება
            </button>
            <button
              type="button"
              className="thm-btn"
              onClick={() => {
                items.forEach((p) => addToCart(productKey(p)));
                setAllAdded(true);
              }}
            >
              {allAdded ? <FaCheck /> : <FaShoppingCart />}
              {allAdded ? "დაემატა კალათაში" : "ყველას კალათაში დამატება"}
            </button>
          </div>
        </div>
        <div className="row">
          {items.map((p) => (
            <div className="col-md-3 col-sm-6" key={p.id}>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
