import { pageMetadata } from "@/i18n/page";
import { ContactView } from "@/views/content";

export const generateMetadata = pageMetadata("Contact");

export default function Page() {
  return <ContactView />;
}
