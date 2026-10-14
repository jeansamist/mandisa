"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { getOrder, retryPayment } from "@/lib/checkout-actions";
import type { OrderView } from "@/lib/checkout";
import { useFormatPrice } from "@/lib/format";
import { Button, Icon } from "@/components/ui";
import { useVariantLabel } from "@/views/cart";

const POLL_MS = 4000;
const POLL_FOR_MS = 5 * 60_000;

type DeliveryCode =
  "douala_home" | "bali_pickup" | "other_city" | "international";

type State =
  | "awaitingPayment"
  | "paymentFailed"
  | "paid"
  | "review"
  | "transfer"
  | "cashOnDelivery"
  | "quote"
  | "cancelled";

function stateOf(order: OrderView): State {
  if (order.status === "cancelled") return "cancelled";
  if (order.status === "draft") return "quote";
  if (order.status === "payment_review") return "review";
  if (order.status !== "pending_payment") return "paid";
  if (order.paymentMethod === "bank_transfer") return "transfer";
  if (order.paymentMethod === "cash_on_delivery") return "cashOnDelivery";
  return order.payment?.status === "pending"
    ? "awaitingPayment"
    : "paymentFailed";
}

/** Loads the order, then refreshes it while a mobile money payment is pending. */
function useOrder(number: string, token: string) {
  const [order, setOrder] = useState<OrderView | null>(null);
  const [notFound, setNotFound] = useState(false);
  // Bumped after a payment retry to start polling again.
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (!number || !token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotFound(true);
      return;
    }
    let stopped = false;
    let timer: number | undefined;
    const startedAt = Date.now();

    const load = async () => {
      const result = await getOrder(number, token);
      if (stopped) return;
      if (!result.ok) {
        if (result.error === "order_not_found") setNotFound(true);
      } else {
        setOrder(result.data);
        if (stateOf(result.data) !== "awaitingPayment") return;
      }
      // The webhook marks the order paid on the server; keep checking for a while.
      if (Date.now() - startedAt < POLL_FOR_MS)
        timer = window.setTimeout(load, POLL_MS);
    };
    void load();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [number, token, run]);

  return { order, notFound, restart: () => setRun((r) => r + 1) };
}

export default function ConfirmationView() {
  const t = useTranslations("Confirmation");
  const tCheckout = useTranslations("Checkout");
  const formatPrice = useFormatPrice();
  const variantLabel = useVariantLabel();
  const router = useRouter();
  const params = useSearchParams();
  const number = params.get("order") ?? "";
  const token = params.get("token") ?? "";
  const { order, notFound, restart } = useOrder(number, token);
  const [retryPhone, setRetryPhone] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  if (notFound)
    return (
      <main className="page container confirmation">
        <h1>{t("notFound.title")}</h1>
        <p>{t("notFound.copy")}</p>
        <Button onClick={() => router.push("/shop")}>{t("backToShop")}</Button>
      </main>
    );

  if (!order)
    return (
      <main className="page container confirmation">
        <p>{t("loading")}</p>
      </main>
    );

  const state = stateOf(order);
  const total = order.totalXaf === null ? "" : formatPrice(order.totalXaf);

  const retry = async () => {
    setRetrying(true);
    setRetryError(null);
    const result = await retryPayment(
      order.number,
      token,
      retryPhone.trim() || null,
    );
    setRetrying(false);
    if (!result.ok) {
      setRetryError(
        t.has(`retryErrors.${result.error}` as "retryErrors.default")
          ? t(`retryErrors.${result.error}` as "retryErrors.default")
          : t("retryErrors.default"),
      );
      return;
    }
    restart();
  };

  const failureCode = order.payment?.failureCode ?? "default";
  const failureText = t.has(`failures.${failureCode}` as "failures.default")
    ? t(`failures.${failureCode}` as "failures.default")
    : t("failures.default");

  return (
    <main className="page container confirmation">
      <div className="success-mark">
        <Icon
          name={
            state === "paymentFailed" || state === "cancelled"
              ? "close"
              : "check"
          }
        />
      </div>
      <span className="eyebrow">{t(`states.${state}.eyebrow`)}</span>
      <h1>{t("title", { name: order.customerFirstName })}</h1>
      <p>
        {t.rich("orderNumber", {
          orderNumber: order.number,
          b: (chunks) => <b>{chunks}</b>,
        })}
      </p>

      <section className="confirmation-card">
        <div className="notice">
          <h2>{t(`states.${state}.title`)}</h2>
          {state === "awaitingPayment" && (
            <p>
              {t("states.awaitingPayment.copy", {
                total,
                hint: order.payment?.phoneHint ?? "",
              })}
            </p>
          )}
          {state === "paymentFailed" && (
            <>
              <p>{failureText}</p>
              <label>
                {t("states.paymentFailed.phone")}
                <input
                  type="tel"
                  value={retryPhone}
                  onChange={(e) => setRetryPhone(e.target.value)}
                  placeholder={`•••• ${order.payment?.phoneHint ?? ""}`}
                />
              </label>
              {retryError && <p className="form-error">{retryError}</p>}
              <Button onClick={retry} disabled={retrying}>
                {retrying
                  ? t("states.paymentFailed.retrying")
                  : t("states.paymentFailed.retry")}
              </Button>
            </>
          )}
          {state !== "awaitingPayment" && state !== "paymentFailed" && (
            <p>{t(`states.${state}.copy`)}</p>
          )}
        </div>

        {order.items.map((item) => (
          <div className="order-product" key={item.sku}>
            <img src={item.imageUrl ?? ""} alt={item.productName} />
            <div>
              <b>
                {item.productName}
                {item.quantity > 1 ? ` × ${item.quantity}` : ""}
              </b>
              <small>{variantLabel(item)}</small>
            </div>
            <strong>{formatPrice(item.lineTotalXaf)}</strong>
          </div>
        ))}

        <div className="receipt">
          <p>
            <span>{t("delivery")}</span>
            <b>
              {tCheckout(
                `delivery.options.${order.delivery.method as DeliveryCode}.title`,
              )}
            </b>
          </p>
          {order.paymentMethod && (
            <p>
              <span>{t("payment")}</span>
              <b>{tCheckout(`payment.methods.${order.paymentMethod}.title`)}</b>
            </p>
          )}
          <p>
            <span>{t("deliveryFee")}</span>
            <b>
              {order.deliveryFeeXaf === null
                ? t("onQuote")
                : order.deliveryFeeXaf === 0
                  ? t("free")
                  : formatPrice(order.deliveryFeeXaf)}
            </b>
          </p>
          <p>
            <span>{t("total")}</span>
            <b>{order.totalXaf === null ? t("onQuote") : total}</b>
          </p>
        </div>
      </section>
      <div className="button-row">
        <Button onClick={() => router.push("/tracking")}>{t("track")}</Button>
        <Button variant="outline" onClick={() => router.push("/shop")}>
          {t("backToShop")}
        </Button>
      </div>
    </main>
  );
}
