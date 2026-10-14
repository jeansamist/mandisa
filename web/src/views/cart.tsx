"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useFormatPrice, useStatusLabel } from "@/lib/format";
import { Button, Icon } from "@/components/ui";
import { useShop } from "@/components/shop-provider";
import { useCatalog } from "@/components/site-data-provider";

export default function CartView() {
  const t = useTranslations("Cart");
  const tCommon = useTranslations("Common");
  const statusLabel = useStatusLabel();
  const formatPrice = useFormatPrice();
  const router = useRouter();
  const { cartCount: count, setCartCount: setCount } = useShop();
  // Mock cart: a single line with the first product until the real cart exists.
  const item = useCatalog().find("MDS-W01");
  if (!count)
    return (
      <main className="page container empty">
        <div className="empty__icon">
          <Icon name="bag" />
        </div>
        <h1>{t("emptyTitle")}</h1>
        <p>{t("emptyCopy")}</p>
        <Button onClick={() => router.push("/shop")}>{t("discover")}</Button>
      </main>
    );
  if (!item) return null;
  const total = formatPrice(item.priceXaf * count);
  return (
    <main className="page container">
      <div className="breadcrumb">
        {tCommon("home")} / <b>{t("metaTitle")}</b>
      </div>
      <h1>
        {t.rich("title", { count, sup: (chunks) => <sup>{chunks}</sup> })}
      </h1>
      <div className="cart-layout">
        <section className="cart-items">
          <article className="line-item">
            <img src={item.image ?? ""} alt={item.name} />
            <div>
              <span className="tag">{statusLabel(item)}</span>
              <h3>{item.name}</h3>
              <p>{t("lineVariant")}</p>
              <button className="remove" onClick={() => setCount(0)}>
                {t("remove")}
              </button>
            </div>
            <div>
              <strong>{formatPrice(item.priceXaf)}</strong>
              <div className="quantity">
                <button
                  aria-label={tCommon("decreaseQuantity")}
                  onClick={() => setCount(Math.max(1, count - 1))}
                >
                  <Icon name="minus" />
                </button>
                <span>{count}</span>
                <button
                  aria-label={tCommon("increaseQuantity")}
                  onClick={() => setCount(count + 1)}
                >
                  <Icon name="plus" />
                </button>
              </div>
            </div>
          </article>
          <div className="promo">
            <input placeholder={t("promoPlaceholder")} />
            <Button variant="outline">{t("apply")}</Button>
          </div>
        </section>
        <aside className="summary">
          <h2>{t("summary")}</h2>
          <p>
            <span>{t("subtotal")}</span>
            <b>{total}</b>
          </p>
          <p>
            <span>{t("discount")}</span>
            <b>—</b>
          </p>
          <p>
            <span>{t("delivery")}</span>
            <b>{t("freeInDouala")}</b>
          </p>
          <hr />
          <p className="total">
            <span>{t("total")}</span>
            <b>{total}</b>
          </p>
          <Button onClick={() => router.push("/checkout")}>
            {t("checkout")} <Icon name="arrow" />
          </Button>
          <button onClick={() => router.push("/shop")}>
            {t("continueShopping")}
          </button>
          <small>{t("paymentNote")}</small>
        </aside>
      </div>
    </main>
  );
}
