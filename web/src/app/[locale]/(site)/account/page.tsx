import { pageMetadata } from "@/i18n/page";
import { AccountView } from "@/views/orders";

export const generateMetadata = pageMetadata("Account");

export default function Page() {
  return <AccountView />;
}
