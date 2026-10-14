import { pageMetadata } from "@/i18n/page";
import { ConfirmationView } from "@/views/orders";

export const generateMetadata = pageMetadata("Confirmation");

export default function Page() {
  return <ConfirmationView />;
}
