"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Icon } from "@/components/ui";
import { useShop } from "@/components/shop-provider";
import { useSiteImage } from "@/components/site-data-provider";
import { AnimatePresence } from "motion/react";
import { Collapse, Reveal, stagger } from "@/components/motion";

export type InfoPage = "care" | "delivery" | "about";

const infoItems = {
  care: ["beforeWearing", "washing", "drying", "styling", "storage"],
  delivery: ["douala", "bali", "otherCities", "preorder", "returns", "damaged"],
  about: ["natural", "care", "trust"],
} as const;

export function InfoView({ type }: { type: InfoPage }) {
  const t = useTranslations("Info");
  const { setAssistantOpen } = useShop();
  const image = useSiteImage();
  // Message keys are checked per page type; widen here so one view serves all three pages.
  const tPage = useTranslations(`Info.${type}`) as unknown as (
    key: string,
  ) => string;
  return (
    <main className="page">
      <section className="info-hero container">
        <Reveal>
          <span className="eyebrow">{tPage("eyebrow")}</span>
          <h1>{tPage("title")}</h1>
          <p>{tPage("intro")}</p>
        </Reveal>
        <Reveal delay={0.15} y={40}>
          <img src={image(`info.${type}`)} alt="" />
        </Reveal>
      </section>
      <section className="container info-list">
        {infoItems[type].map((key, i) => (
          <Reveal as="article" key={key} delay={stagger(i, 2)}>
            <span>0{i + 1}</span>
            <div>
              <h2>{tPage(`items.${key}.title`)}</h2>
              <p>{tPage(`items.${key}.text`)}</p>
            </div>
          </Reveal>
        ))}
      </section>
      <Reveal as="section" className="cta-band">
        <h2>{type === "care" ? t("cta.careTitle") : t("cta.defaultTitle")}</h2>
        <p>{t("cta.copy")}</p>
        <Button variant="light" onClick={() => setAssistantOpen(true)}>
          {t("cta.button")}
        </Button>
      </Reveal>
    </main>
  );
}

const faqTabs = ["ordering", "payment", "delivery", "returns", "care"] as const;
const faqQuestions = [
  "howToOrder",
  "paymentMethods",
  "payOnDelivery",
  "preorder",
  "deliveryTime",
  "shipping",
  "returns",
  "care",
  "human",
] as const;

export function FaqView() {
  const t = useTranslations("Faq");
  const [open, setOpen] = useState(0);
  return (
    <main className="page container narrow">
      <span className="eyebrow">{t("eyebrow")}</span>
      <h1>{t("title")}</h1>
      <div className="faq-tabs">
        {faqTabs.map((key, i) => (
          <button className={i === 0 ? "active" : ""} key={key}>
            {t(`tabs.${key}`)}
          </button>
        ))}
      </div>
      <div className="faq-list">
        {faqQuestions.map((key, i) => (
          <Reveal as="article" key={key} delay={stagger(i, 9, 0.05)} y={16}>
            <button onClick={() => setOpen(open === i ? -1 : i)}>
              <h3>{t(`questions.${key}`)}</h3>
              <Icon name={open === i ? "minus" : "plus"} />
            </button>
            <AnimatePresence initial={false}>
              {open === i && (
                <Collapse>
                  <p>{t("answer")}</p>
                </Collapse>
              )}
            </AnimatePresence>
          </Reveal>
        ))}
      </div>
      <Reveal className="help-banner">
        <section>
          <span className="eyebrow eyebrow--light">{t("help.eyebrow")}</span>
          <h2>{t("help.title")}</h2>
        </section>
        <Button variant="light">{t("help.cta")}</Button>
      </Reveal>
    </main>
  );
}

export function ContactView() {
  const t = useTranslations("Contact");
  const channels = [
    [t("channels.whatsapp"), "+237 650 911 804"],
    [t("channels.email"), t("emailPending")],
    [t("channels.instagram"), "@mandisa"],
    [t("channels.tiktok"), "@mandisa"],
  ];
  return (
    <main className="page container">
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t("eyebrow")}</span>
          <h1>{t("title")}</h1>
          <p>{t("intro")}</p>
        </div>
      </div>
      <div className="contact-grid">
        {channels.map(([label, value], i) => (
          <Reveal
            as="article"
            key={label}
            delay={stagger(i)}
            whileHover={{ y: -6 }}
          >
            <span>{label}</span>
            <h2>{value}</h2>
            <button>
              {t("cta")} <Icon name="arrow" />
            </button>
          </Reveal>
        ))}
      </div>
      <Reveal as="section" className="contact-form">
        <div>
          <span className="eyebrow">{t("pickup.eyebrow")}</span>
          <h2>{t.rich("pickup.address", { br: () => <br /> })}</h2>
          <div className="map">
            DOUALA <i>Bali</i>
          </div>
        </div>
        <form>
          <label>
            {t("form.name")}
            <input placeholder={t("form.namePlaceholder")} />
          </label>
          <label>
            {t("form.phone")}
            <input placeholder="+237" />
          </label>
          <label>
            {t("form.message")}
            <textarea placeholder={t("form.messagePlaceholder")} />
          </label>
          <Button>{t("form.submit")}</Button>
        </form>
      </Reveal>
    </main>
  );
}
