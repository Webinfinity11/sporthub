"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaMinus, FaPlus } from "react-icons/fa";
import CartButton from "./CartButton";
import { MAX_QTY, useStore, WishlistButton } from "./Store";

export function QtyStepper({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <div className="qty" role="group" aria-label={label}>
      <button type="button" aria-label="შემცირება" disabled={value <= 1} onClick={() => onChange(value - 1)}>
        <FaMinus />
      </button>
      <span aria-live="polite">{value}</span>
      <button type="button" aria-label="გაზრდა" disabled={value >= MAX_QTY} onClick={() => onChange(value + 1)}>
        <FaPlus />
      </button>
    </div>
  );
}

/** Quantity + add to cart + buy now + wishlist, on the product page. */
export default function BuyBox({ id, name }: { id: string; name: string }) {
  const [qty, setQty] = useState(1);
  const { addToCart } = useStore();
  const router = useRouter();

  return (
    <div className="buy-box">
      <div className="buy-row">
        <QtyStepper value={qty} onChange={setQty} label="რაოდენობა" />
        <CartButton id={id} name={name} qty={qty} variant="full" />
        <WishlistButton id={id} name={name} className="buy-wish" />
      </div>
      <button
        type="button"
        className="buy-now"
        onClick={() => {
          addToCart(id, qty);
          router.push("/checkout");
        }}
      >
        ახლავე ყიდვა
      </button>
    </div>
  );
}
