"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FaCaretRight, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import type { Slide } from "@/lib/data";

const GRID_W = 1170;
const GRID_H = 700;
const DELAY = 9000;
/** how much of the section below stays visible under the hero on a laptop screen */
const PEEK = 120;

// Vertical offsets (px on the 1170x700 grid) per slide alignment,
// taken from the original Revolution Slider layer settings.
// h = horizontal offset from the aligned edge.
const layout = {
  right: { lines: [115, 210], linesH: [0, 20], btn: 500, btnH: 244 },
  center: { lines: [160], linesH: [0], btn: 450, btnH: 0 },
  left: { lines: [115, 210], linesH: [0, 0], btn: 500, btnH: 0 },
} as const;

const LINE_STEP = 95;
const lineTop = (lines: readonly number[], i: number) => lines[i] ?? lines[lines.length - 1] + (i - lines.length + 1) * LINE_STEP;

const edge = (align: "left" | "center" | "right", h: number) =>
  align === "center" ? {} : { [align]: h };

/**
 * Background video of a slide. Only the visible slide loads and plays; the others stay paused
 * on their poster. With reduced motion turned on, or if autoplay is blocked, the poster photo shows.
 */
function SlideVideo({ src, poster, position, active }: { src: string; poster: string | null; position: string; active: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [still, setStill] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (active && !still) v.play().catch(() => {});
    else v.pause();
  }, [active, still]);

  // reduced motion: the poster photo is enough; without one, show the video's first frame, paused
  if (still && poster) return null;
  return (
    <video
      ref={ref}
      className="slide-video"
      src={src}
      poster={poster ?? undefined}
      muted
      loop
      playsInline
      // without a poster, load the first frame so the slide is not blank while it fades in
      preload={active ? "auto" : poster ? "none" : "metadata"}
      aria-hidden
      style={{ objectPosition: position || "center center" }}
    />
  );
}

export default function HeroSlider({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const wrapRef = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchX = useRef<number | null>(null);

  const go = useCallback((dir: number) => {
    setIndex((i) => (i + dir + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    timer.current = setTimeout(() => go(1), DELAY);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [index, go]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    // fit the width and the window height (minus the header and a peek of the next section),
    // so on a laptop the visitor sees that the page continues below
    const fit = () => {
      const header = (document.querySelector(".header") as HTMLElement | null)?.offsetHeight ?? 80;
      const room = window.innerHeight - header - PEEK;
      setScale(Math.max(0.3, Math.min(1, el.offsetWidth / GRID_W, room / GRID_H)));
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <section
      ref={wrapRef}
      className="rev_slider_wrapper slider-5"
      style={{ "--hero-h": `${Math.max(GRID_H * scale, 380)}px` } as React.CSSProperties}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 45 && slides.length > 1) go(dx < 0 ? 1 : -1);
      }}
    >
      {slides.map((s, i) => {
        const pos = layout[s.align];
        const btnTop = Math.max(pos.btn, lineTop(pos.lines, s.titleLines.length - 1) + 120);
        const active = i === index;
        return (
          <div key={s.id} className={`slide${active ? " active" : ""}`} aria-hidden={!active}>
            <div
              className="slide-bg"
              style={{ backgroundImage: s.image ? `url(${s.image})` : undefined, backgroundPosition: s.position ?? "top center" }}
            >
              {s.video && <SlideVideo src={s.video} poster={s.image} position={s.position} active={active} />}
            </div>
            {s.shade !== "none" && <div className={`slide-shade ${s.shade}`} aria-hidden />}
            {active && (
              <div
                className={`layers align-${s.align}`}
                style={{ width: GRID_W, height: GRID_H, transform: `translateX(-50%) scale(${scale})` }}
              >
                {s.titleLines.map((line, li) => (
                  <div
                    key={line.text}
                    className={`layer banner-caption-h1 ${li % 2 ? "in-right" : "in-left"}`}
                    style={{ top: lineTop(pos.lines, li), ...edge(s.align, pos.linesH[li % pos.linesH.length]), animationDelay: `${0.5 + li * 0.5}s` }}
                  >
                    {line.text}
                    {line.offer && (
                      <>
                        {" "}
                        <span className="offer-box">
                          <span className="inner">{line.offer}</span>
                        </span>
                      </>
                    )}
                  </div>
                ))}
                <div className="layer buttons in-up" style={{ top: btnTop, ...edge(s.align, pos.btnH), animationDelay: "2.3s" }}>
                  <Link href={s.primaryCta.href} className="thm-btn arrow-push-in-right">
                    <span>
                      {s.primaryCta.label} <FaCaretRight />
                    </span>
                  </Link>
                  {s.secondaryCta.label && (
                    <Link href={s.secondaryCta.href} className="thm-btn borderd arrow-push-in-right">
                      <span>
                        {s.secondaryCta.label} <FaCaretRight />
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            )}
            {/* phones: the same text in normal flow at the bottom of the slide, instead of the scaled 1170px grid */}
            {active && (
              <div className={`layers-m align-${s.align}`}>
                {s.titleLines.map((line, li) => (
                  <div key={line.text} className={`m-line ${li % 2 ? "in-right" : "in-left"}`} style={{ animationDelay: `${0.3 + li * 0.25}s` }}>
                    {line.text}
                    {line.offer && (
                      <>
                        {" "}
                        <span className="offer-box">
                          <span className="inner">{line.offer}</span>
                        </span>
                      </>
                    )}
                  </div>
                ))}
                {(s.primaryCta.label || s.secondaryCta.label) && (
                  <div className="m-buttons in-up" style={{ animationDelay: `${0.5 + s.titleLines.length * 0.25}s` }}>
                    {s.primaryCta.label && (
                      <Link href={s.primaryCta.href} className="thm-btn">
                        {s.primaryCta.label} <FaCaretRight />
                      </Link>
                    )}
                    {s.secondaryCta.label && (
                      <Link href={s.secondaryCta.href} className="thm-btn borderd">
                        {s.secondaryCta.label} <FaCaretRight />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {slides.length > 1 && (
        <div className="hero-dots">
          {slides.map((s, i) => (
            <button key={s.id} type="button" aria-label={`სლაიდი ${i + 1}`} aria-current={i === index} onClick={() => setIndex(i)} />
          ))}
        </div>
      )}
      <button className="tparrows tp-leftarrow" aria-label="წინა სლაიდი" onClick={() => go(-1)}>
        <FaChevronLeft />
      </button>
      <button className="tparrows tp-rightarrow" aria-label="შემდეგი სლაიდი" onClick={() => go(1)}>
        <FaChevronRight />
      </button>
    </section>
  );
}
