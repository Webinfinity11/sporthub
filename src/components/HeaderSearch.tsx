"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import { formatPrice, matchesSearch, productHref, searchTerms } from "@/lib/data";
import { useStore } from "./Store";

const SHOWN = 6;

/**
 * Search panel that drops under the header. Results come from the products already
 * loaded in the browser, so they update on every keystroke without a request.
 * Enter opens the highlighted product, or the catalog filtered by the query.
 */
export default function HeaderSearch({ onClose }: { onClose: () => void }) {
  const { products } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  const terms = searchTerms(q);
  const found = terms.length ? products.filter((p) => matchesSearch(p, terms)) : [];
  const shown = found.slice(0, SHOWN);
  const catalogHref = `/catalog?q=${encodeURIComponent(q.trim())}`;

  useEffect(() => {
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <>
    <div className="hs-backdrop" aria-hidden onClick={onClose} />
    <div className="header-search" role="search">
      <div className="container">
        <form
          className="hs-bar"
          onSubmit={(e) => {
            e.preventDefault();
            if (active >= 0 && shown[active]) go(productHref(shown[active]));
            else if (terms.length) go(catalogHref);
          }}
        >
          <FaSearch className="hs-icon" aria-hidden />
          <input
            ref={input}
            type="search"
            value={q}
            placeholder="მოძებნეთ პროდუქტი"
            aria-label="პროდუქტის ძებნა"
            role="combobox"
            aria-expanded={shown.length > 0}
            aria-controls={listId}
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            autoComplete="off"
            enterKeyHint="search"
            onChange={(e) => {
              setQ(e.target.value);
              setActive(-1);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" && shown.length) {
                e.preventDefault();
                setActive((i) => (i + 1) % shown.length);
              } else if (e.key === "ArrowUp" && shown.length) {
                e.preventDefault();
                setActive((i) => (i <= 0 ? shown.length - 1 : i - 1));
              }
            }}
          />
          <button type="button" className="hs-close" aria-label="ძებნის დახურვა" onClick={onClose}>
            <FaTimes />
          </button>
        </form>

        {terms.length > 0 && (
          <div className="hs-results">
            {shown.length === 0 ? (
              <p className="hs-empty">„{q.trim()}“ ვერ მოიძებნა. სცადეთ სხვა სიტყვა.</p>
            ) : (
              <>
                <ul id={listId} role="listbox" aria-label="შედეგები">
                  {shown.map((p, i) => (
                    <li key={p.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                      <Link href={productHref(p)} className={i === active ? "is-active" : undefined} onClick={onClose} onMouseEnter={() => setActive(i)}>
                        <span className="hs-thumb">
                          <img src={p.image} alt="" />
                        </span>
                        <span className="hs-name">{p.name}</span>
                        <span className="hs-price">
                          {p.oldPrice && <s>{formatPrice(p.oldPrice)}</s>}
                          {formatPrice(p.price)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href={catalogHref} className="hs-all" onClick={onClose}>
                  ყველა შედეგის ნახვა ({found.length})
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
