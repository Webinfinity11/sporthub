"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useState, useTransition } from "react";
import { FaPen, FaPlus } from "react-icons/fa";
import { MdDragIndicator } from "react-icons/md";
import { reorderCategories } from "@/app/admin/actions";

export type CategoryItem = {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  active: boolean;
  count: number;
  children: CategoryItem[];
};

type Drag = { id: number; parentId: number | null };

function moveItem<T>(list: T[], from: number, to: number) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function CategoryList({ tree, editId }: { tree: CategoryItem[]; editId: number | "new" | null }) {
  const [items, setItems] = useState(tree);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [overId, setOverId] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  // Server data changed (save, delete): start again from it.
  const [source, setSource] = useState(tree);
  if (source !== tree) {
    setSource(tree);
    setItems(tree);
  }

  const siblingsOf = (parentId: number | null) =>
    parentId === null ? items : (items.find((c) => c.id === parentId)?.children ?? []);

  const reorder = (parentId: number | null, from: number, to: number, focusId?: number) => {
    const siblings = siblingsOf(parentId);
    if (from === to || from < 0 || to < 0 || to >= siblings.length) return;
    const moved = moveItem(siblings, from, to);
    const next = parentId === null ? moved : items.map((c) => (c.id === parentId ? { ...c, children: moved } : c));
    const prev = items;
    setItems(next);
    setError(false);
    start(async () => {
      try {
        await reorderCategories(parentId, moved.map((c) => c.id));
      } catch {
        setItems(prev);
        setError(true);
      }
    });
    if (focusId !== undefined) {
      requestAnimationFrame(() =>
        document.querySelector<HTMLButtonElement>(`[data-cat-handle="${focusId}"]`)?.focus(),
      );
    }
  };

  const row = (c: CategoryItem, parentId: number | null, index: number) => {
    const sub = parentId !== null;
    const siblings = siblingsOf(parentId);
    const sameGroup = drag !== null && drag.parentId === parentId;
    const fromIndex = sameGroup ? siblings.findIndex((s) => s.id === drag.id) : -1;
    const cls = [
      "adm-cat",
      sub ? "sub" : "",
      c.active ? "" : "is-muted",
      editId === c.id ? "editing" : "",
      sub && drag?.id === c.id ? "is-dragging" : "",
      sub && sameGroup && overId === c.id && drag.id !== c.id ? (fromIndex < index ? "is-drop-below" : "is-drop") : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <li
        key={c.id}
        className={cls}
        onDragOver={(e) => {
          if (!sub || !sameGroup) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "move";
          if (overId !== c.id) setOverId(c.id);
        }}
        onDrop={(e) => {
          if (!sub || !sameGroup) return;
          e.preventDefault();
          e.stopPropagation();
          reorder(parentId, fromIndex, index);
          setDrag(null);
          setOverId(null);
        }}
      >
        <button
          type="button"
          className="adm-drag-handle"
          data-cat-handle={c.id}
          draggable
          aria-label={`${c.name}: გადაადგილება (ისრებით ზემოთ ან ქვემოთ)`}
          title={sub ? "გადაათრიეთ ქვეკატეგორიის რიგის შესაცვლელად" : "გადაათრიეთ კატეგორიის რიგის შესაცვლელად"}
          onDragStart={(e) => {
            e.stopPropagation();
            setDrag({ id: c.id, parentId });
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", String(c.id));
            // A main category is dragged together with its subcategories.
            const li = (e.currentTarget as HTMLElement).closest(sub ? "li" : ".adm-cat-group");
            if (li) e.dataTransfer.setDragImage(li, 20, 20);
          }}
          onDragEnd={() => {
            setDrag(null);
            setOverId(null);
          }}
          onKeyDown={(e) => {
            const dir = e.key === "ArrowUp" ? -1 : e.key === "ArrowDown" ? 1 : 0;
            if (!dir) return;
            e.preventDefault();
            reorder(parentId, index, index + dir, c.id);
          }}
        >
          <MdDragIndicator aria-hidden />
        </button>
        <span className="adm-cat-img">{c.image ? <img src={c.image} alt="" /> : null}</span>
        <span className="adm-cat-name">
          <strong>{c.name}</strong>
          <span className="adm-cell-sub">
            /{c.slug}
            {!c.active && " · დამალული"}
          </span>
        </span>
        <span className="adm-cat-count">{c.count} პროდ.</span>
        <span className="adm-cat-actions">
          {!sub && (
            <Link
              href={`/admin/categories?edit=new&parent=${c.id}`}
              className="adm-icon-btn"
              aria-label={`${c.name}: ქვეკატეგორიის დამატება`}
              title="ქვეკატეგორია"
            >
              <FaPlus />
            </Link>
          )}
          <Link href={`/admin/categories?edit=${c.id}`} className="adm-icon-btn" aria-label={`${c.name}: რედაქტირება`} title="რედაქტირება">
            <FaPen />
          </Link>
        </span>
      </li>
    );
  };

  return (
    <>
      {error && <p className="adm-reorder-error">რიგი ვერ შეინახა, სცადეთ თავიდან.</p>}
      <ul className={`adm-cat-list${pending ? " is-saving" : ""}`}>
        {items.map((c, i) => {
          const topDrag = drag !== null && drag.parentId === null;
          const from = topDrag ? items.findIndex((x) => x.id === drag.id) : -1;
          const drop = topDrag && overId === c.id && drag.id !== c.id ? (from < i ? " is-drop-below" : " is-drop") : "";
          return (
          <li
            key={c.id}
            className={`adm-cat-group${drag?.id === c.id ? " is-dragging" : ""}${drop}`}
            onDragOver={(e) => {
              if (!topDrag) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (overId !== c.id) setOverId(c.id);
            }}
            onDrop={(e) => {
              if (!topDrag) return;
              e.preventDefault();
              reorder(null, from, i);
              setDrag(null);
              setOverId(null);
            }}
          >
            <ul className="adm-cat-list">
              {row(c, null, i)}
              {c.children.map((s, j) => row(s, c.id, j))}
            </ul>
          </li>
          );
        })}
      </ul>
    </>
  );
}
