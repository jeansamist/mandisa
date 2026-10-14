import type { Metadata } from "next";
import CheckoutView from "@/views/checkout";

export const metadata: Metadata = { title: "Commande" };

export default function Page() {
  return <CheckoutView />;
}
