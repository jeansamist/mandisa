import { pageMetadata } from "@/i18n/page";
import { InfoView } from "@/views/content";

export const generateMetadata = pageMetadata("Info.about");

export default function Page() {
  return <InfoView type="about" />;
}
