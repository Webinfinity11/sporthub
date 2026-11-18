"use client";

import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { FaArrowDown, FaArrowUp } from "react-icons/fa";

/** Submit button that shows a pending state. */
export function SubmitButton({ children, className = "adm-btn primary" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? "ინახება..." : children}
    </button>
  );
}

/** Two-step destructive button: first click arms it, second click runs the action. */
export function ConfirmButton({
  action,
  label = "წაშლა",
  confirmLabel = "დიახ, წაშლა",
}: {
  action: () => Promise<void>;
  label?: string;
  confirmLabel?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  if (!armed) {
    return (
      <button type="button" className="adm-btn danger-ghost" onClick={() => setArmed(true)}>
        {label}
      </button>
    );
  }
  return (
    <span className="adm-confirm">
      <span>დარწმუნებული ხართ?</span>
      <button type="button" className="adm-btn danger" disabled={pending} onClick={() => start(() => action())}>
        {pending ? "..." : confirmLabel}
      </button>
      <button type="button" className="adm-btn ghost" onClick={() => setArmed(false)}>
        გაუქმება
      </button>
    </span>
  );
}

/** On/off switch that persists immediately (optimistic). */
export function ActiveSwitch({
  initial,
  onChange,
  label,
}: {
  initial: boolean;
  onChange: (v: boolean) => Promise<void>;
  label: string;
}) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <label className={`adm-switch${pending ? " pending" : ""}`} title={on ? "აქტიური" : "დამალული"}>
      <input
        type="checkbox"
        checked={on}
        aria-label={label}
        onChange={(e) => {
          const v = e.target.checked;
          setOn(v);
          start(async () => {
            try {
              await onChange(v);
            } catch {
              setOn(!v);
            }
          });
        }}
      />
      <span className="track" aria-hidden />
    </label>
  );
}

export function MoveButtons({ onMove, first, last }: { onMove: (dir: -1 | 1) => Promise<void>; first: boolean; last: boolean }) {
  const [pending, start] = useTransition();
  return (
    <span className="adm-move">
      <button type="button" aria-label="ზემოთ" disabled={first || pending} onClick={() => start(() => onMove(-1))}>
        <FaArrowUp />
      </button>
      <button type="button" aria-label="ქვემოთ" disabled={last || pending} onClick={() => start(() => onMove(1))}>
        <FaArrowDown />
      </button>
    </span>
  );
}

export function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="adm-field-error">{msg}</p> : null;
}
