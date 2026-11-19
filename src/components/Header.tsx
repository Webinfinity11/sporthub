"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { FaCaretRight, FaRegHeart, FaSearch, FaTimesCircle } from "react-icons/fa";
import { HiOutlineShoppingBag } from "react-icons/hi";
import { formatPrice, productHref, type NavItem } from "@/lib/data";
import HeaderSearch from "./HeaderSearch";
import { useStore } from "./Store";

export default function Header({ nav }: { nav: NavItem[] }) {
  const [sticky, setSticky] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSub, setOpenSub] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [height, setHeight] = useState(0);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  const [searchOpen, setSearchOpen] = useState(false);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const openSearch = () => {
    setMobileOpen(false);
    setSearchOpen(true);
  };

  // close the mobile menu and the search after navigating
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileOpen(false);
    setOpenSub(null);
    setSearchOpen(false);
  }

  useEffect(() => {
    const onScroll = () => {
      if (!headerRef.current) return;
      if (!sticky) setHeight(headerRef.current.offsetHeight);
      setSticky(window.scrollY > 100);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sticky]);

  const store = useStore();

  return (
    <>
      <header
        ref={headerRef}
        className={`header header-v5${sticky ? " stricky-fixed" : ""}${mobileOpen ? " mobile-open" : ""}`}
      >
        <div className="container">
          <nav className="navigation">
            <Link href="/" className="brand" aria-label="მთავარი">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo-on-dark.png" alt="SportHub" width={247} height={56} />
            </Link>

            <button type="button" className="search-toggle" aria-label="ძებნა" aria-expanded={searchOpen} onClick={openSearch}>
              <FaSearch />
            </button>

            <button
              className="menu-toggle"
              aria-label="მენიუ"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>

            <ul className="main-menu">
              {nav.map((item) => {
                const hasSub = !!item.dropdown;
                return (
                  <li
                    key={item.label}
                    className={[
                      openSub === item.label ? "sub-open" : "",
                      (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)) ? "current" : "",
                    ]
                      .filter(Boolean)
                      .join(" ") || undefined}
                  >
                    <Link href={item.href} className="flip-flop-btn">
                      <span data-hover={item.label}>{item.label}</span>
                    </Link>
                    {hasSub && (
                      <button
                        className="sub-indicator"
                        aria-label={`${item.label}: ქვემენიუ`}
                        onClick={() => setOpenSub(openSub === item.label ? null : item.label)}
                      >
                        <em />
                      </button>
                    )}
                    {item.dropdown && (
                      <ul className="dropdown">
                        {item.dropdown.map((d) => (
                          <li key={d.label}>
                            <Link href={d.href}>{d.label}</Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}

              <li className="search-link">
                <button type="button" aria-label="ძებნა" aria-expanded={searchOpen} onClick={openSearch}>
                  <span className="cart-icon">
                    <FaSearch />
                  </span>
                </button>
              </li>

              <li className="wishlist-link">
                <Link href="/wishlist" aria-label={`სურვილების სია (${store.wishlist.length})`}>
                  <span className="cart-icon">
                    <FaRegHeart />
                  </span>
                  {store.wishlist.length > 0 && <span className="cart-item">{store.wishlist.length}</span>}
                  <span className="text">სურვილები ({store.wishlist.length})</span>
                </Link>
              </li>

              <li className="shopping-cart">
                <Link href="/cart" aria-label={`კალათა (${store.cartCount})`}>
                  <span className="cart-icon">
                    <HiOutlineShoppingBag />
                  </span>
                  {store.cartCount > 0 && <span className="cart-item">{store.cartCount}</span>}
                  <span className="text">კალათა ({store.cartCount})</span>
                </Link>
                <div className="megamenu shopping-cart-box">
                  {store.cart.length === 0 ? (
                    <p className="header-cart-empty">კალათა ცარიელია</p>
                  ) : (
                    <ul className="header-cart-box">
                      {store.cart.slice(0, 4).map((l) => (
                        <li key={l.id}>
                          <div className="img-box">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={l.product.image} alt="" />
                          </div>
                          <div className="text-box">
                            <Link href={productHref(l.product)}>
                              <h3>{l.product.name}</h3>
                            </Link>
                            <span className="price">
                              {l.qty} x {formatPrice(l.product.price)}
                            </span>
                            <button
                              className="remove-box"
                              aria-label={`${l.product.name}: წაშლა`}
                              onClick={() => store.removeFromCart(l.id)}
                            >
                              <FaTimesCircle />
                            </button>
                          </div>
                        </li>
                      ))}
                      {store.cart.length > 4 && (
                        <li className="cart-more">და კიდევ {store.cart.length - 4} პროდუქტი</li>
                      )}
                      <li className="cart-bottom">
                        <div className="total-text">
                          <span>სულ: {formatPrice(store.cartSubtotal)}</span>
                        </div>
                        <div className="checkout-btn">
                          <Link href="/cart" className="ghost">
                            კალათა
                          </Link>
                          <Link href="/checkout">
                            შეკვეთა <FaCaretRight />
                          </Link>
                        </div>
                      </li>
                    </ul>
                  )}
                </div>
              </li>
            </ul>
          </nav>
        </div>
        {/* mounted only while open, so every search starts empty */}
        {searchOpen && <HeaderSearch onClose={closeSearch} />}

      </header>
      {sticky && <div style={{ height }} aria-hidden />}
    </>
  );
}
