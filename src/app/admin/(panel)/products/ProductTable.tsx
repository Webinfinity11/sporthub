"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState, useTransition } from "react";
import { MdDragIndicator } from "react-icons/md";
import { reorderProducts } from "@/app/admin/actions";
import { discountPercent, formatPrice } from "@/lib/data";
import ProductActiveSwitch from "./ProductActiveSwitch";

export type ProductRow = {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  categoryName: string;
  price: number;
  oldPrice: number | null;
  stock: number;
  active: boolean;
};

function moveItem<T>(list: T[], from: number, to: number) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function ProductTable({ rows }: { rows: ProductRow[] }) {
  const [items, setItems] = useState(rows);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  // Server data changed (filter, save elsewhere): start again from it.
  const [source, setSource] = useState(rows);
  if (source !== rows) {
    setSource(rows);
    setItems(rows);
  }

  const commit = (next: ProductRow[]) => {
    const prev = items;
    setItems(next);
    setError(false);
    start(async () => {
      try {
        await reorderProducts(next.map((p) => p.id));
      } catch {
        setItems(prev);
        setError(true);
      }
    });
  };

  const dropOn = (targetId: number) => {
    if (dragId === null || dragId === targetId) return;
    const from = items.findIndex((p) => p.id === dragId);
    const to = items.findIndex((p) => p.id === targetId);
    if (from < 0 || to < 0) return;
    commit(moveItem(items, from, to));
  };

  const onHandleKey = (e: React.KeyboardEvent, index: number) => {
    const dir = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
    const to = index + dir;
    if (!dir || to < 0 || to >= items.length) return;
    e.preventDefault();
    commit(moveItem(items, index, to));
    // Keep focus on the moved row's handle.
    requestAnimationFrame(() =>
      document.querySelector<HTMLButtonElement>(`[data-handle="${items[index].id}"]`)?.focus(),
    );
  };

  return (
    <>
      {error && <p className="adm-reorder-error">რიგი ვერ შეინახა, სცადეთ თავიდან.</p>}
      <table className={`adm-table products${pending ? " is-saving" : ""}`}>
        <thead>
          <tr>
            <th className="drag" aria-label="რიგი" />
            <th colSpan={2}>პროდუქტი</th>
            <th>კატეგორია</th>
            <th className="num">ფასი</th>
            <th className="num">მარაგი</th>
            <th>საიტზე</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p, i) => {
            const d = discountPercent(p);
            const cls = [
              p.active ? "" : "is-muted",
              dragId === p.id ? "is-dragging" : "",
              overId === p.id && dragId !== null && dragId !== p.id
                ? items.findIndex((x) => x.id === dragId) < i
                  ? "is-drop-below"
                  : "is-drop"
                : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <tr
                key={p.id}
                className={cls || undefined}
                onDragOver={(e) => {
                  if (dragId === null) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (overId !== p.id) setOverId(p.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  dropOn(p.id);
                  setDragId(null);
                  setOverId(null);
                }}
              >
                <td className="drag">
                  <button
                    type="button"
                    className="adm-drag-handle"
                    data-handle={p.id}
                    draggable
                    aria-label={`${p.name}: გადაადგილება (ისრებით ზემოთ ან ქვემოთ)`}
                    title="გადაათრიეთ რიგის შესაცვლელად"
                    onDragStart={(e) => {
                      setDragId(p.id);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", String(p.id));
                      const row = (e.currentTarget as HTMLElement).closest("tr");
                      if (row) e.dataTransfer.setDragImage(row, 20, 20);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverId(null);
                    }}
                    onKeyDown={(e) => onHandleKey(e, i)}
                  >
                    <MdDragIndicator aria-hidden />
                  </button>
                </td>
                <td className="thumb">
                  <img src={p.image ?? "/img/categories/cat-weights.webp"} alt="" />
                </td>
                <td>
                  <Link href={`/admin/products/${p.id}`} className="adm-strong-link">
                    {p.name}
                  </Link>
                  <span className="adm-cell-sub">/{p.slug}</span>
                </td>
                <td className="adm-muted">{p.categoryName}</td>
                <td className="num">
                  <span className="adm-cell-main">{formatPrice(p.price)}</span>
                  {d > 0 && (
                    <span className="adm-cell-sub">
                      <del>{formatPrice(p.oldPrice!)}</del> <span className="adm-off">-{d}%</span>
                    </span>
                  )}
                </td>
                <td className="num">
                  <span className={`adm-stock${p.stock === 0 ? " zero" : p.stock <= 3 ? " low" : ""}`}>{p.stock}</span>
                </td>
                <td>
                  <ProductActiveSwitch id={p.id} active={p.active} name={p.name} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
