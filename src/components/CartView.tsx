"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { FaShoppingBag, FaTimes } from "react-icons/fa";
import { QtyStepper } from "./BuyBox";
import { useStore } from "./Store";
import { deliveryCost, formatPrice, productHref, shipText } from "@/lib/data";

export function OrderSummary({ children }: { children?: React.ReactNode }) {
  const { cart, cartSubtotal, cartCount } = useStore();
  const items = cart.map((l) => l.product);
  return (
    <aside className="order-summary">
      <h2>შეკვეთის ჯამი</h2>
      <dl>
        <div>
          <dt>პროდუქტები ({cartCount})</dt>
          <dd>{formatPrice(cartSubtotal)}</dd>
        </div>
        <div>
          <dt>მიწოდება თბილისში</dt>
          <dd>{shipText(deliveryCost(items, "tbilisi"))}</dd>
        </div>
        <div>
          <dt>მიწოდება თბილისის გარეთ</dt>
          <dd>{shipText(deliveryCost(items, "regions"))}</dd>
        </div>
        <div className="total">
          <dt>სულ, მიწოდების გარეშე</dt>
          <dd>{formatPrice(cartSubtotal)}</dd>
        </div>
      </dl>
      <p className="free-hint">მიწოდების ფასი დაემატება შეკვეთის გაფორმებისას, მიწოდების ზონის არჩევის შემდეგ.</p>
      {children}
    </aside>
  );
}

export default function CartView() {
  const { cart, setQty, removeFromCart } = useStore();

  if (cart.length === 0) {
    return (
      <section className="catalog section-padding">
        <div className="container">
          <div className="catalog-empty">
            <FaShoppingBag className="empty-icon" />
            <h2>კალათა ცარიელია</h2>
            <p>დაამატეთ პროდუქტები კატალოგიდან.</p>
            <Link href="/catalog" className="thm-btn">
              კატალოგი
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="cart-page section-padding">
      <div className="container">
        <div className="cart-layout">
          <ul className="cart-lines">
            {cart.map((l) => (
              <li key={l.id}>
                <Link href={productHref(l.product)} className="cart-thumb" tabIndex={-1} aria-hidden>
                  <img src={l.product.image} alt="" />
                </Link>
                <div className="cart-name">
                  <Link href={productHref(l.product)}>{l.product.name}</Link>
                  <span>{formatPrice(l.product.price)}</span>
                </div>
                <QtyStepper value={l.qty} onChange={(n) => setQty(l.id, n)} label={`${l.product.name}: რაოდენობა`} />
                <strong className="cart-total">{formatPrice(l.total)}</strong>
                <button
                  type="button"
                  className="cart-remove"
                  aria-label={`${l.product.name}: წაშლა`}
                  onClick={() => removeFromCart(l.id)}
                >
                  <FaTimes />
                </button>
              </li>
            ))}
          </ul>
          <OrderSummary>
            <Link href="/checkout" className="thm-btn summary-cta">
              შეკვეთის გაფორმება
            </Link>
            <Link href="/catalog" className="summary-back">
              ყიდვის გაგრძელება
            </Link>
          </OrderSummary>
        </div>
      </div>
    </section>
  );
}
