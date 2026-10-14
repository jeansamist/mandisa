import type { Metadata } from "next";
import { InfoView } from "@/views/content";

export const metadata: Metadata = { title: "Livraison et retours" };

export default function Page() {
  return <InfoView type="delivery" />;
}
