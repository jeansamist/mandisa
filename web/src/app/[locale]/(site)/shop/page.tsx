import { pageMetadata } from "@/i18n/page";
import ShopView from "@/views/shop";

export const generateMetadata = pageMetadata("Shop");

export default function Page() {
  return <ShopView />;
}
