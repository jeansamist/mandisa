"use client";

import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { productHref, type Product } from "@/lib/catalog";
import { useFormatPrice, useStatusLabel } from "@/lib/format";
import { useCatalog } from "@/components/site-data-provider";
import { Icon } from "@/components/ui";
import { useShop } from "@/components/shop-provider";
import { ease, Reveal } from "@/components/motion";

function MiniProduct({
  product,
  children,
}: {
  product: Product;
  children?: React.ReactNode;
}) {
  const tCatalog = useTranslations("Catalog");
  const formatPrice = useFormatPrice();
  const statusLabel = useStatusLabel();
  return (
    <div className="mini-product">
      <img src={product.image ?? ""} alt={product.name} />
      <div>
        <span>
          {tCatalog(`textures.${product.texture}`)} · {statusLabel(product)}
        </span>
        <b>{product.name}</b>
        <small>{formatPrice(product.priceXaf)}</small>
        {children}
      </div>
    </div>
  );
}

export function ChatPreview() {
  const t = useTranslations("Assistant");
  const locale = useLocale();
  // Demo conversation from the design; the real assistant comes in phase 2.
  const featured = useCatalog().find("MDS-W01");
  return (
    <Reveal className="chat-preview" delay={0.15} y={40}>
      <div className="chat-head">
        <span>
          <Icon name="sparkle" />
        </span>
        <div>
          <b>{t("name")}</b>
          <small>{t("availability")}</small>
        </div>
        <i>{locale.toUpperCase()}</i>
      </div>
      <div className="bubble">{t("preview.greeting")}</div>
      <div className="bubble bubble--user">{t("preview.userMessage")}</div>
      {featured && <MiniProduct product={featured} />}
      <div className="fake-input">
        {t("inputPlaceholder")} <Icon name="send" />
      </div>
    </Reveal>
  );
}

export default function Assistant() {
  const t = useTranslations("Assistant");
  const router = useRouter();
  const { assistantOpen: open, setAssistantOpen: setOpen } = useShop();
  const suggested = useCatalog().find("MDS-W04");
  const navTo = (href: string) => {
    setOpen(false);
    router.push(href);
  };
  return (
    <>
      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.95 }}
        id="assistant"
        className="assistant-button"
        onClick={() => setOpen(!open)}
      >
        <Icon name={open ? "close" : "message"} />
        <span>{open ? t("close") : t("open")}</span>
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.aside
            className="assistant-panel"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.35, ease }}
            style={{ transformOrigin: "bottom right" }}
          >
            <div className="chat-head">
              <span>
                <Icon name="sparkle" />
              </span>
              <div>
                <b>{t("name")}</b>
                <small>
                  <i /> {t("availability")}
                </small>
              </div>
              <button aria-label={t("close")} onClick={() => setOpen(false)}>
                <Icon name="close" />
              </button>
            </div>
            <div className="chat-body">
              <div className="bubble">{t("panel.greeting")}</div>
              <div className="chat-chips">
                <button>{t("panel.chips.texture")}</button>
                <button>{t("panel.chips.availability")}</button>
                <button onClick={() => navTo("/tracking")}>
                  {t("panel.chips.tracking")}
                </button>
                <button>{t("panel.chips.care")}</button>
              </div>
              <div className="bubble bubble--user">
                {t("panel.userMessage")}
              </div>
              <div className="bubble">{t("panel.reply")}</div>
              {suggested && (
                <MiniProduct product={suggested}>
                  <button onClick={() => navTo(productHref(suggested.code))}>
                    {t("panel.viewProduct")}
                  </button>
                </MiniProduct>
              )}
            </div>
            <div className="chat-footer">
              <div className="fake-input">
                {t("inputPlaceholder")} <Icon name="send" />
              </div>
              <button>{t("panel.whatsapp")}</button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
