/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import {
  FaUndoAlt,
  FaCaretRight,
  FaCreditCard,
  FaShieldAlt,
  FaTruck,
} from "react-icons/fa";
import { benefits, categoryHref, type Category } from "@/lib/data";

// Blue jagged cut only on the first and last banner (as in the original design).
const bannerCut = ["cut-left", "", "", "cut-right"];

export function CategoryBanners({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;
  return (
    <section className="category-banners section-padding">
      <div className="container">
        <ul className="category-grid">
          {categories.map((c, i) => {
            return (
              <li key={c.slug}>
                <Link href={categoryHref(c.slug)} className={`category-card ${bannerCut[i] ?? ""}`}>
                  <span className="info">
                    <span className="name">
                      {/* "სარბენი ბილიკები" → light first word, bold second line */}
                      <span className="name-top">{c.name.split(" ")[0]}</span>
                      <span className="name-main">{c.name.split(" ").slice(1).join(" ") || c.name}</span>
                    </span>
                    <span className="accent" aria-hidden />
                  </span>
                  <span className="media">
                    {c.image && <img src={c.image} alt={c.name} />}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

const benefitIcons = {
  truck: FaTruck,
  shield: FaShieldAlt,
  card: FaCreditCard,
  return: FaUndoAlt,
};

export function WhyUs() {
  return (
    <section className="why-us">
      {/* real photo bleeding to the left edge, cut with the brand's jagged blue edge */}
      <div className="why-us-media" aria-hidden>
        <img src="/img/slides/hero-exercise-bike.webp" alt="" />
      </div>
      <div className="container">
        <div className="why-us-content">
          <h2>ყველაფერი ვარჯიშისთვის ერთ სივრცეში</h2>
          <ul className="benefits">
            {benefits.map((b) => {
              const Icon = benefitIcons[b.icon];
              return (
                <li key={b.title}>
                  <span className="icon" aria-hidden>
                    <Icon />
                  </span>
                  <span className="text">
                    <h3>{b.title}</h3>
                    <p>{b.text}</p>
                  </span>
                </li>
              );
            })}
          </ul>
          <Link href="/catalog" className="thm-btn arrow-push-out-right">
            <span>
              კატალოგი <FaCaretRight />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
