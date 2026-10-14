import type { Metadata } from "next";
import { FaqView } from "@/views/content";

export const metadata: Metadata = { title: "FAQ" };

export default function Page() {
  return <FaqView />;
}
