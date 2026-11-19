"use client";

import { useEffect } from "react";
import { useStore } from "./Store";

/** Empties the cart once mounted (after a confirmed card payment). */
export default function ClearCart() {
  const { clearCart } = useStore();
  useEffect(() => clearCart(), [clearCart]);
  return null;
}
