"use client";

import { useEffect, useState } from "react";
import { FaCheck, FaShoppingCart } from "react-icons/fa";
import { useStore } from "./Store";

/** Adds a product to the cart and briefly confirms with a check mark. */
export default function CartButton({
  id,
  name,
  qty = 1,
  variant = "icon",
}: {
  id: string;
  name: string;
  qty?: number;
  variant?: "icon" | "full";
}) {
  const { addToCart } = useStore();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1600);
    return () => clearTimeout(t);
  }, [added]);

  const onClick = () => {
    addToCart(id, qty);
    setAdded(true);
  };

  if (variant === "full") {
    return (
      <button type="button" className={`thm-btn add-to-cart${added ? " added" : ""}`} onClick={onClick}>
        {added ? <FaCheck /> : <FaShoppingCart />}
        {added ? "დაემატა კალათაში" : "კალათაში დამატება"}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`cart-btn${added ? " added" : ""}`}
      aria-label={`${name}: კალათაში დამატება`}
      onClick={onClick}
    >
      {added ? <FaCheck /> : <FaShoppingCart />}
    </button>
  );
}
