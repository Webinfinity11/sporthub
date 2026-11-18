"use client";

import { useActionState, useState } from "react";
import { FaFacebookF, FaInstagram, FaPlus, FaTiktok, FaTimes } from "react-icons/fa";
import { saveSettings, type FormState } from "@/app/admin/actions";
import { FieldError, SubmitButton } from "@/components/admin/ui";
import type { SiteSettings } from "@/lib/data";

const MAX = 5;

/** Up to five one-line values (phones, addresses), each posted under the same name. */
function ListInput({ name, initial, placeholder, label }: { name: string; initial: string[]; placeholder: string; label: string }) {
  const [rows, setRows] = useState(initial.length ? initial : [""]);
  return (
    <div className="adm-specs">
      {rows.map((v, i) => (
        <div className="adm-specs-row single" key={i}>
          <input
            name={name}
            value={v}
            placeholder={placeholder}
            aria-label={`${label} ${i + 1}`}
            onChange={(e) => setRows((r) => r.map((x, k) => (k === i ? e.target.value : x)))}
          />
          <button type="button" aria-label="წაშლა" onClick={() => setRows((r) => (r.length > 1 ? r.filter((_, k) => k !== i) : [""]))}>
            <FaTimes />
          </button>
        </div>
      ))}
      {rows.length < MAX && (
        <button type="button" className="adm-btn ghost sm" onClick={() => setRows((r) => [...r, ""])}>
          <FaPlus /> დამატება
        </button>
      )}
    </div>
  );
}

export default function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, action] = useActionState<FormState, FormData>(saveSettings, null);
  const f = state?.fields ?? {};
  const socials = [
    { key: "facebook", label: "Facebook", icon: FaFacebookF, placeholder: "https://facebook.com/sporthub" },
    { key: "instagram", label: "Instagram", icon: FaInstagram, placeholder: "https://instagram.com/sporthub" },
    { key: "tiktok", label: "TikTok", icon: FaTiktok, placeholder: "https://tiktok.com/@sporthub" },
  ] as const;

  return (
    <form action={action} className="adm-form adm-settings" noValidate>
      <header className="adm-head">
        <div>
          <h1>კონტაქტები</h1>
          <p className="adm-muted">ჩანს საიტის ფუტერში, კონტაქტის გვერდზე და შეკვეთისას.</p>
        </div>
      </header>
      {state?.error && (
        <p className="adm-alert" role="alert">
          {state.error}
        </p>
      )}

      <div className="adm-stack">
        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2>ტელეფონი და მისამართი</h2>
          </div>
          <div className="adm-field">
            <span className="adm-label">ტელეფონის ნომრები</span>
            <ListInput name="phones" initial={settings.phones} placeholder="+995 5XX XX XX XX" label="ნომერი" />
            <p className="adm-hint">პირველი ნომერი მთავარია: ის ჩანს ზარის ღილაკზე და შეკვეთის გვერდზე.</p>
            <FieldError msg={f.phones} />
          </div>
          <div className="adm-field">
            <span className="adm-label">მისამართები</span>
            <ListInput name="addresses" initial={settings.addresses} placeholder="ქუჩა, ნომერი, ქალაქი" label="მისამართი" />
          </div>
          <div className="adm-field-row">
            <div className="adm-field">
              <label htmlFor="s-email">ელფოსტა</label>
              <input id="s-email" name="email" type="email" defaultValue={settings.email} aria-invalid={f.email ? true : undefined} />
              <FieldError msg={f.email} />
            </div>
            <div className="adm-field">
              <label htmlFor="s-hours">სამუშაო საათები</label>
              <input id="s-hours" name="hours" defaultValue={settings.hours} placeholder="ორშ-შაბ: 10:00-20:00" />
            </div>
          </div>
        </section>

        <section className="adm-panel">
          <div className="adm-panel-head">
            <h2>სოციალური ქსელები</h2>
          </div>
          {socials.map(({ key, label, icon: Icon, placeholder }) => (
            <div className="adm-field" key={key}>
              <label htmlFor={`s-${key}`}>
                <Icon aria-hidden /> {label}
              </label>
              <input
                id={`s-${key}`}
                name={key}
                defaultValue={settings[key]}
                placeholder={placeholder}
                inputMode="url"
                aria-invalid={f[key] ? true : undefined}
              />
              <FieldError msg={f[key]} />
            </div>
          ))}
          <p className="adm-hint">ხატულები ფუტერში ყოველთვის ჩანს. ბმული ჩაწერის შემდეგ გახდება დაჭერადი.</p>
        </section>

        <div className="adm-form-foot">
          <span>{state?.ok && <span className="adm-saved">შენახულია</span>}</span>
          <SubmitButton>შენახვა</SubmitButton>
        </div>
      </div>
    </form>
  );
}
