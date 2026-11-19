"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { FaArrowLeft, FaExternalLinkAlt } from "react-icons/fa";
import { deleteProduct, saveProduct, type FormState } from "@/app/admin/actions";
import ImageUploader from "@/components/admin/ImageUploader";
import SpecsEditor from "@/components/admin/SpecsEditor";
import { ConfirmButton, FieldError, SubmitButton } from "@/components/admin/ui";
import { slugify } from "@/lib/slug";

export type ProductFormData = {
  id?: number;
  name: string;
  slug: string;
  description: string;
  price: number | null;
  oldPrice: number | null;
  deliveryTbilisi: number | null;
  deliveryRegions: number | null;
  stock: number;
  categoryId: number | null;
  images: string[];
  specs: [string, string][];
  active: boolean;
};

type Cat = { id: number; name: string; parentId: number | null };

export default function ProductForm({ product, categories, saved }: { product: ProductFormData; categories: Cat[]; saved?: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(saveProduct, saved ? { ok: true } : null);
  const [name, setName] = useState(product.name);
  const [slug, setSlug] = useState(product.slug);
  const [slugTouched, setSlugTouched] = useState(!!product.id);
  const [price, setPrice] = useState(product.price?.toString() ?? "");
  const [oldPrice, setOldPrice] = useState(product.oldPrice?.toString() ?? "");
  const f = state?.fields ?? {};
  const top = categories.filter((c) => !c.parentId);
  const p = Number(price);
  const o = Number(oldPrice);
  const discount = p > 0 && o > p ? Math.round((1 - p / o) * 100) : 0;

  return (
    <form action={action} className="adm-form" noValidate>
      {product.id && <input type="hidden" name="id" value={product.id} />}

      <Link href="/admin/products" className="adm-back">
        <FaArrowLeft /> პროდუქცია
      </Link>
      <header className="adm-head">
        <div>
          <h1>{product.id ? name || "პროდუქტი" : "ახალი პროდუქტი"}</h1>
          {product.id && (
            <a href={`/product/${product.slug}`} target="_blank" rel="noreferrer" className="adm-link small">
              საიტზე ნახვა <FaExternalLinkAlt />
            </a>
          )}
        </div>
      </header>

      {state?.error && (
        <p className="adm-alert" role="alert">
          {state.error}
        </p>
      )}

      <div className="adm-edit-grid">
        <div className="adm-stack">
          <section className="adm-panel">
            <div className="adm-field">
              <label htmlFor="name">დასახელება</label>
              <input
                id="name"
                name="name"
                value={name}
                aria-invalid={f.name ? true : undefined}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
              />
              <FieldError msg={f.name} />
            </div>
            <div className="adm-field">
              <label htmlFor="slug">ბმული</label>
              <div className="adm-prefix">
                <span>/product/</span>
                <input
                  id="slug"
                  name="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugify(e.target.value));
                  }}
                />
              </div>
              <p className="adm-hint">ლათინური ასოები, ციფრები და დეფისი. შეცვლის შემდეგ ძველი ბმული აღარ იმუშავებს.</p>
            </div>
            <div className="adm-field">
              <label htmlFor="description">აღწერა</label>
              <textarea id="description" name="description" rows={5} defaultValue={product.description} />
            </div>
          </section>

          <section className="adm-panel">
            <div className="adm-panel-head">
              <h2>ფოტოები</h2>
              <span className="adm-muted small">პირველი ფოტო მთავარია</span>
            </div>
            <ImageUploader name="images" initial={product.images} />
          </section>

          <section className="adm-panel">
            <div className="adm-panel-head">
              <h2>მახასიათებლები</h2>
            </div>
            <SpecsEditor name="specs" initial={product.specs} />
          </section>
        </div>

        <aside className="adm-stack">
          <section className="adm-panel">
            <label className="adm-toggle-row">
              <span>
                <strong>საიტზე ჩვენება</strong>
                <span className="adm-hint">გამორთვისას პროდუქტი დაიმალება</span>
              </span>
              <span className="adm-switch">
                <input type="checkbox" name="active" defaultChecked={product.active} />
                <span className="track" aria-hidden />
              </span>
            </label>
          </section>

          <section className="adm-panel">
            <div className="adm-panel-head">
              <h2>ფასი და მარაგი</h2>
              {discount > 0 && <span className="adm-off">-{discount}%</span>}
            </div>
            <div className="adm-field-row">
              <div className="adm-field">
                <label htmlFor="price">ფასი, ₾</label>
                <input
                  id="price"
                  name="price"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  aria-invalid={f.price ? true : undefined}
                />
                <FieldError msg={f.price} />
              </div>
              <div className="adm-field">
                <label htmlFor="oldPrice">ძველი ფასი, ₾</label>
                <input
                  id="oldPrice"
                  name="oldPrice"
                  inputMode="decimal"
                  value={oldPrice}
                  placeholder="ფასდაკლებისთვის"
                  onChange={(e) => setOldPrice(e.target.value)}
                  aria-invalid={f.oldPrice ? true : undefined}
                />
              </div>
            </div>
            <FieldError msg={f.oldPrice} />
            <div className="adm-field-row">
              <div className="adm-field">
                <label htmlFor="deliveryTbilisi">მიწოდება თბილისში, ₾</label>
                <input
                  id="deliveryTbilisi"
                  name="deliveryTbilisi"
                  inputMode="decimal"
                  defaultValue={product.deliveryTbilisi ?? ""}
                  aria-invalid={f.deliveryTbilisi ? true : undefined}
                />
                <FieldError msg={f.deliveryTbilisi} />
              </div>
              <div className="adm-field">
                <label htmlFor="deliveryRegions">მიწოდება თბილისის გარეთ, ₾</label>
                <input
                  id="deliveryRegions"
                  name="deliveryRegions"
                  inputMode="decimal"
                  defaultValue={product.deliveryRegions ?? ""}
                  aria-invalid={f.deliveryRegions ? true : undefined}
                />
                <FieldError msg={f.deliveryRegions} />
              </div>
            </div>
            <p className="adm-hint">0 ნიშნავს უფასო მიწოდებას. კალათაში თითო პროდუქტის მიწოდება ერთხელ ემატება.</p>
            <div className="adm-field">
              <label htmlFor="stock">მარაგი, ცალი</label>
              <input id="stock" name="stock" type="number" min={0} defaultValue={product.stock} aria-invalid={f.stock ? true : undefined} />
              <FieldError msg={f.stock} />
            </div>
          </section>

          <section className="adm-panel">
            <div className="adm-field">
              <label htmlFor="categoryId">კატეგორია</label>
              <select id="categoryId" name="categoryId" defaultValue={product.categoryId ?? ""} aria-invalid={f.categoryId ? true : undefined}>
                <option value="" disabled>
                  აირჩიეთ
                </option>
                {top.map((c) => (
                  <optgroup key={c.id} label={c.name}>
                    <option value={c.id}>{c.name}</option>
                    {categories
                      .filter((s) => s.parentId === c.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {c.name} / {s.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
              <FieldError msg={f.categoryId} />
            </div>
          </section>
        </aside>
      </div>

      <div className="adm-savebar">
        <div className="adm-savebar-inner">
          {product.id ? <ConfirmButton action={() => deleteProduct(product.id!)} label="პროდუქტის წაშლა" /> : <span />}
          <div className="adm-row-end">
            {state?.ok && <span className="adm-saved">შენახულია</span>}
            <SubmitButton>{product.id ? "ცვლილებების შენახვა" : "პროდუქტის შექმნა"}</SubmitButton>
          </div>
        </div>
      </div>
    </form>
  );
}
