"use client";

import { FaClock, FaEnvelope, FaMapMarkerAlt, FaPhoneAlt } from "react-icons/fa";
import { telHref } from "@/lib/data";
import { useSiteSettings } from "./SiteSettings";

export default function ContactCards() {
  const s = useSiteSettings();
  const cards = [
    ...s.phones.map((p) => ({ icon: FaPhoneAlt, label: "ტელეფონი", value: p, href: telHref(p) })),
    ...(s.email ? [{ icon: FaEnvelope, label: "ელფოსტა", value: s.email, href: `mailto:${s.email}` }] : []),
    ...s.addresses.map((a) => ({ icon: FaMapMarkerAlt, label: "მისამართი", value: a, href: undefined })),
    ...(s.hours ? [{ icon: FaClock, label: "სამუშაო საათები", value: s.hours, href: undefined }] : []),
  ];

  return (
    <ul className="contact-cards">
      {cards.map(({ icon: Icon, label, value, href }) => (
        <li key={`${label}-${value}`}>
          <span className="icon">
            <Icon />
          </span>
          <span className="label">{label}</span>
          {href ? (
            <a href={href} className="value">
              {value}
            </a>
          ) : (
            <span className="value">{value}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
