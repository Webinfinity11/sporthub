"use client";

import { useActionState, useState, useTransition } from "react";
import { saveOrderNote, setOrderStatus, type FormState } from "@/app/admin/actions";
import { SubmitButton } from "@/components/admin/ui";
import type { OrderStatus } from "@/db/schema";
import { orderStatuses } from "@/lib/data";

export default function OrderControls({
  id,
  status: initial,
  note,
  updatedAt,
}: {
  id: number;
  status: OrderStatus;
  note: string;
  updatedAt: string;
}) {
  const [status, setStatus] = useState(initial);
  const [pending, start] = useTransition();
  const [noteState, noteAction] = useActionState<FormState, FormData>(saveOrderNote, null);

  return (
    <aside className="adm-stack">
      <section className="adm-panel">
        <div className="adm-panel-head">
          <h2>სტატუსი</h2>
          {pending && <span className="adm-muted">ინახება...</span>}
        </div>
        <div className="adm-status-picker" role="radiogroup" aria-label="შეკვეთის სტატუსი">
          {orderStatuses.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={status === s.id}
              className={`s-${s.id}${status === s.id ? " checked" : ""}`}
              disabled={pending}
              onClick={() => {
                const prev = status;
                setStatus(s.id);
                start(async () => {
                  try {
                    await setOrderStatus(id, s.id);
                  } catch {
                    setStatus(prev);
                  }
                });
              }}
            >
              <span className="dot" aria-hidden />
              {s.label}
            </button>
          ))}
        </div>
        <p className="adm-muted small">ბოლო ცვლილება: {updatedAt}</p>
      </section>

      <section className="adm-panel">
        <div className="adm-panel-head">
          <h2>შიდა შენიშვნა</h2>
        </div>
        <form action={noteAction} className="adm-form">
          <input type="hidden" name="id" value={id} />
          <textarea name="adminNote" rows={5} defaultValue={note} placeholder="მყიდველი ამას ვერ ხედავს" aria-label="შიდა შენიშვნა" />
          <div className="adm-row-end">
            {noteState?.ok && <span className="adm-saved">შენახულია</span>}
            {noteState?.error && <span className="adm-field-error">{noteState.error}</span>}
            <SubmitButton className="adm-btn ghost sm">შენახვა</SubmitButton>
          </div>
        </form>
      </section>
    </aside>
  );
}
