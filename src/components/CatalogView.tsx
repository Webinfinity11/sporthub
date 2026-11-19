"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FaAngleDown, FaAngleLeft, FaAngleRight, FaSlidersH, FaTimes } from "react-icons/fa";
import ProductCard from "./ProductCard";
import { discountPercent, matchesSearch, searchTerms, type CategoryNode, type Product } from "@/lib/data";

const PER_PAGE = 20;

const SORTS = [
  { id: "", label: "რეკომენდებული" },
  { id: "price-asc", label: "ფასი: ზრდადობით" },
  { id: "price-desc", label: "ფასი: კლებადობით" },
  { id: "discount", label: "ყველაზე დიდი ფასდაკლება" },
] as const;

type Bounds = { min: number; max: number };

/** Page numbers with ellipses: 1 … 4 5 6 … 12 */
function pageList(current: number, total: number): (number | "gap")[] {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const list = [...pages].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  list.forEach((n, i) => {
    if (i > 0 && n - list[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

/** Dual-thumb price slider + number inputs. Commits to the URL shortly after the user stops. */
function PriceFilter({
  min,
  max,
  bounds,
  onCommit,
}: {
  min: number;
  max: number;
  bounds: Bounds;
  onCommit: (min: number, max: number) => void;
}) {
  const PRICE_MIN = bounds.min;
  const PRICE_MAX = bounds.max;
  const [lo, setLo] = useState(min);
  const [hi, setHi] = useState(max);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => onCommit(lo, hi), 450);
    return () => clearTimeout(t);
  }, [lo, hi, onCommit]);

  const pct = (v: number) => ((v - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;

  return (
    <div className="price-filter">
      <div className="range" style={{ "--lo": `${pct(lo)}%`, "--hi": `${pct(hi)}%` } as React.CSSProperties}>
        <input
          type="range"
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={10}
          value={lo}
          aria-label="მინიმალური ფასი"
          onChange={(e) => setLo(Math.min(Number(e.target.value), hi - 10))}
        />
        <input
          type="range"
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={10}
          value={hi}
          aria-label="მაქსიმალური ფასი"
          onChange={(e) => setHi(Math.max(Number(e.target.value), lo + 10))}
        />
      </div>
      <div className="price-inputs">
        <label>
          <span>დან</span>
          <input
            type="number"
            inputMode="numeric"
            min={PRICE_MIN}
            max={hi}
            value={lo}
            onChange={(e) => setLo(Math.max(PRICE_MIN, Math.min(Number(e.target.value) || PRICE_MIN, hi)))}
          />
        </label>
        <span className="dash" aria-hidden>
          -
        </span>
        <label>
          <span>მდე</span>
          <input
            type="number"
            inputMode="numeric"
            min={lo}
            max={PRICE_MAX}
            value={hi}
            onChange={(e) => setHi(Math.min(PRICE_MAX, Math.max(Number(e.target.value) || PRICE_MAX, lo)))}
          />
        </label>
        <span className="cur">₾</span>
      </div>
    </div>
  );
}

export default function CatalogView({ products, tree }: { products: Product[]; tree: CategoryNode[] }) {
  // overall price bounds, rounded to friendly steps
  const PRICE_MIN = products.length ? Math.floor(Math.min(...products.map((p) => p.price)) / 10) * 10 : 0;
  const PRICE_MAX = products.length ? Math.max(PRICE_MIN + 10, Math.ceil(Math.max(...products.map((p) => p.price)) / 100) * 100) : 100;
  const bounds = { min: PRICE_MIN, max: PRICE_MAX };
  const allSlugs = tree.flatMap((c) => [c.slug, ...c.children.map((x) => x.slug)]);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [panelOpen, setPanelOpen] = useState(false);
  // parent categories whose subcategory dropdown the user opened or closed by hand
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // read filters from the URL
  const selected = (params.get("category") ?? "")
    .split(",")
    .filter((s) => allSlugs.includes(s));
  const sale = params.get("sale") === "1";
  const q = (params.get("q") ?? "").trim();
  const terms = searchTerms(q);
  const sortParam = params.get("sort") ?? "";
  const sort = SORTS.some((s) => s.id === sortParam) ? sortParam : "";
  const minP = Math.max(PRICE_MIN, Number(params.get("min")) || PRICE_MIN);
  const maxP = Math.min(PRICE_MAX, Number(params.get("max")) || PRICE_MAX);

  const update = useMemo(
    () => (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(changes)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      next.delete("page"); // any filter change returns to page 1
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const commitPrice = useMemo(
    () => (lo: number, hi: number) =>
      update({ min: lo > PRICE_MIN ? String(lo) : null, max: hi < PRICE_MAX ? String(hi) : null }),
    [update, PRICE_MIN, PRICE_MAX],
  );

  const clearAll = () => router.replace(pathname, { scroll: false });

  const toggleCategory = (slug: string) => {
    const next = selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug];
    update({ category: next.join(",") || null });
  };

  // filter + sort
  const items = products
    .filter(
      (p) =>
        (selected.length === 0 ||
          selected.some((slug) => p.categorySlug === slug || p.rootSlug === slug)) &&
        (!sale || discountPercent(p) > 0) &&
        p.price >= minP &&
        p.price <= maxP &&
        matchesSearch(p, terms),
    )
    .sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "discount") return discountPercent(b) - discountPercent(a);
      return 0;
    });

  const totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const page = Math.min(totalPages, Math.max(1, Number(params.get("page")) || 1));
  const pageItems = items.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const pageHref = (n: number) => {
    const next = new URLSearchParams(params.toString());
    if (n === 1) next.delete("page");
    else next.set("page", String(n));
    const qs = next.toString();
    return qs ? `/catalog?${qs}` : "/catalog";
  };

  const priceActive = minP > PRICE_MIN || maxP < PRICE_MAX;
  const activeCount = selected.length + (sale ? 1 : 0) + (priceActive ? 1 : 0);
  const countIn = (slug: string) =>
    products.filter((p) => p.categorySlug === slug || p.rootSlug === slug).length;

  return (
    <section className="catalog catalog-page section-padding">
      <div className="container">
        <div className="catalog-layout">
          {/* filters */}
          <aside className={`filters${panelOpen ? " open" : ""}`} aria-label="ფილტრები">
            <div className="filters-head">
              <h2>ფილტრები</h2>
              <button type="button" className="filters-close" aria-label="დახურვა" onClick={() => setPanelOpen(false)}>
                <FaTimes />
              </button>
            </div>

            <div className="filter-group">
              <h3>კატეგორია</h3>
              <ul className="check-list">
                {tree.map((c) => {
                  const hasSub = c.children.length > 0;
                  // open by default when a subcategory is already selected
                  const isOpen = expanded[c.slug] ?? c.children.some((x) => selected.includes(x.slug));
                  return (
                    <li key={c.slug} className={hasSub ? `has-sub${isOpen ? " open" : ""}` : undefined}>
                      <div className="check-row">
                        <label className="check">
                          <input
                            type="checkbox"
                            checked={selected.includes(c.slug)}
                            onChange={() => toggleCategory(c.slug)}
                          />
                          <span className="box" aria-hidden />
                          <span className="label">{c.name}</span>
                          <span className="count">{countIn(c.slug)}</span>
                        </label>
                        {hasSub && (
                          <button
                            type="button"
                            className="sub-toggle"
                            aria-expanded={isOpen}
                            aria-controls={`sub-${c.slug}`}
                            aria-label={`${c.name}: ქვეკატეგორიები`}
                            onClick={() => setExpanded((e) => ({ ...e, [c.slug]: !isOpen }))}
                          >
                            <FaAngleDown />
                          </button>
                        )}
                      </div>
                      {hasSub && (
                        <div className="sub-wrap" id={`sub-${c.slug}`} inert={!isOpen}>
                          <ul className="check-list sub">
                            {c.children.map((sub) => (
                              <li key={sub.slug}>
                                <label className="check">
                                  <input
                                    type="checkbox"
                                    checked={selected.includes(sub.slug)}
                                    onChange={() => toggleCategory(sub.slug)}
                                  />
                                  <span className="box" aria-hidden />
                                  <span className="label">{sub.name}</span>
                                  <span className="count">{countIn(sub.slug)}</span>
                                </label>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="filter-group">
              <h3>ფასი</h3>
              <PriceFilter key={`${minP}-${maxP}`} min={minP} max={maxP} bounds={bounds} onCommit={commitPrice} />
            </div>

            <div className="filter-group">
              <h3>შეთავაზებები</h3>
              <label className="switch">
                <input type="checkbox" checked={sale} onChange={() => update({ sale: sale ? null : "1" })} />
                <span className="track" aria-hidden />
                <span>მხოლოდ ფასდაკლებული</span>
              </label>
            </div>

            {activeCount > 0 && (
              <button type="button" className="filters-reset" onClick={clearAll}>
                ფილტრების გასუფთავება
              </button>
            )}

            <button type="button" className="thm-btn filters-apply" onClick={() => setPanelOpen(false)}>
              ნახვა ({items.length})
            </button>
          </aside>
          {panelOpen && <div className="filters-backdrop" onClick={() => setPanelOpen(false)} aria-hidden />}

          {/* results */}
          <div className="catalog-results">
            <div className="results-bar">
              <button type="button" className="filters-toggle" onClick={() => setPanelOpen(true)}>
                <FaSlidersH /> ფილტრები{activeCount > 0 ? ` (${activeCount})` : ""}
              </button>
              <p className="results-count">
                {q ? `„${params.get("q")}“: ` : ""}
                <strong>{items.length}</strong> პროდუქტი
              </p>
              <label className="sort">
                <span>დალაგება</span>
                <select value={sort} onChange={(e) => update({ sort: e.target.value || null })}>
                  {SORTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {items.length > 0 ? (
              <div className="row">
                {pageItems.map((p) => (
                  <div className="col-md-4 col-sm-6" key={p.id}>
                    <ProductCard product={p} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="catalog-empty">
                <h2>პროდუქტი ვერ მოიძებნა</h2>
                <p>შეცვალეთ ან გაასუფთავეთ ფილტრები.</p>
                <button type="button" className="thm-btn" onClick={clearAll}>
                  ფილტრების გასუფთავება
                </button>
              </div>
            )}

            {items.length > 0 && totalPages > 1 && (
              <nav className="pagination" aria-label="გვერდები">
                {page > 1 ? (
                  <Link href={pageHref(page - 1)} className="page-arrow" aria-label="წინა გვერდი">
                    <FaAngleLeft />
                  </Link>
                ) : (
                  <span className="page-arrow disabled" aria-hidden>
                    <FaAngleLeft />
                  </span>
                )}
                {pageList(page, totalPages).map((n, i) =>
                  n === "gap" ? (
                    <span key={`gap-${i}`} className="page-gap">
                      …
                    </span>
                  ) : (
                    <Link
                      key={n}
                      href={pageHref(n)}
                      className={n === page ? "page-num active" : "page-num"}
                      aria-current={n === page ? "page" : undefined}
                    >
                      {n}
                    </Link>
                  ),
                )}
                {page < totalPages ? (
                  <Link href={pageHref(page + 1)} className="page-arrow" aria-label="შემდეგი გვერდი">
                    <FaAngleRight />
                  </Link>
                ) : (
                  <span className="page-arrow disabled" aria-hidden>
                    <FaAngleRight />
                  </span>
                )}
              </nav>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
