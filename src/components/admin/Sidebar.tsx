"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FaAddressBook, FaBars, FaBox, FaPercent, FaChartBar, FaExternalLinkAlt, FaImages, FaReceipt, FaSignOutAlt, FaSitemap, FaTimes } from "react-icons/fa";
import { logout } from "@/app/admin/actions";

const items = [
  { href: "/admin", label: "მიმოხილვა", icon: FaChartBar, exact: true },
  { href: "/admin/orders", label: "შეკვეთები", icon: FaReceipt, badge: true },
  { href: "/admin/products", label: "პროდუქცია", icon: FaBox },
  { href: "/admin/categories", label: "კატეგორიები", icon: FaSitemap },
  { href: "/admin/hero", label: "ჰერო სლაიდერი", icon: FaImages },
  { href: "/admin/promo", label: "პრომო კოდები", icon: FaPercent },
  { href: "/admin/settings", label: "კონტაქტები", icon: FaAddressBook },
];

export default function Sidebar({ newOrders }: { newOrders: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  return (
    <>
      <div className="adm-topbar">
        <button type="button" className="adm-burger" aria-label="მენიუ" onClick={() => setOpen(true)}>
          <FaBars />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-on-dark.png" alt="SportHub" width={132} height={30} />
      </div>

      <aside className={`adm-side${open ? " open" : ""}`}>
        <div className="adm-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-on-dark.png" alt="SportHub" width={150} height={34} />
          <button type="button" className="adm-close" aria-label="დახურვა" onClick={() => setOpen(false)}>
            <FaTimes />
          </button>
        </div>
        <nav className="adm-nav" aria-label="ადმინის მენიუ">
          {items.map(({ href, label, icon: Icon, exact, badge }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
                <Icon className="ico" />
                <span>{label}</span>
                {badge && newOrders}
              </Link>
            );
          })}
        </nav>
        <div className="adm-side-foot">
          <a href="/" target="_blank" rel="noreferrer">
            <FaExternalLinkAlt className="ico" /> საიტის ნახვა
          </a>
          <form action={logout}>
            <button type="submit">
              <FaSignOutAlt className="ico" /> გასვლა
            </button>
          </form>
        </div>
      </aside>
      {open && <div className="adm-backdrop" onClick={() => setOpen(false)} aria-hidden />}
    </>
  );
}
