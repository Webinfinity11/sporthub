"use client";

import { setProductActive } from "@/app/admin/actions";
import { ActiveSwitch } from "@/components/admin/ui";

export default function ProductActiveSwitch({ id, active, name }: { id: number; active: boolean; name: string }) {
  return <ActiveSwitch initial={active} label={`${name}: საიტზე ჩვენება`} onChange={(v) => setProductActive(id, v)} />;
}
