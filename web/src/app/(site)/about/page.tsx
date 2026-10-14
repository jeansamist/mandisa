import type { Metadata } from "next";
import { InfoView } from "@/views/content";

export const metadata: Metadata = { title: "À propos" };

export default function Page() {
  return <InfoView type="about" />;
}
