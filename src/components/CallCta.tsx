"use client";

/* eslint-disable @next/next/no-img-element */
import { FaCaretRight, FaPhoneAlt } from "react-icons/fa";
import { telHref } from "@/lib/data";
import { useSiteSettings } from "./SiteSettings";

export default function CallCta() {
  const { phones, hours } = useSiteSettings();
  const phone = phones[0];
  if (!phone) return null;
  const tel = telHref(phone);
  return (
    <section className="subscribe-area">
      <div className="container">
        <div className="row">
          <div className="col-md-5 hidden-sm">
            <div className="img-holder">
              <img src="/img/subscribe/equipment.webp" alt="SportHub ფიტნეს ინვენტარი" width={1000} height={660} />
            </div>
          </div>
          <div className="col-md-7">
            <div className="call-cta">
              <p className="eyebrow">კითხვები ან შეკვეთა? დაგვირეკეთ</p>
              <a href={tel} className="phone">
                <span className="phone-icon">
                  <FaPhoneAlt />
                </span>
                {phone}
              </a>
              <div className="actions">
                <a href={tel} className="thm-btn arrow-push-out-right">
                  <span>
                    დარეკვა <FaCaretRight />
                  </span>
                </a>
                {hours && <span className="hours">{hours}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
