import type { Metadata } from "next";
import CheckoutView from "@/components/CheckoutView";
import { bogEnabled } from "@/lib/bog";
import { tbcEnabled } from "@/lib/tbc";

export const metadata: Metadata = { title: "შეკვეთის გაფორმება" };

// Focused checkout: no big page banner, the form starts right under the header.
export default function CheckoutPage() {
  return <CheckoutView cardEnabled={bogEnabled} installmentEnabled={tbcEnabled} />;
}
