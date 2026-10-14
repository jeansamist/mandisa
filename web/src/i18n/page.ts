import type { Metadata } from "next";
import type { Messages } from "next-intl";
import { getTranslations } from "next-intl/server";

type PageNamespace = {
  [K in keyof Messages]: Messages[K] extends { metaTitle: string } ? K : never;
}[keyof Messages];

/** Builds `generateMetadata` that uses `<namespace>.metaTitle` as the page title. */
export function pageMetadata(
  namespace: PageNamespace | `Info.${"care" | "delivery" | "about"}`,
) {
  return async (): Promise<Metadata> => {
    const t = await getTranslations(namespace);
    return { title: t("metaTitle") };
  };
}
