import type { Metadata } from "next";
import PageTitle from "@/components/PageTitle";
import WishlistView from "@/components/WishlistView";

export const metadata: Metadata = { title: "სურვილების სია" };

export default function WishlistPage() {
  return (
    <>
      <PageTitle title="სურვილების სია" />
      <WishlistView />
    </>
  );
}
