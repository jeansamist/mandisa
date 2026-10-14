import { pageMetadata } from "@/i18n/page";
import CheckoutView from "@/views/checkout";

export const generateMetadata = pageMetadata("Checkout");

export default function Page() {
  return <CheckoutView />;
}
