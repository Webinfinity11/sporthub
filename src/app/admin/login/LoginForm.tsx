"use client";

import { useActionState } from "react";
import { login, type FormState } from "../actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, null);
  return (
    <form action={action} className="adm-login-box">
      <h1>შესვლა</h1>
      <p className="adm-muted">შეიყვანეთ ადმინისტრატორის მონაცემები.</p>
      <div className="adm-field">
        <label htmlFor="username">მომხმარებელი</label>
        <input id="username" name="username" autoComplete="username" required autoFocus />
      </div>
      <div className="adm-field">
        <label htmlFor="password">პაროლი</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state?.error ? true : undefined}
          aria-describedby={state?.error ? "login-error" : undefined}
        />
        {state?.error && (
          <p className="adm-field-error" id="login-error" role="alert">
            {state.error}
          </p>
        )}
      </div>
      <button type="submit" className="adm-btn primary block" disabled={pending}>
        {pending ? "მოწმდება..." : "შესვლა"}
      </button>
    </form>
  );
}
