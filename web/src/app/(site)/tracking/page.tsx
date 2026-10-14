import type { Metadata } from "next";
import { TrackingView } from "@/views/orders";

export const metadata: Metadata = { title: "Suivre ma commande" };

export default function Page() {
  return <TrackingView />;
}
