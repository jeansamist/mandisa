"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { productHref, type Product } from "@/lib/catalog";
import { useFormatPrice, useStatusLabel } from "@/lib/format";
import { useCatalog } from "@/components/site-data-provider";
import { Icon } from "@/components/ui";
import { useShop } from "@/components/shop-provider";

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
    <div className="chat-preview">
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
    </div>
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
      <button
        id="assistant"
        className="assistant-button"
        onClick={() => setOpen(!open)}
      >
        <Icon name={open ? "close" : "message"} />
        <span>{open ? t("close") : t("open")}</span>
      </button>
      {open && (
        <aside className="assistant-panel">
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
            <div className="bubble bubble--user">{t("panel.userMessage")}</div>
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
        </aside>
      )}
    </>
  );
}
