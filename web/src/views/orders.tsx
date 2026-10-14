"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useCatalog } from "@/components/site-data-provider";
import { useFormatPrice } from "@/lib/format";
import { Button } from "@/components/ui";

// Mock order data until orders come from the backend.
const ORDER_NUMBER = "MDS-2026-0001";
const CUSTOMER_NAME = "Mireille";
const orderStatuses = [
  "paid",
  "preparing",
  "ready",
  "shipped",
  "delivered",
] as const;

export function TrackingView() {
  const t = useTranslations("Tracking");
  const tOrders = useTranslations("Orders");
  const events: Record<
    (typeof orderStatuses)[number],
    { date?: string; text?: string }
  > = {
    paid: { date: t("events.paid.date"), text: t("events.paid.text") },
    preparing: {
      date: t("events.preparing.date"),
      text: t("events.preparing.text"),
    },
    ready: { text: t("events.ready.text") },
    shipped: {},
    delivered: {},
  };
  return (
    <main className="page tracking-page">
      <section className="tracking-hero">
        <div className="container">
          <span className="eyebrow eyebrow--light">{t("eyebrow")}</span>
          <h1>{t("title")}</h1>
          <p>{t("intro")}</p>
          <div className="tracking-form">
            <input value={ORDER_NUMBER} readOnly />
            <input value="+237 650 ••• •••" readOnly />
            <Button variant="light">{t("submit")}</Button>
          </div>
        </div>
      </section>
      <section className="container tracking-result">
        <div>
          <span className="tag">{t("inProgress")}</span>
          <h2>{t("orderTitle", { orderNumber: ORDER_NUMBER })}</h2>
          <p>{t("destination")}</p>
        </div>
        <div className="vertical-timeline">
          {orderStatuses.map((key, i) => (
            <article className={i < 2 ? "active" : ""} key={key}>
              <i>{i < 2 ? "✓" : i + 1}</i>
              <div>
                <span>{events[key].date ?? t("upcoming")}</span>
                <h3>{tOrders(`statuses.${key}`)}</h3>
                <p>{events[key].text}</p>
              </div>
            </article>
          ))}
        </div>
        <Button variant="outline">{t("contact")}</Button>
      </section>
    </main>
  );
}

const accountTabs = [
  "orders",
  "favorites",
  "preferences",
  "addresses",
] as const;

export function AccountView() {
  const t = useTranslations("Account");
  const tOrders = useTranslations("Orders");
  const formatPrice = useFormatPrice();
  const router = useRouter();
  const item = useCatalog().find("MDS-W01");
  if (!item) return null;
  return (
    <main className="page container">
      <span className="eyebrow">{t("eyebrow")}</span>
      <h1>{t("greeting", { name: CUSTOMER_NAME })}</h1>
      <div className="account-tabs">
        {accountTabs.map((key, i) => (
          <button className={i === 0 ? "active" : ""} key={key}>
            {t(`tabs.${key}`)}
          </button>
        ))}
      </div>
      <section className="account-order">
        <div>
          <span className="tag">{tOrders("statuses.preparing")}</span>
          <h2>{ORDER_NUMBER}</h2>
          <p>
            {t("orderSummary", { count: 1, total: formatPrice(item.priceXaf) })}
          </p>
        </div>
        <div className="order-product">
          <img src={item.image ?? ""} alt={item.name} />
          <b>{t("productLine")}</b>
        </div>
        <Button variant="outline" onClick={() => router.push("/tracking")}>
          {t("viewDetails")}
        </Button>
      </section>
    </main>
  );
}
