import type { Metadata } from "next";
import { AccountView } from "@/views/orders";

export const metadata: Metadata = { title: "Mon compte" };

export default function Page() {
  return <AccountView />;
}
