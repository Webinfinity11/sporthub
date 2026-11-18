import type { Metadata } from "next";
import CartView from "@/components/CartView";
import PageTitle from "@/components/PageTitle";

export const metadata: Metadata = { title: "კალათა" };

export default function CartPage() {
  return (
    <>
      <PageTitle title="კალათა" />
      <CartView />
    </>
  );
}
