"use client";

import { useState, useTransition } from "react";
import { bankAction } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/admin/ui";

/**
 * Online payment of an order: card (Bank of Georgia) or installment (TBC).
 * For an installment the bank waits for the shop to confirm (products in stock) or cancel.
 */
export default function BankPanel({
  id,
  payment,
  state,
  detail,
  reference,
}: {
  id: number;
  payment: "card" | "bogloan" | "installment" | "split";
  state: string;
  detail: string;
  reference: string | null;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const run = (what: "refresh" | "confirm" | "cancel") =>
    new Promise<void>((done) =>
      start(async () => {
        const r = await bankAction(id, what);
        setMsg(r.error ?? r.message ?? "");
        done();
      }),
    );

  return (
    <section className="adm-panel">
      <div className="adm-panel-head">
        <h2>{payment === "card" ? "ბარათით გადახდა (BOG)" : payment === "bogloan" ? "განვადება (BOG)" : payment === "split" ? "განაწილება (Flitt)" : "განვადება (TBC)"}</h2>
        {pending && <span className="adm-muted">მიმდინარეობს...</span>}
      </div>
      {detail && <p className="adm-muted">ბანკის სტატუსი: {detail}</p>}
      {reference && <p className="adm-muted adm-mono">{reference}</p>}
      {payment === "installment" && state === "awaiting" && (
        <>
          <p className="adm-hint">მყიდველმა ხელშეკრულება დაადასტურა. დაადასტურეთ დღესვე, თუ პროდუქცია მარაგშია, ან გააუქმეთ.</p>
          <div className="adm-row-end" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="adm-btn primary" disabled={pending} onClick={() => run("confirm")}>
              განვადების დადასტურება
            </button>
            <ConfirmButton action={() => run("cancel")} label="გაუქმება" confirmLabel="დიახ, გაუქმება" />
          </div>
        </>
      )}
      {(state === "pending" || state === "awaiting") && reference && (
        <button type="button" className="adm-btn ghost sm" disabled={pending} onClick={() => run("refresh")} style={{ marginTop: 10 }}>
          სტატუსის განახლება
        </button>
      )}
      {msg && <p className="adm-hint">{msg}</p>}
    </section>
  );
}
