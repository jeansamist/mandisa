"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { textures } from "@/lib/catalog";
import { useCatalog, useSiteImage } from "@/components/site-data-provider";
import { Button, Icon, SectionTitle } from "@/components/ui";
import { ChatPreview } from "@/components/assistant";
import ProductCard from "@/components/product-card";
import { useShop } from "@/components/shop-provider";

const trustKeys = [
  "readyToWear",
  "accessories",
  "freeDelivery",
  "support",
] as const;
const pillarKeys = ["readyToWear", "accessories", "origin", "support"] as const;
const chipKeys = ["texture", "length", "order", "care"] as const;
const stepKeys = ["choose", "pay", "receive"] as const;

export default function HomeView() {
  const t = useTranslations("Home");
  const tCatalog = useTranslations("Catalog");
  const router = useRouter();
  const { setAssistantOpen } = useShop();
  const { products } = useCatalog();
  const image = useSiteImage();
  return (
    <main>
      <section className="hero">
        <img src={image("hero")} alt={t("hero.imageAlt")} />
        <div className="hero__shade" />
        <div className="hero__copy">
          <span className="eyebrow eyebrow--light">{t("hero.eyebrow")}</span>
          {/* The slogan is never translated. */}
          <h1>
            Made to look
            <br />
            <em>like you.</em>
          </h1>
          <p>{t("hero.intro")}</p>
          <div className="button-row">
            <Button variant="light" onClick={() => router.push("/shop")}>
              {t("hero.cta")} <Icon name="arrow" />
            </Button>
            <Button variant="outline" onClick={() => setAssistantOpen(true)}>
              {t("hero.advice")}
            </Button>
          </div>
        </div>
        <span className="hero__caption">{t("hero.caption")}</span>
      </section>
      <section className="trust-strip">
        {trustKeys.map((key, i) => (
          <div key={key}>
            <span>0{i + 1}</span>
            <b>{t(`trust.${key}`)}</b>
          </div>
        ))}
      </section>
      <section className="section container">
        <SectionTitle
          eyebrow={t("textures.eyebrow")}
          title={t("textures.title")}
          copy={t("textures.copy")}
        />
        <div className="texture-grid">
          {textures.map((texture, i) => {
            const name = tCatalog(`textures.${texture}`);
            return (
              <article
                className={`texture-card texture-card--${i + 1}`}
                key={texture}
              >
                <img
                  src={image(`texture.${texture}`)}
                  alt={t("textures.imageAlt", { name })}
                />
                <div>
                  <span>0{i + 1}</span>
                  <h3>{name}</h3>
                  <p>{t(`textures.descriptions.${texture}`)}</p>
                  <button onClick={() => router.push("/shop")}>
                    {t("textures.cta")} <Icon name="arrow" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <section className="section sand">
        <div className="container">
          <SectionTitle
            eyebrow={t("collection.eyebrow")}
            title={t("collection.title")}
            copy={t("collection.copy")}
          />
          <div className="product-grid product-grid--feature">
            {products.slice(0, 4).map((p) => (
              <ProductCard key={p.code} product={p} />
            ))}
          </div>
          <div className="center">
            <Button variant="outline" onClick={() => router.push("/shop")}>
              {t("collection.cta")} <Icon name="arrow" />
            </Button>
          </div>
        </div>
      </section>
      <section className="manifesto">
        <div className="container">
          <span className="eyebrow eyebrow--light">
            {t("manifesto.eyebrow")}
          </span>
          <h2>
            {t.rich("manifesto.title", { em: (chunks) => <em>{chunks}</em> })}
          </h2>
          <div className="pillars">
            {pillarKeys.map((key, i) => (
              <article key={key}>
                <span>0{i + 1}</span>
                <h3>{t(`manifesto.pillars.${key}.title`)}</h3>
                <p>{t(`manifesto.pillars.${key}.text`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section container advisor">
        <div className="advisor__copy">
          <span className="eyebrow">{t("advisor.eyebrow")}</span>
          <h2>{t("advisor.title")}</h2>
          <p>{t("advisor.copy")}</p>
          <div className="chips">
            {chipKeys.map((key) => (
              <span key={key}>{t(`advisor.chips.${key}`)}</span>
            ))}
          </div>
          <Button onClick={() => setAssistantOpen(true)}>
            {t("advisor.cta")} <Icon name="arrow" />
          </Button>
        </div>
        <ChatPreview />
      </section>
      <section className="section container how">
        <SectionTitle eyebrow={t("how.eyebrow")} title={t("how.title")} />
        <div className="steps">
          {stepKeys.map((key, i) => (
            <article key={key}>
              <b>0{i + 1}</b>
              <h3>{t(`how.steps.${key}.title`)}</h3>
              <p>{t(`how.steps.${key}.text`)}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="care-banner container">
        <img src={image("careBanner")} alt={t("care.imageAlt")} />
        <div>
          <span className="eyebrow">{t("care.eyebrow")}</span>
          <h2>{t("care.title")}</h2>
          <p>{t("care.copy")}</p>
          <Button variant="light" onClick={() => router.push("/care")}>
            {t("care.cta")} <Icon name="arrow" />
          </Button>
        </div>
      </section>
      <section className="newsletter">
        <div>
          <span className="eyebrow">{t("newsletter.eyebrow")}</span>
          <h2>{t("newsletter.title")}</h2>
        </div>
        <form onSubmit={(e) => e.preventDefault()}>
          <label>
            {t("newsletter.label")}
            <input placeholder={t("newsletter.placeholder")} />
          </label>
          <Button>{t("newsletter.submit")}</Button>
          <small>{t("newsletter.consent")}</small>
        </form>
      </section>
    </main>
  );
}
