"use client";

import { useState } from "react";
import { FaPlus, FaTimes } from "react-icons/fa";

/** Editable list of [name, value] product specs, serialized to a hidden input. */
export default function SpecsEditor({ name, initial }: { name: string; initial: [string, string][] }) {
  const [rows, setRows] = useState<[string, string][]>(initial.length ? initial : [["", ""]]);
  const set = (i: number, j: 0 | 1, v: string) =>
    setRows((r) => r.map((row, k) => (k === i ? ((j === 0 ? [v, row[1]] : [row[0], v]) as [string, string]) : row)));

  return (
    <div className="adm-specs">
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      <div className="adm-specs-head" aria-hidden>
        <span>მახასიათებელი</span>
        <span>მნიშვნელობა</span>
      </div>
      {rows.map(([k, v], i) => (
        <div className="adm-specs-row" key={i}>
          <input value={k} placeholder="მაგ. მაქს. წონა" aria-label={`მახასიათებელი ${i + 1}`} onChange={(e) => set(i, 0, e.target.value)} />
          <input value={v} placeholder="მაგ. 150 კგ" aria-label={`მნიშვნელობა ${i + 1}`} onChange={(e) => set(i, 1, e.target.value)} />
          <button type="button" aria-label="წაშლა" onClick={() => setRows((r) => (r.length > 1 ? r.filter((_, x) => x !== i) : [["", ""]]))}>
            <FaTimes />
          </button>
        </div>
      ))}
      <button type="button" className="adm-btn ghost sm" onClick={() => setRows((r) => [...r, ["", ""]])}>
        <FaPlus /> დამატება
      </button>
    </div>
  );
}
