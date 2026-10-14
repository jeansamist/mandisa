"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  placeOrder,
  startCheckout,
  trackCheckout,
} from "@/lib/checkout-actions";
import {
  orderConfirmationHref,
  type CheckoutEvent,
  type DeliveryOption,
  type PaymentMethodCode,
} from "@/lib/checkout";
import { useFormatPrice } from "@/lib/format";
import { trackEvent, visitorId } from "@/lib/tracker";
import { Button, Icon, Logo } from "@/components/ui";
import { useShop } from "@/components/shop-provider";
import { ease } from "@/components/motion";
import { useQuote, useVariantLabel } from "@/views/cart";

const stepKeys = ["info", "delivery", "payment"] as const;
const SESSION_KEY = "mandisa.checkout";

type DeliveryCode =
  "douala_home" | "bali_pickup" | "other_city" | "international";

function isMobileMoney(method: PaymentMethodCode | null) {
  return method === "mtn_momo" || method === "orange_money";
}

/**
 * The checkout session (tracked by the API) and the idempotency key of the
 * order, kept for the tab so a reload or a double click never creates two orders.
 */
function useCheckoutSession() {
  const locale = useLocale();
  const { cart, cartLoaded } = useShop();
  const [session, setSession] = useState<{
    sessionId: string | null;
    idempotencyKey: string;
  } | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!cartLoaded || cart.length === 0 || started.current) return;
    started.current = true;
    try {
      const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null");
      if (saved?.idempotencyKey) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSession(saved);
        return;
      }
    } catch {
      // Storage unavailable: a new session is started below.
    }
    const idempotencyKey = crypto.randomUUID();
    void startCheckout(locale, cart, visitorId()).then((result) => {
      const next = {
        sessionId: result.ok ? result.data.id : null,
        idempotencyKey,
      };
      setSession(next);
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
      } catch {
        // Ignored: tracking still works for this page view.
      }
    });
  }, [cart, cartLoaded, locale]);

  const track = (event: CheckoutEvent) => {
    if (session?.sessionId) void trackCheckout(session.sessionId, event);
  };
  /** Forgets the session and its key: the next visit starts a new checkout. */
  const reset = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Nothing to clean.
    }
    started.current = false;
    setSession(null);
  };
  return { session, track, reset };
}

export default function CheckoutView() {
  const t = useTranslations("Checkout");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const formatPrice = useFormatPrice();
  const variantLabel = useVariantLabel();
  const router = useRouter();
  const { cart, cartLoaded, clearCart } = useShop();
  const { session, track, reset } = useCheckoutSession();

  const [step, setStep] = useState(1);
  const [contact, setContact] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });
  const [delivery, setDelivery] = useState({
    method: "",
    city: "",
    district: "",
    landmark: "",
    address: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodCode | null>(
    null,
  );
  const [paymentPhone, setPaymentPhone] = useState("");
  const [reference, setReference] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const orderPlaced = useRef(false);

  // Next.js keeps visited pages alive (hidden) with their state. Once an order
  // is placed, reset the checkout when it is hidden so coming back starts a new
  // one instead of showing "Sending…". Contact and address stay prefilled.
  useLayoutEffect(
    () => () => {
      if (!orderPlaced.current) return;
      orderPlaced.current = false;
      setStep(1);
      setPlacing(false);
      setPaymentMethod(null);
      setReference("");
      setAcceptTerms(false);
      setError(null);
    },
    [],
  );

  const { quote } = useQuote(delivery.method || null);
  const selectedDelivery =
    quote?.deliveryOptions.find((d) => d.code === delivery.method) ?? null;
  const needsQuote = selectedDelivery?.feeXaf === null;
  const methods = quote?.paymentMethods ?? [];
  // A delivery change can make the chosen payment method unavailable.
  const chosenPayment =
    paymentMethod && methods.includes(paymentMethod) ? paymentMethod : null;

  useEffect(() => {
    if (cartLoaded && cart.length === 0 && !placing) router.replace("/cart");
  }, [cartLoaded, cart.length, placing, router]);

  useEffect(() => {
    track({ type: "step_viewed", step: stepKeys[step - 1]! });
    // Track each step once when it is shown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, session?.sessionId]);

  const goTo = (next: number) => {
    setError(null);
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitInfo = () => {
    const phoneDigits = contact.phone.replace(/\D/g, "");
    if (
      !contact.firstName.trim() ||
      !contact.lastName.trim() ||
      !contact.phone.trim()
    ) {
      return setError("required");
    }
    if (phoneDigits.length < 8) return setError("invalid_phone");
    track({
      type: "contact_submitted",
      contact: { ...contact, email: contact.email.trim() || null },
    });
    if (!paymentPhone) setPaymentPhone(contact.phone);
    goTo(2);
  };

  const submitDelivery = () => {
    if (!selectedDelivery) return setError("choose_delivery");
    if (
      selectedDelivery.requiresAddress &&
      !delivery.address.trim() &&
      !delivery.district.trim()
    ) {
      return setError("address_required");
    }
    track({ type: "delivery_selected", method: selectedDelivery.code });
    goTo(3);
  };

  const choosePayment = (method: PaymentMethodCode) => {
    setPaymentMethod(method);
    track({ type: "payment_selected", method });
  };

  const submitOrder = async () => {
    if (!session || !quote) return;
    if (!needsQuote && !chosenPayment) return setError("choose_payment");
    if (!acceptTerms) return setError("terms");
    setError(null);
    setPlacing(true);
    const result = await placeOrder({
      sessionId: session.sessionId,
      idempotencyKey: session.idempotencyKey,
      locale,
      cart,
      customer: {
        firstName: contact.firstName.trim(),
        lastName: contact.lastName.trim(),
        phone: contact.phone,
        email: contact.email.trim() || null,
      },
      delivery: {
        method: delivery.method,
        ...(selectedDelivery?.requiresAddress
          ? {
              city: delivery.city,
              district: delivery.district,
              landmark: delivery.landmark,
              address: delivery.address,
            }
          : {}),
      },
      paymentMethod: needsQuote ? null : chosenPayment,
      paymentPhone: isMobileMoney(chosenPayment) ? paymentPhone : null,
      transferReference:
        chosenPayment === "bank_transfer" ? reference.trim() || null : null,
      acceptTerms: true,
      marketingOptIn,
    }).catch(() => ({ ok: false as const, error: "network" }));
    if (!result.ok) {
      setPlacing(false);
      return setError(result.error);
    }
    orderPlaced.current = true;
    trackEvent("order_placed", {
      orderNumber: result.data.number,
      status: result.data.status,
      paymentMethod: result.data.paymentMethod,
      totalXaf: result.data.totalXaf,
    });
    reset();
    clearCart();
    router.push(
      orderConfirmationHref(result.data.number, result.data.accessToken),
    );
  };

  const feeLabel = (option: DeliveryOption) =>
    option.feeXaf === null
      ? t("delivery.onQuote")
      : option.feeXaf === 0
        ? t("delivery.free")
        : formatPrice(option.feeXaf);

  const errorText = error
    ? t.has(`errors.${error}` as "errors.generic")
      ? t(`errors.${error}` as "errors.generic")
      : t("errors.generic")
    : null;

  const stepLabel = (
    <span className="eyebrow">
      {t("stepOf", { step, total: stepKeys.length })}
    </span>
  );

  return (
    <main className="page container checkout">
      <div className="checkout__head">
        <Logo />
        <button onClick={() => router.push("/cart")}>
          <Icon name="bag" /> {t("backToCart")}
        </button>
      </div>
      <div className="progress">
        {stepKeys.map((key, i) => (
          <div className={step >= i + 1 ? "active" : ""} key={key}>
            <span>{step > i + 1 ? "✓" : i + 1}</span>
            <b>{t(`steps.${key}`)}</b>
          </div>
        ))}
      </div>
      <div className="checkout-layout">
        <section className="checkout-form">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`step-${step}`}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease }}
            >
              {stepLabel}
              {step === 1 && (
                <>
                  <h1>{t("info.title")}</h1>
                  <div className="choice">
                    <button className="active">{t("info.guest")}</button>
                    <button>{t("info.createAccount")}</button>
                  </div>
                  <div className="form-grid">
                    <label>
                      {t("info.firstName")}
                      <input
                        autoComplete="given-name"
                        value={contact.firstName}
                        onChange={(e) =>
                          setContact({ ...contact, firstName: e.target.value })
                        }
                        placeholder={t("info.firstNamePlaceholder")}
                      />
                    </label>
                    <label>
                      {t("info.lastName")}
                      <input
                        autoComplete="family-name"
                        value={contact.lastName}
                        onChange={(e) =>
                          setContact({ ...contact, lastName: e.target.value })
                        }
                        placeholder={t("info.lastNamePlaceholder")}
                      />
                    </label>
                    <label>
                      {t("info.phone")}
                      <input
                        type="tel"
                        autoComplete="tel"
                        value={contact.phone}
                        onChange={(e) =>
                          setContact({ ...contact, phone: e.target.value })
                        }
                        placeholder={t("info.phonePlaceholder")}
                      />
                      <small>{t("info.phoneHint")}</small>
                    </label>
                    <label>
                      {t("info.email")}
                      <input
                        type="email"
                        autoComplete="email"
                        value={contact.email}
                        onChange={(e) =>
                          setContact({ ...contact, email: e.target.value })
                        }
                        placeholder={t("info.emailPlaceholder")}
                      />
                    </label>
                  </div>
                  {errorText && <p className="form-error">{errorText}</p>}
                  <Button onClick={submitInfo}>
                    {t("info.next")} <Icon name="arrow" />
                  </Button>
                </>
              )}
              {step === 2 && (
                <>
                  <h1>{t("delivery.title")}</h1>
                  <div className="radio-cards">
                    {quote?.deliveryOptions.map((option) => (
                      <button
                        className={
                          delivery.method === option.code ? "selected" : ""
                        }
                        onClick={() =>
                          setDelivery({
                            ...delivery,
                            method: option.code,
                            city:
                              option.code === "douala_home"
                                ? "Douala"
                                : delivery.city,
                          })
                        }
                        key={option.code}
                      >
                        <i />{" "}
                        <span>
                          <b>
                            {t(
                              `delivery.options.${option.code as DeliveryCode}.title`,
                            )}{" "}
                            · {feeLabel(option)}
                          </b>
                          <small>
                            {t(
                              `delivery.options.${option.code as DeliveryCode}.detail`,
                            )}
                          </small>
                        </span>
                      </button>
                    ))}
                  </div>
                  {selectedDelivery?.requiresAddress && (
                    <div className="form-grid">
                      <label>
                        {t("delivery.city")}
                        <input
                          autoComplete="address-level2"
                          value={delivery.city}
                          onChange={(e) =>
                            setDelivery({ ...delivery, city: e.target.value })
                          }
                          placeholder={t("delivery.cityPlaceholder")}
                        />
                      </label>
                      <label>
                        {t("delivery.district")}
                        <input
                          value={delivery.district}
                          onChange={(e) =>
                            setDelivery({
                              ...delivery,
                              district: e.target.value,
                            })
                          }
                          placeholder={t("delivery.districtPlaceholder")}
                        />
                      </label>
                      <label>
                        {t("delivery.landmark")}
                        <input
                          value={delivery.landmark}
                          onChange={(e) =>
                            setDelivery({
                              ...delivery,
                              landmark: e.target.value,
                            })
                          }
                          placeholder={t("delivery.landmarkPlaceholder")}
                        />
                      </label>
                      <label>
                        {t("delivery.address")}
                        <input
                          autoComplete="street-address"
                          value={delivery.address}
                          onChange={(e) =>
                            setDelivery({
                              ...delivery,
                              address: e.target.value,
                            })
                          }
                          placeholder={t("delivery.addressPlaceholder")}
                        />
                      </label>
                    </div>
                  )}
                  {errorText && <p className="form-error">{errorText}</p>}
                  <div className="button-row">
                    <Button variant="outline" onClick={() => goTo(1)}>
                      {tCommon("back")}
                    </Button>
                    <Button onClick={submitDelivery}>
                      {t("delivery.next")} <Icon name="arrow" />
                    </Button>
                  </div>
                </>
              )}
              {step === 3 && (
                <>
                  <h1>{t("payment.title")}</h1>
                  {needsQuote ? (
                    <p className="payment-note">{t("payment.quoteNote")}</p>
                  ) : methods.length === 0 ? (
                    <p className="payment-note">{t("payment.noMethods")}</p>
                  ) : (
                    <div className="radio-cards payment">
                      {methods.map((method) => (
                        <button
                          className={chosenPayment === method ? "selected" : ""}
                          onClick={() => choosePayment(method)}
                          key={method}
                        >
                          <i />
                          <span>
                            <b>{t(`payment.methods.${method}.title`)}</b>
                            <small>
                              {t(`payment.methods.${method}.detail`)}
                            </small>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {isMobileMoney(chosenPayment) && (
                    <label>
                      {t("payment.paymentPhone")}
                      <input
                        type="tel"
                        value={paymentPhone}
                        onChange={(e) => setPaymentPhone(e.target.value)}
                        placeholder={t("info.phonePlaceholder")}
                      />
                      <small>{t("payment.paymentPhoneHint")}</small>
                    </label>
                  )}
                  {chosenPayment === "bank_transfer" && (
                    <label>
                      {t("payment.reference")}
                      <input
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder={t("payment.referencePlaceholder")}
                      />
                    </label>
                  )}
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                    />{" "}
                    {t("payment.acceptTerms")}
                  </label>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={marketingOptIn}
                      onChange={(e) => setMarketingOptIn(e.target.checked)}
                    />{" "}
                    {t("payment.marketingOptIn")}
                  </label>
                  {!needsQuote && (
                    <p className="payment-note">{t("payment.note")}</p>
                  )}
                  {errorText && <p className="form-error">{errorText}</p>}
                  <div className="button-row">
                    <Button variant="outline" onClick={() => goTo(2)}>
                      {tCommon("back")}
                    </Button>
                    <Button
                      onClick={submitOrder}
                      disabled={
                        placing ||
                        !session ||
                        (!needsQuote && methods.length === 0)
                      }
                    >
                      {placing
                        ? t("payment.placing")
                        : needsQuote
                          ? t("payment.sendQuote")
                          : t("payment.confirm")}
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </section>
        <aside className="summary order-summary">
          <h2>{t("summary.title")}</h2>
          {quote?.lines.map((line) => (
            <div className="order-product" key={line.sku}>
              <img src={line.imageUrl ?? ""} alt={line.productName} />
              <div>
                <b>
                  {line.productName}
                  {line.quantity > 1 ? ` × ${line.quantity}` : ""}
                </b>
                <small>{variantLabel(line)}</small>
              </div>
              <strong>{formatPrice(line.lineTotalXaf, false)}</strong>
            </div>
          ))}
          <p>
            <span>{t("summary.subtotal")}</span>
            <b>{quote ? formatPrice(quote.subtotalXaf) : "—"}</b>
          </p>
          <p>
            <span>{t("summary.delivery")}</span>
            <b>
              {!selectedDelivery
                ? t("summary.toChoose")
                : selectedDelivery.feeXaf === null
                  ? t("summary.onQuote")
                  : selectedDelivery.feeXaf === 0
                    ? t("summary.free")
                    : formatPrice(selectedDelivery.feeXaf)}
            </b>
          </p>
          <hr />
          <p className="total">
            <span>{t("summary.total")}</span>
            <b>
              {quote ? formatPrice(quote.totalXaf ?? quote.subtotalXaf) : "—"}
            </b>
          </p>
        </aside>
      </div>
    </main>
  );
}
