import type { Metadata } from "next";
import CheckoutView from "@/components/CheckoutView";
import { bogClientId, bogEnabled } from "@/lib/bog";
import { credoEnabled } from "@/lib/credo";
import { flittEnabled } from "@/lib/flitt";
import { tbcEnabled } from "@/lib/tbc";

export const metadata: Metadata = { title: "შეკვეთის გაფორმება" };

// Focused checkout: no big page banner, the form starts right under the header.
export default function CheckoutPage() {
  return <CheckoutView cardEnabled={bogEnabled} bogClientId={bogClientId} installmentEnabled={tbcEnabled} splitEnabled={flittEnabled} credoEnabled={credoEnabled} />;
}
