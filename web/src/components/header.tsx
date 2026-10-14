"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Icon, Logo } from "@/components/ui";
import { useShop } from "@/components/shop-provider";

function LanguageSwitch() {
  const t = useTranslations("Header");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const next =
    routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;
  return (
    <button
      className="language"
      aria-label={t("switchLanguage")}
      onClick={() => router.replace(pathname, { locale: next })}
    >
      {routing.locales.map((l) =>
        l === locale ? (
          <b key={l}>{l.toUpperCase()}</b>
        ) : (
          <span key={l}>{l.toUpperCase()}</span>
        ),
      )}
    </button>
  );
}

export default function Header() {
  const t = useTranslations("Header");
  const router = useRouter();
  const { cartCount } = useShop();
  const [menu, setMenu] = useState(false);
  const navTo = (href: string) => {
    router.push(href);
    setMenu(false);
  };
  return (
    <>
      <div className="announcement">{t("announcement")}</div>
      <header className="header">
        <Logo />
        <nav className={menu ? "nav nav--open" : "nav"}>
          <button onClick={() => navTo("/shop")}>{t("nav.shop")}</button>
          <button onClick={() => navTo("/shop")}>{t("nav.textures")}</button>
          <button onClick={() => navTo("/care")}>{t("nav.care")}</button>
          <button onClick={() => navTo("/delivery")}>
            {t("nav.delivery")}
          </button>
          <button onClick={() => navTo("/about")}>{t("nav.about")}</button>
          <button onClick={() => navTo("/contact")}>{t("nav.contact")}</button>
        </nav>
        <div className="header__actions">
          <LanguageSwitch />
          <button className="desktop-icon" aria-label={t("search")}>
            <Icon name="search" />
          </button>
          <button
            className="desktop-icon"
            aria-label={t("account")}
            onClick={() => router.push("/account")}
          >
            <Icon name="user" />
          </button>
          <button
            className="cart-icon"
            aria-label={t("cart")}
            onClick={() => router.push("/cart")}
          >
            <Icon name="bag" />
            <span>{cartCount}</span>
          </button>
          <button
            className="menu-button"
            aria-label={t("menu")}
            onClick={() => setMenu(!menu)}
          >
            <Icon name={menu ? "close" : "menu"} />
          </button>
        </div>
      </header>
    </>
  );
}
