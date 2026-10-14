import { Suspense } from "react";
import { pageMetadata } from "@/i18n/page";
import ConfirmationView from "@/views/confirmation";

export const generateMetadata = pageMetadata("Confirmation");

// The order number and token come from the URL (search params): read in Suspense.
export default function Page() {
  return (
    <Suspense fallback={<main className="page container confirmation" />}>
      <ConfirmationView />
    </Suspense>
  );
}
