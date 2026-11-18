"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { deleteCategory, saveCategory, type FormState } from "@/app/admin/actions";
import ImageUploader from "@/components/admin/ImageUploader";
import { ConfirmButton, FieldError, SubmitButton } from "@/components/admin/ui";
import { slugify } from "@/lib/slug";

type CategoryData = {
  id?: number;
  name: string;
  slug: string;
  parentId: number | null;
  image: string | null;
  sortOrder: number;
  active: boolean;
};

export default function CategoryForm({
  category,
  parents,
  hasChildren,
}: {
  category: CategoryData;
  parents: { id: number; name: string }[];
  hasChildren: boolean;
  saved?: boolean;
}) {
  const [state, action] = useActionState<FormState, FormData>(saveCategory, null);
  const [name, setName] = useState(category.name);
  const [slug, setSlug] = useState(category.slug);
  const [touched, setTouched] = useState(!!category.id);
  const [parentId, setParentId] = useState(category.parentId ? String(category.parentId) : "");
  const f = state?.fields ?? {};

  return (
    <section className="adm-panel adm-side-form">
      <div className="adm-panel-head">
        <h2>{category.id ? "კატეგორიის რედაქტირება" : parentId ? "ახალი ქვეკატეგორია" : "ახალი კატეგორია"}</h2>
        <Link href="/admin/categories" className="adm-icon-btn" aria-label="დახურვა">
          <FaTimes />
        </Link>
      </div>
      <form action={action} className="adm-form" noValidate>
        {category.id && <input type="hidden" name="id" value={category.id} />}
        {state?.error && (
          <p className="adm-alert" role="alert">
            {state.error}
          </p>
        )}

        <div className="adm-field">
          <label htmlFor="c-name">დასახელება</label>
          <input
            id="c-name"
            name="name"
            value={name}
            autoFocus
            aria-invalid={f.name ? true : undefined}
            onChange={(e) => {
              setName(e.target.value);
              if (!touched) setSlug(slugify(e.target.value));
            }}
          />
          <FieldError msg={f.name} />
        </div>

        <div className="adm-field">
          <label htmlFor="c-slug">ბმული</label>
          <div className="adm-prefix">
            <span>?category=</span>
            <input
              id="c-slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setTouched(true);
                setSlug(slugify(e.target.value));
              }}
            />
          </div>
        </div>

        <div className="adm-field">
          <label htmlFor="c-parent">მშობელი კატეგორია</label>
          <select
            id="c-parent"
            name="parentId"
            value={parentId}
            disabled={hasChildren}
            onChange={(e) => setParentId(e.target.value)}
            aria-invalid={f.parentId ? true : undefined}
          >
            <option value="">არა (მთავარი კატეგორია)</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {hasChildren && <p className="adm-hint">ამ კატეგორიას ქვეკატეგორიები აქვს, ამიტომ მთავარი რჩება.</p>}
          <FieldError msg={f.parentId} />
        </div>

        {!parentId && (
          <div className="adm-field">
            <span className="adm-label">ბანერის ფოტო</span>
            <ImageUploader name="image" initial={category.image ? [category.image] : []} multiple={false} hint="PNG გამჭვირვალე ფონით, ჩანს მთავარ გვერდზე" />
          </div>
        )}

        <div className="adm-field-row">
          <div className="adm-field">
            <label htmlFor="c-order">რიგი</label>
            <input id="c-order" name="sortOrder" type="number" defaultValue={category.sortOrder} />
          </div>
          <label className="adm-toggle-row compact">
            <span>
              <strong>აქტიური</strong>
            </span>
            <span className="adm-switch">
              <input type="checkbox" name="active" defaultChecked={category.active} />
              <span className="track" aria-hidden />
            </span>
          </label>
        </div>

        <div className="adm-form-foot">
          {category.id ? (
            <ConfirmButton action={() => deleteCategory(category.id!)} label="წაშლა" />
          ) : (
            <span />
          )}
          <SubmitButton>{category.id ? "შენახვა" : "დამატება"}</SubmitButton>
        </div>
        {category.id && <p className="adm-hint">წაშლისას ქვეკატეგორიები მთავარ დონეზე გადავა, პროდუქცია კი უკატეგორიოდ დარჩება.</p>}
      </form>
    </section>
  );
}
