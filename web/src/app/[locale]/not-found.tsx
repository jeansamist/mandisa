import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");
  return (
    <main className="page container empty">
      <h1>{t("title")}</h1>
      <p>{t("copy")}</p>
      <Link className="button button--primary" href="/">
        {t("cta")}
      </Link>
    </main>
  );
}
