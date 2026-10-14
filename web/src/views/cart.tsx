"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { quoteCart } from "@/lib/checkout-actions";
import type { Quote, QuoteLine } from "@/lib/checkout";
import { useFormatPrice } from "@/lib/format";
import { Button, Icon } from "@/components/ui";
import { useShop } from "@/components/shop-provider";

/** Re-prices the cart through the API whenever it (or the delivery method) changes. */
export function useQuote(deliveryMethod: string | null = null) {
  const { cart } = useShop();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cartKey = JSON.stringify(cart);

  useEffect(() => {
    if (cart.length === 0) return;
    let cancelled = false;
    void quoteCart(cart, deliveryMethod).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setQuote(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
    });
    return () => {
      cancelled = true;
    };
    // `cartKey` stands for `cart`, which is a new array on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey, deliveryMethod]);

  return { quote: cart.length ? quote : null, error };
}

/** `14" · Natural black · Cap M` */
export function useVariantLabel() {
  const t = useTranslations("Cart");
  const tProduct = useTranslations("Product");
  return (line: Pick<QuoteLine, "lengthInches" | "color" | "capSize">) =>
    t("variant", {
      length: line.lengthInches,
      color: tProduct(`colors.${line.color as "naturalBlack"}`),
      capSize: line.capSize,
    });
}

export default function CartView() {
  const t = useTranslations("Cart");
  const tCommon = useTranslations("Common");
  const formatPrice = useFormatPrice();
  const variantLabel = useVariantLabel();
  const router = useRouter();
  const { cart, cartCount, setQuantity, removeFromCart } = useShop();
  const { quote, error } = useQuote();

  if (cart.length === 0)
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

  if (!quote)
    return (
      <main className="page container empty">
        <p>{error ? t("error") : t("loading")}</p>
      </main>
    );

  const hasProblems = quote.problems.length > 0;
  return (
    <main className="page container">
      <div className="breadcrumb">
        {tCommon("home")} / <b>{t("metaTitle")}</b>
      </div>
      <h1>
        {t.rich("title", {
          count: cartCount,
          sup: (chunks) => <sup>{chunks}</sup>,
        })}
      </h1>
      <div className="cart-layout">
        <section className="cart-items">
          {quote.lines.map((line) => (
            <article className="line-item" key={line.sku}>
              <img src={line.imageUrl ?? ""} alt={line.productName} />
              <div>
                {(line.problem || line.isPreorder) && (
                  <span className="tag">
                    {line.problem ? t("unavailable") : t("preorder")}
                  </span>
                )}
                <h3>{line.productName}</h3>
                <p>{variantLabel(line)}</p>
                <button
                  className="remove"
                  onClick={() => removeFromCart(line.sku)}
                >
                  {t("remove")}
                </button>
              </div>
              <div>
                <strong>{formatPrice(line.lineTotalXaf)}</strong>
                <div className="quantity">
                  <button
                    aria-label={tCommon("decreaseQuantity")}
                    onClick={() => setQuantity(line.sku, line.quantity - 1)}
                  >
                    <Icon name="minus" />
                  </button>
                  <span>{line.quantity}</span>
                  <button
                    aria-label={tCommon("increaseQuantity")}
                    onClick={() => setQuantity(line.sku, line.quantity + 1)}
                  >
                    <Icon name="plus" />
                  </button>
                </div>
              </div>
            </article>
          ))}
          {/* Items removed from the catalog since they were added. */}
          {quote.problems
            .filter((p) => p.problem === "unknown_item")
            .map((p) => (
              <article className="line-item" key={p.sku}>
                <div>
                  <span className="tag">{t("unavailable")}</span>
                  <h3>{p.sku}</h3>
                  <button
                    className="remove"
                    onClick={() => removeFromCart(p.sku)}
                  >
                    {t("remove")}
                  </button>
                </div>
              </article>
            ))}
          {hasProblems && <p className="form-error">{t("problemsNote")}</p>}
          <div className="promo">
            <input placeholder={t("promoPlaceholder")} />
            <Button variant="outline">{t("apply")}</Button>
          </div>
        </section>
        <aside className="summary">
          <h2>{t("summary")}</h2>
          <p>
            <span>{t("subtotal")}</span>
            <b>{formatPrice(quote.subtotalXaf)}</b>
          </p>
          <p>
            <span>{t("discount")}</span>
            <b>—</b>
          </p>
          <p>
            <span>{t("delivery")}</span>
            <b>{t("deliveryNext")}</b>
          </p>
          <hr />
          <p className="total">
            <span>{t("total")}</span>
            <b>{formatPrice(quote.subtotalXaf)}</b>
          </p>
          <Button
            onClick={() => router.push("/checkout")}
            disabled={hasProblems}
          >
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
