import type { Metadata } from "next";
import CheckoutView from "@/components/CheckoutView";

export const metadata: Metadata = { title: "შეკვეთის გაფორმება" };

// Focused checkout: no big page banner, the form starts right under the header.
export default function CheckoutPage() {
  return <CheckoutView />;
}
