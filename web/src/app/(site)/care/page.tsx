import type { Metadata } from "next";
import { InfoView } from "@/views/content";

export const metadata: Metadata = { title: "Guide d'entretien" };

export default function Page() {
  return <InfoView type="care" />;
}
