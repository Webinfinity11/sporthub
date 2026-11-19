import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db, heroSlides } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { heroLinkOptions } from "../links";
import SlideForm from "../SlideForm";

export const instant = false;

export const metadata: Metadata = { title: "სლაიდი" };

export default async function EditSlidePage({ params }: PageProps<"/admin/hero/[id]">) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [[s], links] = await Promise.all([db.select().from(heroSlides).where(eq(heroSlides.id, id)).limit(1), heroLinkOptions()]);
  if (!s) notFound();
  // the offer sits on the last of the two main lines; anything after it is an extra line
  const mainCount = s.titleLines[0]?.offer ? 1 : 2;
  const [l1, l2] = s.titleLines;
  return (
    <SlideForm
      links={links}
      slide={{
        id: s.id,
        image: s.image ?? "",
        video: s.video ?? "",
        align: s.align,
        position: s.position,
        shade: s.shade,
        line1: l1?.text ?? "",
        line2: mainCount === 2 ? (l2?.text ?? "") : "",
        extra: s.titleLines.slice(mainCount).map((l) => l.text),
        offer: s.titleLines.find((l) => l.offer)?.offer ?? "",
        primaryLabel: s.primaryLabel,
        primaryHref: s.primaryHref,
        secondaryLabel: s.secondaryLabel,
        secondaryHref: s.secondaryHref,
        active: s.active,
      }}
    />
  );
}
