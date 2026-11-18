/* eslint-disable @next/next/no-img-element */
import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { db, heroSlides } from "@/db";
import { requireAdmin } from "@/lib/auth";
import SlideRowControls from "./SlideRowControls";

export const instant = false;

export const metadata: Metadata = { title: "ჰერო სლაიდერი" };

export default async function HeroPage() {
  await requireAdmin();
  const slides = await db.select().from(heroSlides).orderBy(asc(heroSlides.sortOrder), asc(heroSlides.id));

  return (
    <>
      <header className="adm-head">
        <div>
          <h1>ჰერო სლაიდერი</h1>
          <p className="adm-muted">მთავარი გვერდის დიდი ბანერი. სლაიდები ამ თანმიმდევრობით ჩანს.</p>
        </div>
        <Link href="/admin/hero/new" className="adm-btn primary">
          ახალი სლაიდი
        </Link>
      </header>

      {slides.length === 0 ? (
        <section className="adm-panel">
          <p className="adm-empty">სლაიდები არ არის, ამიტომ მთავარ გვერდზე ბანერი არ ჩანს.</p>
        </section>
      ) : (
        <ol className="adm-slides">
          {slides.map((s, i) => (
            <li key={s.id} className={s.active ? undefined : "is-muted"}>
              <Link href={`/admin/hero/${s.id}`} className="adm-slide-thumb">
                <img src={s.image} alt="" style={{ objectPosition: s.position }} />
                <span className="pos">{i + 1}</span>
              </Link>
              <div className="adm-slide-text">
                <Link href={`/admin/hero/${s.id}`} className="adm-strong-link">
                  {s.titleLines.map((l) => l.text).join(" ") || "უსათაურო"}
                </Link>
                <span className="adm-cell-sub">
                  {[s.titleLines.find((l) => l.offer)?.offer, s.primaryLabel && `ღილაკი: ${s.primaryLabel}`]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
              <SlideRowControls id={s.id} active={s.active} first={i === 0} last={i === slides.length - 1} />
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
