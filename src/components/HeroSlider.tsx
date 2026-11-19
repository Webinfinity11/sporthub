"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FaCaretRight, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import type { Slide } from "@/lib/data";

const GRID_W = 1170;
const GRID_H = 700;
const DELAY = 9000;

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
function SlideVideo({ src, poster, position, active }: { src: string; poster: string; position: string; active: boolean }) {
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

  if (still) return null;
  return (
    <video
      ref={ref}
      className="slide-video"
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload={active ? "auto" : "none"}
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
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.offsetWidth / GRID_W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <section
      ref={wrapRef}
      className="rev_slider_wrapper slider-5"
      style={{ height: Math.max(GRID_H * scale, 380) }}
    >
      {slides.map((s, i) => {
        const pos = layout[s.align];
        const btnTop = Math.max(pos.btn, lineTop(pos.lines, s.titleLines.length - 1) + 120);
        const active = i === index;
        return (
          <div key={s.id} className={`slide${active ? " active" : ""}`} aria-hidden={!active}>
            <div
              className="slide-bg"
              style={{ backgroundImage: `url(${s.image})`, backgroundPosition: s.position ?? "top center" }}
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
                  <Link href={s.secondaryCta.href} className="thm-btn borderd arrow-push-in-right">
                    <span>
                      {s.secondaryCta.label} <FaCaretRight />
                    </span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <button className="tparrows tp-leftarrow" aria-label="წინა სლაიდი" onClick={() => go(-1)}>
        <FaChevronLeft />
      </button>
      <button className="tparrows tp-rightarrow" aria-label="შემდეგი სლაიდი" onClick={() => go(1)}>
        <FaChevronRight />
      </button>
    </section>
  );
}
