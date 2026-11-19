/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import {
  FaClock,
  FaEnvelope,
  FaFacebookF,
  FaInstagram,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaTiktok,
} from "react-icons/fa";
import { categoryHref, legalPages, siteInfo, telHref, type Category, type SiteSettings } from "@/lib/data";

export default function Footer({ categories, settings }: { categories: Category[]; settings: SiteSettings }) {
  const socials = [
    { href: settings.facebook, label: "Facebook", icon: FaFacebookF },
    { href: settings.instagram, label: "Instagram", icon: FaInstagram },
    { href: settings.tiktok, label: "TikTok", icon: FaTiktok },
  ];
  return (
    <>
      <footer className="footer-area">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-about">
              <div className="single-footer-widget">
                <div className="footer-logo">
                  <Link href="/">
                    <img alt="SportHub" src="/brand/logo-on-dark.png" width={200} height={45} />
                  </Link>
                </div>
                <p className="about">{siteInfo.about}</p>
              </div>
            </div>

            <div>
              <div className="single-footer-widget">
                <h3 className="title">კატეგორიები</h3>
                <ul className="links">
                  {categories.map((c) => (
                    <li key={c.slug}>
                      <Link href={categoryHref(c.slug)}>{c.name}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <div className="single-footer-widget">
                <h3 className="title">ინფორმაცია</h3>
                <ul className="links">
                  {legalPages.map((p) => (
                    <li key={p.href}>
                      <Link href={p.href}>{p.label}</Link>
                    </li>
                  ))}
                  <li>
                    <Link href="/contact">კონტაქტი</Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="footer-contact">
              <div className="single-footer-widget">
                <h3 className="title">კონტაქტი</h3>
                <ul className="contact">
                  {settings.addresses.map((a) => (
                    <li key={a}>
                      <FaMapMarkerAlt />
                      <span>{a}</span>
                    </li>
                  ))}
                  {settings.phones.map((p) => (
                    <li key={p}>
                      <FaPhoneAlt />
                      <a href={telHref(p)}>{p}</a>
                    </li>
                  ))}
                  {settings.email && (
                    <li>
                      <FaEnvelope />
                      <a href={`mailto:${settings.email}`}>{settings.email}</a>
                    </li>
                  )}
                  {settings.hours && (
                    <li>
                      <FaClock />
                      <span>{settings.hours}</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <section className="footer-bottom-area">
        <div className="container">
          <div className="footer-bottom">
            <div className="copy-right">
              <p>{siteInfo.copyright}</p>
            </div>
            {/* icons always show; they become links once the admin fills in the URL */}
            <div className="social-links">
              {socials.map(({ href, label, icon: Icon }) =>
                href ? (
                  <a key={label} href={href} aria-label={label} target="_blank" rel="noreferrer">
                    <Icon />
                  </a>
                ) : (
                  <span key={label} role="img" aria-label={label}>
                    <Icon />
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
