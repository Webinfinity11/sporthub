"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { productKey, type Product } from "@/lib/data";

// Wishlist + cart kept in the visitor's browser (localStorage), no account needed.
// Will move to the database together with the admin panel / user accounts.

const EVENT = "sporthub:store-change";

function readRaw(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback; // storage blocked (private mode etc.)
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange); // other tabs
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function safeParse<T>(raw: string, check: (v: unknown) => v is T, fallback: T): T {
  try {
    const v = JSON.parse(raw);
    return check(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

const WISH_KEY = "sporthub:wishlist";
const CART_KEY = "sporthub:cart";

export type CartEntry = { id: string; qty: number };
export type CartLine = CartEntry & { product: Product; total: number };

const isIdList = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");
const isCart = (v: unknown): v is CartEntry[] =>
  Array.isArray(v) && v.every((x) => x && typeof x.id === "string" && Number.isInteger(x.qty) && x.qty > 0);

export const MAX_QTY = 20;

const readCart = () => safeParse(readRaw(CART_KEY, "[]"), isCart, []);

type Ctx = {
  /** all active products (from the server) */
  products: Product[];
  wishlist: string[];
  inWishlist: (id: string) => boolean;
  toggleWishlist: (id: string) => void;
  clearWishlist: () => void;
  cart: CartLine[];
  cartCount: number;
  cartSubtotal: number;
  addToCart: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
};

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ products, children }: { products: Product[]; children: React.ReactNode }) {
  // server render + first client render use empty lists, then the stored ones
  const wishRaw = useSyncExternalStore(subscribe, () => readRaw(WISH_KEY, "[]"), () => "[]");
  const cartRaw = useSyncExternalStore(subscribe, () => readRaw(CART_KEY, "[]"), () => "[]");

  const wishlist = useMemo(
    () => safeParse(wishRaw, isIdList, []).filter((id) => products.some((p) => productKey(p) === id)),
    [wishRaw, products],
  );

  const cart = useMemo<CartLine[]>(() => {
    return safeParse(cartRaw, isCart, []).flatMap((e) => {
      const product = products.find((p) => productKey(p) === e.id);
      return product ? [{ ...e, product, total: product.price * e.qty }] : [];
    });
  }, [cartRaw, products]);

  const toggleWishlist = useCallback((id: string) => {
    const cur = safeParse(readRaw(WISH_KEY, "[]"), isIdList, []);
    write(WISH_KEY, cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  }, []);

  const clearWishlist = useCallback(() => write(WISH_KEY, []), []);

  const addToCart = useCallback((id: string, qty = 1) => {
    const cur = readCart();
    const found = cur.find((e) => e.id === id);
    write(
      CART_KEY,
      found
        ? cur.map((e) => (e.id === id ? { ...e, qty: Math.min(MAX_QTY, e.qty + qty) } : e))
        : [...cur, { id, qty: Math.min(MAX_QTY, qty) }],
    );
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    const q = Math.max(1, Math.min(MAX_QTY, Math.round(qty)));
    write(
      CART_KEY,
      readCart().map((e) => (e.id === id ? { ...e, qty: q } : e)),
    );
  }, []);

  const removeFromCart = useCallback((id: string) => {
    write(
      CART_KEY,
      readCart().filter((e) => e.id !== id),
    );
  }, []);

  const clearCart = useCallback(() => write(CART_KEY, []), []);

  const value = useMemo<Ctx>(
    () => ({
      products,
      wishlist,
      inWishlist: (id) => wishlist.includes(id),
      toggleWishlist,
      clearWishlist,
      cart,
      cartCount: cart.reduce((s, l) => s + l.qty, 0),
      cartSubtotal: cart.reduce((s, l) => s + l.total, 0),
      addToCart,
      setQty,
      removeFromCart,
      clearCart,
    }),
    [products, wishlist, cart, toggleWishlist, clearWishlist, addToCart, setQty, removeFromCart, clearCart],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}

/** Heart toggle used on product cards and the product page. */
export function WishlistButton({ id, name, className = "" }: { id: string; name: string; className?: string }) {
  const { inWishlist, toggleWishlist } = useStore();
  const active = inWishlist(id);
  return (
    <button
      type="button"
      className={`wish-btn${active ? " active" : ""} ${className}`.trim()}
      aria-pressed={active}
      aria-label={active ? `${name}: სურვილების სიიდან წაშლა` : `${name}: სურვილების სიაში დამატება`}
      onClick={() => toggleWishlist(id)}
    >
      {active ? <FaHeart /> : <FaRegHeart />}
    </button>
  );
}
