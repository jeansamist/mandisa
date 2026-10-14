import { pageMetadata } from "@/i18n/page";
import { FaqView } from "@/views/content";

export const generateMetadata = pageMetadata("Faq");

export default function Page() {
  return <FaqView />;
}
