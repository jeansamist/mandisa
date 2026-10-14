"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { textures } from "@/lib/catalog";
import { Logo } from "@/components/ui";

export default function Footer() {
  const t = useTranslations("Footer");
  const tCatalog = useTranslations("Catalog");
  const router = useRouter();
  return (
    <footer>
      <div className="footer-grid container">
        <div>
          <Logo light />
          <p>{t("tagline")}</p>
        </div>
        <div>
          <b>{t("shopTitle")}</b>
          <button onClick={() => router.push("/shop")}>{t("allWigs")}</button>
          {textures.map((x) => (
            <button onClick={() => router.push("/shop")} key={x}>
              {tCatalog(`textures.${x}`)}
            </button>
          ))}
        </div>
        <div>
          <b>{t("helpTitle")}</b>
          <button onClick={() => router.push("/tracking")}>
            {t("tracking")}
          </button>
          <button onClick={() => router.push("/delivery")}>
            {t("delivery")}
          </button>
          <button onClick={() => router.push("/faq")}>{t("faq")}</button>
          <button onClick={() => router.push("/care")}>{t("care")}</button>
          <button onClick={() => router.push("/contact")}>
            {t("contact")}
          </button>
        </div>
        <div>
          <b>{t("contactTitle")}</b>
          <p>
            WhatsApp
            <br />
            +237 650 911 804
          </p>
          <p>
            {t("pickup")}
            <br />
            {t("pickupDetail")}
          </p>
        </div>
      </div>
      <div className="footer-bottom container">
        <span>{t("paymentMethods")}</span>
        <button onClick={() => router.push("/legal")}>{t("terms")}</button>
        <button onClick={() => router.push("/legal")}>{t("privacy")}</button>
        <span>{t("copyright", { year: 2026 })}</span>
      </div>
    </footer>
  );
}
