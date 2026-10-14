import type { Metadata } from "next";
import CartView from "@/views/cart";

export const metadata: Metadata = { title: "Panier" };

export default function Page() {
  return <CartView />;
}
