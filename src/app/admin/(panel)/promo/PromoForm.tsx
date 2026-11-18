"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { FaSyncAlt, FaTimes } from "react-icons/fa";
import { savePromo, type FormState } from "@/app/admin/actions";
import { FieldError, SubmitButton } from "@/components/admin/ui";
import { normalizePromo } from "@/lib/data";

// no 0/O, 1/I/L: easy to read out over the phone
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(len = 8) {
  const bytes = crypto.getRandomValues(new Uint32Array(len));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export default function PromoForm() {
  const [state, action] = useActionState<FormState, FormData>(savePromo, null);
  const f = state?.fields ?? {};
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<"single" | "multi">("single");
  const [n, setN] = useState({ percent: "", days: "", uses: "" });
  const numProps = (k: keyof typeof n) => ({
    name: k,
    type: "number",
    min: 1,
    inputMode: "numeric" as const,
    value: n[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setN((x) => ({ ...x, [k]: e.target.value })),
    "aria-invalid": f[k] ? (true as const) : undefined,
  });

  return (
    <section className="adm-panel adm-side-form">
      <div className="adm-panel-head">
        <h2>ახალი პრომო კოდი</h2>
        <Link href="/admin/promo" className="adm-icon-btn" aria-label="დახურვა">
          <FaTimes />
        </Link>
      </div>
      <form action={action} className="adm-form" noValidate>
        {state?.error && (
          <p className="adm-alert" role="alert">
            {state.error}
          </p>
        )}

        <div className="adm-field">
          <label htmlFor="p-code">კოდი</label>
          <div className="adm-input-btn">
            <input
              id="p-code"
              name="code"
              value={code}
              autoFocus
              autoComplete="off"
              placeholder="მაგ. SUMMER10"
              aria-invalid={f.code ? true : undefined}
              onChange={(e) => setCode(normalizePromo(e.target.value))}
            />
            <button type="button" className="adm-btn ghost" onClick={() => setCode(generateCode())}>
              <FaSyncAlt /> გენერირება
            </button>
          </div>
          <FieldError msg={f.code} />
        </div>

        <div className="adm-field">
          <label htmlFor="p-percent">ფასდაკლება (%)</label>
          <input id="p-percent" {...numProps("percent")} max={100} placeholder="10" />
          <FieldError msg={f.percent} />
        </div>

        <div className="adm-field">
          <span className="adm-label">ტიპი</span>
          <div className="adm-seg" role="radiogroup" aria-label="ტიპი">
            {(
              [
                ["single", "ერთჯერადი"],
                ["multi", "მრავალჯერადი"],
              ] as const
            ).map(([v, l]) => (
              <label key={v} className={kind === v ? "on" : undefined}>
                <input type="radio" name="kind" value={v} checked={kind === v} onChange={() => setKind(v)} />
                {l}
              </label>
            ))}
          </div>
          <p className="adm-hint">
            {kind === "single" ? "კოდი მხოლოდ ერთ შეკვეთაზე იმუშავებს." : "შეზღუდეთ დღეებით, გამოყენების რაოდენობით ან ორივეთი."}
          </p>
        </div>

        <div className="adm-field-row">
          <div className="adm-field">
            <label htmlFor="p-days">მოქმედების ვადა (დღე)</label>
            <input id="p-days" {...numProps("days")} placeholder="უვადო" />
            <FieldError msg={f.days} />
          </div>
          {kind === "multi" && (
            <div className="adm-field">
              <label htmlFor="p-uses">გამოყენების ლიმიტი</label>
              <input id="p-uses" {...numProps("uses")} placeholder="ულიმიტო" />
              <FieldError msg={f.uses} />
            </div>
          )}
        </div>
        <p className="adm-hint" style={{ marginBottom: 16 }}>
          ცარიელი ველი ნიშნავს, რომ ეს შეზღუდვა არ მოქმედებს.
        </p>

        <div className="adm-form-foot">
          <span />
          <SubmitButton>შექმნა</SubmitButton>
        </div>
      </form>
    </section>
  );
}
