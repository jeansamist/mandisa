import { getTranslations } from "next-intl/server";
import { pageMetadata } from "@/i18n/page";

const sections = ["purpose", "orders", "delivery", "returns"] as const;

export const generateMetadata = pageMetadata("Legal");

export default async function Page() {
  const t = await getTranslations("Legal");
  return (
    <main className="page container narrow">
      <span className="eyebrow">{t("eyebrow")}</span>
      <h1>{t("title")}</h1>
      <p className="lead">{t("updated")}</p>
      {sections.map((key) => (
        <section className="legal-section" key={key}>
          <h2>{t(`sections.${key}`)}</h2>
          <p>{t("placeholder")}</p>
        </section>
      ))}
    </main>
  );
}
