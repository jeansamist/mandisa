import type { Metadata } from "next";
import ShopView from "@/views/shop";

export const metadata: Metadata = { title: "Boutique" };

export default function Page() {
  return <ShopView />;
}
