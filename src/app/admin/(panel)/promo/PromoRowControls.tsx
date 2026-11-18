"use client";

import { deletePromo, setPromoActive } from "@/app/admin/actions";
import { ActiveSwitch, ConfirmButton } from "@/components/admin/ui";

export default function PromoRowControls({ id, code, active }: { id: number; code: string; active: boolean }) {
  return (
    <span className="adm-row-actions">
      <ActiveSwitch initial={active} label={`${code}: ჩართვა`} onChange={(v) => setPromoActive(id, v)} />
      <ConfirmButton action={() => deletePromo(id)} label="წაშლა" confirmLabel="წაშლა" />
    </span>
  );
}
