import type { Metadata } from "next";
import { ConfirmationView } from "@/views/orders";

export const metadata: Metadata = { title: "Commande confirmée" };

export default function Page() {
  return <ConfirmationView />;
}
