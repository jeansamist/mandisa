import { pageMetadata } from "@/i18n/page";
import { InfoView } from "@/views/content";

export const generateMetadata = pageMetadata("Info.care");

export default function Page() {
  return <InfoView type="care" />;
}
