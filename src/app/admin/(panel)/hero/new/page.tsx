import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { heroLinkOptions } from "../links";
import SlideForm from "../SlideForm";

export const instant = false;

export const metadata: Metadata = { title: "ახალი სლაიდი" };

export default async function NewSlidePage() {
  await requireAdmin();
  return (
    <SlideForm
      links={await heroLinkOptions()}
      slide={{
        image: "",
        align: "right",
        position: "center center",
        shade: "right",
        line1: "",
        line2: "",
        offer: "",
        extra: [],
        primaryLabel: "ყიდვა",
        primaryHref: "/catalog",
        secondaryLabel: "",
        secondaryHref: "/catalog",
        active: true,
      }}
    />
  );
}
