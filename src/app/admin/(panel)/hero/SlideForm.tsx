"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { FaArrowLeft, FaPlus, FaTimes } from "react-icons/fa";
import { deleteSlide, saveSlide, type FormState } from "@/app/admin/actions";
import ImageUploader from "@/components/admin/ImageUploader";
import VideoUploader from "@/components/admin/VideoUploader";
import { ConfirmButton, FieldError, SubmitButton } from "@/components/admin/ui";

export type SlideData = {
  id?: number;
  image: string;
  video: string;
  align: "left" | "center" | "right";
  position: string;
  shade: "none" | "left" | "right";
  line1: string;
  line2: string;
  offer: string;
  extra: string[];
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  active: boolean;
};

const MAX_EXTRA_LINES = 3;

const positions = [
  { v: "center top", l: "ზედა ნაწილი" },
  { v: "center center", l: "ცენტრი" },
  { v: "center 70%", l: "ქვედა ნაწილი" },
  { v: "left center", l: "მარცხენა მხარე" },
  { v: "right center", l: "მარჯვენა მხარე" },
];

function Segmented<T extends string>({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: { v: T; l: string }[];
}) {
  return (
    <div className="adm-seg" role="radiogroup">
      {options.map((o) => (
        <label key={o.v} className={value === o.v ? "on" : undefined}>
          <input type="radio" name={name} value={o.v} checked={value === o.v} onChange={() => onChange(o.v)} />
          {o.l}
        </label>
      ))}
    </div>
  );
}

export default function SlideForm({ slide, links }: { slide: SlideData; links: { href: string; label: string }[] }) {
  const [state, action] = useActionState<FormState, FormData>(saveSlide, null);
  const [s, setS] = useState(slide);
  const set = <K extends keyof SlideData>(k: K, v: SlideData[K]) => setS((x) => ({ ...x, [k]: v }));
  const [image, setImage] = useState(slide.image);
  const [video, setVideo] = useState(slide.video);
  const f = state?.fields ?? {};

  return (
    <form action={action} className="adm-form" noValidate>
      {slide.id && <input type="hidden" name="id" value={slide.id} />}
      <Link href="/admin/hero" className="adm-back">
        <FaArrowLeft /> ჰერო სლაიდერი
      </Link>
      <header className="adm-head">
        <div>
          <h1>{slide.id ? "სლაიდის რედაქტირება" : "ახალი სლაიდი"}</h1>
        </div>
      </header>
      {state?.error && (
        <p className="adm-alert" role="alert">
          {state.error}
        </p>
      )}

      {/* live preview: same layout rules as the storefront hero */}
      <section className="adm-hero-preview" aria-label="გადახედვა">
        <div className="pv-bg" style={{ backgroundImage: image ? `url(${image})` : undefined, backgroundPosition: s.position }} />
        {video && <video key={video} className="pv-video" src={video} poster={image || undefined} muted loop autoPlay playsInline style={{ objectPosition: s.position }} />}
        {s.shade !== "none" && <div className={`pv-shade ${s.shade}`} />}
        <div className={`pv-text ${s.align}`}>
          {s.line1 && <div className="pv-h1">{s.line1}</div>}
          {s.line2 && (
            <div className="pv-h1">
              {s.line2} {s.offer && <span className="pv-offer">{s.offer}</span>}
            </div>
          )}
          {!s.line2 && s.offer && <span className="pv-offer">{s.offer}</span>}
          {s.extra.filter((t) => t.trim()).map((t, i) => (
            <div key={i} className="pv-h1">
              {t}
            </div>
          ))}
          <div className="pv-btns">
            {s.primaryLabel && <span className="pv-btn">{s.primaryLabel}</span>}
            {s.secondaryLabel && <span className="pv-btn ghost">{s.secondaryLabel}</span>}
          </div>
        </div>
        {!image && !video && <p className="pv-empty">ატვირთეთ ფოტო ან ვიდეო გადახედვისთვის</p>}
      </section>

      <div className="adm-edit-grid">
        <div className="adm-stack">
          <section className="adm-panel">
            <div className="adm-panel-head">
              <h2>ტექსტი</h2>
            </div>
            <div className="adm-field-row">
              <div className="adm-field">
                <label htmlFor="line1">სათაური, 1-ლი ხაზი</label>
                <input id="line1" name="line1" value={s.line1} onChange={(e) => set("line1", e.target.value)} aria-invalid={f.line1 ? true : undefined} />
                <FieldError msg={f.line1} />
              </div>
              <div className="adm-field">
                <label htmlFor="line2">სათაური, მე-2 ხაზი</label>
                <input id="line2" name="line2" value={s.line2} onChange={(e) => set("line2", e.target.value)} />
              </div>
            </div>
            <div className="adm-field-row">
              <div className="adm-field">
                <label htmlFor="offer">ფასდაკლების იარლიყი</label>
                <input id="offer" name="offer" value={s.offer} placeholder="მაგ. -20%" onChange={(e) => set("offer", e.target.value)} />
              </div>
            </div>
            {s.extra.map((text, i) => (
              <div key={i} className="adm-field">
                <label htmlFor={`extra-${i}`}>დამატებითი ხაზი {i + 1}</label>
                <div className="adm-extra-line">
                  <input
                    id={`extra-${i}`}
                    name="extra"
                    value={text}
                    onChange={(e) => set("extra", s.extra.map((t, k) => (k === i ? e.target.value : t)))}
                  />
                  <button
                    type="button"
                    className="adm-btn ghost"
                    aria-label={`ხაზის წაშლა ${i + 1}`}
                    onClick={() => set("extra", s.extra.filter((_, k) => k !== i))}
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            ))}
            {s.extra.length < MAX_EXTRA_LINES && (
              <button type="button" className="adm-btn ghost" onClick={() => set("extra", [...s.extra, ""])}>
                <FaPlus /> ხაზის დამატება
              </button>
            )}
          </section>

          <section className="adm-panel">
            <div className="adm-panel-head">
              <h2>ღილაკები</h2>
            </div>
            <datalist id="hero-links">
              {links.map((l) => (
                <option key={l.href} value={l.href}>
                  {l.label}
                </option>
              ))}
            </datalist>
            <div className="adm-field-row">
              <div className="adm-field">
                <label htmlFor="primaryLabel">მთავარი ღილაკი</label>
                <input id="primaryLabel" name="primaryLabel" value={s.primaryLabel} onChange={(e) => set("primaryLabel", e.target.value)} />
              </div>
              <div className="adm-field">
                <label htmlFor="primaryHref">ბმული</label>
                <input id="primaryHref" name="primaryHref" list="hero-links" value={s.primaryHref} onChange={(e) => set("primaryHref", e.target.value)} />
              </div>
            </div>
            <div className="adm-field-row">
              <div className="adm-field">
                <label htmlFor="secondaryLabel">მეორე ღილაკი</label>
                <input id="secondaryLabel" name="secondaryLabel" value={s.secondaryLabel} placeholder="ცარიელი = არ ჩანს" onChange={(e) => set("secondaryLabel", e.target.value)} />
              </div>
              <div className="adm-field">
                <label htmlFor="secondaryHref">ბმული</label>
                <input id="secondaryHref" name="secondaryHref" list="hero-links" value={s.secondaryHref} onChange={(e) => set("secondaryHref", e.target.value)} />
              </div>
            </div>
          </section>
        </div>

        <aside className="adm-stack">
          <section className="adm-panel">
            <div className="adm-panel-head">
              <h2>ფოტო</h2>
            </div>
            <ImageUploader
              name="image"
              initial={slide.image ? [slide.image] : []}
              multiple={false}
              hint="ჰორიზონტალური, მინ. 1920 x 700"
              onChange={(u) => setImage(u[0] ?? "")}
            />
            <FieldError msg={f.image} />
            <p className="adm-hint">თუ ვიდეოს ატვირთავთ, ფოტო არასავალდებულოა. ასეთ შემთხვევაში ის ჩანს ვიდეოს ჩატვირთვამდე.</p>
            <div className="adm-field">
              <label htmlFor="position">ფოტოს ფოკუსი</label>
              <select id="position" name="position" value={s.position} onChange={(e) => set("position", e.target.value)}>
                {!positions.some((p) => p.v === s.position) && <option value={s.position}>{s.position}</option>}
                {positions.map((p) => (
                  <option key={p.v} value={p.v}>
                    {p.l}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="adm-panel">
            <div className="adm-panel-head">
              <h2>ვიდეო</h2>
            </div>
            <VideoUploader name="video" initial={slide.video} onChange={setVideo} />
            <FieldError msg={f.video} />
            <p className="adm-hint">ვიდეო ხმის გარეშე ტრიალებს ფოტოს ნაცვლად. ფოტო ან ვიდეო, ერთ-ერთი მაინც საჭიროა.</p>
          </section>

          <section className="adm-panel">
            <div className="adm-panel-head">
              <h2>განლაგება</h2>
            </div>
            <div className="adm-field">
              <span className="adm-label">ტექსტის მხარე</span>
              <Segmented
                name="align"
                value={s.align}
                onChange={(v) => set("align", v)}
                options={[
                  { v: "left", l: "მარცხნივ" },
                  { v: "center", l: "ცენტრში" },
                  { v: "right", l: "მარჯვნივ" },
                ]}
              />
            </div>
            <div className="adm-field">
              <span className="adm-label">მუქი ფონი ტექსტის ქვეშ</span>
              <Segmented
                name="shade"
                value={s.shade}
                onChange={(v) => set("shade", v)}
                options={[
                  { v: "none", l: "არა" },
                  { v: "left", l: "მარცხნივ" },
                  { v: "right", l: "მარჯვნივ" },
                ]}
              />
              <p className="adm-hint">ნათელ ფოტოზე ჩართეთ, რომ თეთრი ტექსტი წაიკითხებოდეს.</p>
            </div>
            <label className="adm-toggle-row">
              <span>
                <strong>ჩვენება საიტზე</strong>
              </span>
              <span className="adm-switch">
                <input type="checkbox" name="active" defaultChecked={slide.active} />
                <span className="track" aria-hidden />
              </span>
            </label>
          </section>
        </aside>
      </div>

      <div className="adm-savebar">
        <div className="adm-savebar-inner">
          {slide.id ? <ConfirmButton action={() => deleteSlide(slide.id!)} label="სლაიდის წაშლა" /> : <span />}
          <SubmitButton>{slide.id ? "ცვლილებების შენახვა" : "სლაიდის დამატება"}</SubmitButton>
        </div>
      </div>
    </form>
  );
}
