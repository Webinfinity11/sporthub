"use client";

import { moveSlide, setSlideActive } from "@/app/admin/actions";
import { ActiveSwitch, MoveButtons } from "@/components/admin/ui";

export default function SlideRowControls({ id, active, first, last }: { id: number; active: boolean; first: boolean; last: boolean }) {
  return (
    <div className="adm-slide-controls">
      <MoveButtons first={first} last={last} onMove={(d) => moveSlide(id, d)} />
      <ActiveSwitch initial={active} label="სლაიდის ჩვენება" onChange={(v) => setSlideActive(id, v)} />
    </div>
  );
}
