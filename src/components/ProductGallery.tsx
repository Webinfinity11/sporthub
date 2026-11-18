"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

/** Main product photo with thumbnails (when the product has more than one image). */
export default function ProductGallery({ images, name, discount }: { images: string[]; name: string; discount: number }) {
  const [active, setActive] = useState(0);
  const list = images.length ? images : ["/img/categories/cat-weights.webp"];

  return (
    <div className="product-gallery">
      <div className="product-media">
        {discount > 0 && <span className="product-discount">{`-${discount}%`}</span>}
        <img src={list[active]} alt={name} />
      </div>
      {list.length > 1 && (
        <div className="product-thumbs" role="tablist" aria-label="ფოტოები">
          {list.map((src, i) => (
            <button
              key={src + i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`ფოტო ${i + 1}`}
              className={i === active ? "active" : undefined}
              onClick={() => setActive(i)}
            >
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
