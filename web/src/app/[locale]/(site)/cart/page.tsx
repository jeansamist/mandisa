import { pageMetadata } from "@/i18n/page";
import CartView from "@/views/cart";

export const generateMetadata = pageMetadata("Cart");

export default function Page() {
  return <CartView />;
}
