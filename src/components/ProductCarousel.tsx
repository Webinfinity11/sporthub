"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaAngleLeft, FaAngleRight } from "react-icons/fa";
import ProductCard from "./ProductCard";
import type { Product } from "@/lib/data";

function usePerView() {
  const [n, setN] = useState(4);
  useEffect(() => {
    // phones show two cards, same as the product grids
    const update = () => setN(window.innerWidth >= 992 ? 4 : window.innerWidth >= 768 ? 3 : 2);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return n;
}

export default function ProductCarousel({
  title,
  products,
  className = "",
}: {
  title: string;
  products: Product[];
  className?: string;
}) {
  const perView = usePerView();
  const count = products.length;
  // Triple the list so the track can loop seamlessly in both directions.
  const track = [...products, ...products, ...products];
  const [pos, setPos] = useState(count);
  const [animate, setAnimate] = useState(true);

  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  // Bumped on manual navigation so the autoplay timer restarts from zero.
  const [tick, setTick] = useState(0);

  const move = useCallback((dir: number) => {
    setAnimate(true);
    setPos((p) => p + dir);
  }, []);

  const go = (dir: number) => {
    move(dir);
    setTick((t) => t + 1);
  };

  const onTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    // Ignore transitions bubbling up from the cards (hover effects).
    if (e.target !== e.currentTarget) return;
    if (pos >= count * 2 || pos < count) {
      setAnimate(false);
      setPos(((pos - count) % count + count) % count + count);
    }
  };

  useEffect(() => {
    if (!animate) {
      const id = requestAnimationFrame(() => setAnimate(true));
      return () => cancelAnimationFrame(id);
    }
  }, [animate]);

  const itemPct = 100 / perView;
  // Same card width as the grids (4 per row). With too few products to scroll,
  // show them once, without arrows and without looping duplicates.
  const scrollable = count > perView;

  // Autoplay: one step every 4s, paused on hover/focus, in hidden tabs
  // (transitionend does not fire there) and for reduced-motion users.
  useEffect(() => {
    if (!scrollable || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (!document.hidden) move(1);
    }, 4000);
    return () => window.clearInterval(id);
  }, [scrollable, paused, tick, move]);
  const items = scrollable ? track : products;

  return (
    <section className={`section-padding ${className}`.trim()}>
      <div className="container">
        <div className="section-title text-left">
          <h1>
            <span>{title}</span>
          </h1>
        </div>
        <div
          className="product-carousel"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
          onTouchStart={(e) => {
            touchX.current = e.touches[0].clientX;
            setPaused(true);
          }}
          onTouchEnd={(e) => {
            setPaused(false);
            if (touchX.current === null || !scrollable) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          }}
        >
          <div className="owl-stage-outer">
            <div
              className="owl-stage"
              style={{
                transform: scrollable ? `translateX(-${pos * itemPct}%)` : "none",
                transition: animate ? "transform .5s ease" : "none",
              }}
              onTransitionEnd={onTransitionEnd}
            >
              {items.map((p, i) => (
                <div className="owl-item" key={`${p.id}-${i}`} style={{ flex: `0 0 ${itemPct}%` }}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
          {scrollable && (
            <div className="owl-nav">
              <button className="owl-prev" aria-label="წინა" onClick={() => go(-1)}>
                <FaAngleLeft />
              </button>
              <button className="owl-next" aria-label="შემდეგი" onClick={() => go(1)}>
                <FaAngleRight />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
