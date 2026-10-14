"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useFormatPrice } from "@/lib/format";
import { Button, Icon, Logo } from "@/components/ui";
import { useShop } from "@/components/shop-provider";
import { useCatalog } from "@/components/site-data-provider";

const stepKeys = ["info", "delivery", "payment"] as const;
const deliveryKeys = ["douala", "bali", "otherCity", "international"] as const;
const paymentKeys = ["momo", "orange", "card", "transfer", "delivery"] as const;
type PaymentMethod = (typeof paymentKeys)[number];

export default function CheckoutView() {
  const t = useTranslations("Checkout");
  const tCommon = useTranslations("Common");
  const formatPrice = useFormatPrice();
  const router = useRouter();
  const { setCartCount } = useShop();
  const [step, setStep] = useState(1);
  const [payment, setPayment] = useState<PaymentMethod>("momo");
  // Mock order: a single line with the first product until the real cart exists.
  const item = useCatalog().find("MDS-W01");
  if (!item) return null;
  const stepLabel = (
    <span className="eyebrow">
      {t("stepOf", { step, total: stepKeys.length })}
    </span>
  );
  const onConfirm = () => {
    setCartCount(0);
    router.push("/order-confirmation");
  };
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
          {step === 1 && (
            <>
              {stepLabel}
              <h1>{t("info.title")}</h1>
              <div className="choice">
                <button className="active">{t("info.guest")}</button>
                <button>{t("info.createAccount")}</button>
              </div>
              <div className="form-grid">
                <label>
                  {t("info.firstName")}
                  <input placeholder={t("info.firstNamePlaceholder")} />
                </label>
                <label>
                  {t("info.lastName")}
                  <input placeholder={t("info.lastNamePlaceholder")} />
                </label>
                <label>
                  {t("info.phone")}
                  <input placeholder={t("info.phonePlaceholder")} />
                </label>
                <label>
                  {t("info.email")}
                  <input
                    type="email"
                    placeholder={t("info.emailPlaceholder")}
                  />
                </label>
              </div>
              <Button onClick={() => setStep(2)}>
                {t("info.next")} <Icon name="arrow" />
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              {stepLabel}
              <h1>{t("delivery.title")}</h1>
              <div className="radio-cards">
                {deliveryKeys.map((key, i) => (
                  <button className={i === 0 ? "selected" : ""} key={key}>
                    <i />{" "}
                    <span>
                      <b>{t(`delivery.options.${key}.title`)}</b>
                      <small>{t(`delivery.options.${key}.detail`)}</small>
                    </span>
                  </button>
                ))}
              </div>
              <div className="form-grid">
                <label>
                  {t("delivery.district")}
                  <input placeholder={t("delivery.districtPlaceholder")} />
                </label>
                <label>
                  {t("delivery.landmark")}
                  <input placeholder={t("delivery.landmarkPlaceholder")} />
                </label>
                <label className="wide">
                  {t("delivery.address")}
                  <input placeholder={t("delivery.addressPlaceholder")} />
                </label>
              </div>
              <div className="button-row">
                <Button variant="outline" onClick={() => setStep(1)}>
                  {tCommon("back")}
                </Button>
                <Button onClick={() => setStep(3)}>
                  {t("delivery.next")} <Icon name="arrow" />
                </Button>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              {stepLabel}
              <h1>{t("payment.title")}</h1>
              <div className="radio-cards payment">
                {paymentKeys.map((key) => (
                  <button
                    className={payment === key ? "selected" : ""}
                    onClick={() => setPayment(key)}
                    key={key}
                  >
                    <i />
                    <span>
                      <b>{t(`payment.methods.${key}.title`)}</b>
                      <small>{t(`payment.methods.${key}.detail`)}</small>
                    </span>
                  </button>
                ))}
              </div>
              {payment === "transfer" && (
                <label>
                  {t("payment.reference")}
                  <input placeholder={t("payment.referencePlaceholder")} />
                </label>
              )}
              <label className="checkbox">
                <input type="checkbox" /> {t("payment.acceptTerms")}
              </label>
              <label className="checkbox">
                <input type="checkbox" /> {t("payment.marketingOptIn")}
              </label>
              <p className="payment-note">{t("payment.note")}</p>
              <div className="button-row">
                <Button variant="outline" onClick={() => setStep(2)}>
                  {tCommon("back")}
                </Button>
                <Button onClick={onConfirm}>{t("payment.confirm")}</Button>
              </div>
            </>
          )}
        </section>
        <aside className="summary order-summary">
          <h2>{t("summary.title")}</h2>
          <div className="order-product">
            <img src={item.image ?? ""} alt={item.name} />
            <div>
              <b>{item.name}</b>
              <small>{t("summary.variant")}</small>
            </div>
            <strong>{formatPrice(item.priceXaf, false)}</strong>
          </div>
          <p>
            <span>{t("summary.subtotal")}</span>
            <b>{formatPrice(item.priceXaf)}</b>
          </p>
          <p>
            <span>{t("summary.delivery")}</span>
            <b>{t("summary.free")}</b>
          </p>
          <hr />
          <p className="total">
            <span>{t("summary.total")}</span>
            <b>{formatPrice(item.priceXaf)}</b>
          </p>
        </aside>
      </div>
    </main>
  );
}
