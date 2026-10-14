import { pageMetadata } from "@/i18n/page";
import { TrackingView } from "@/views/orders";

export const generateMetadata = pageMetadata("Tracking");

export default function Page() {
  return <TrackingView />;
}
