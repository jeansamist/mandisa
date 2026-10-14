"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { textures } from "@/lib/catalog";
import { useCatalog, useSiteImage } from "@/components/site-data-provider";
import { Button, Icon, SectionTitle } from "@/components/ui";
import { ChatPreview } from "@/components/assistant";
import ProductCard from "@/components/product-card";
import { useShop } from "@/components/shop-provider";
import {
  MouseLayer,
  MouseParallaxArea,
  ParallaxImg,
  Reveal,
  stagger,
} from "@/components/motion";

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
      <MouseParallaxArea className="hero">
        <ParallaxImg
          src={image("hero")}
          alt={t("hero.imageAlt")}
          distance={70}
          mouseDepth={-24}
          scale={1.18}
        />
        <div className="hero__shade" />
        <MouseLayer className="hero__copy" depth={14}>
          <Reveal as="span" className="eyebrow eyebrow--light" delay={0.1}>
            {t("hero.eyebrow")}
          </Reveal>
          {/* The slogan is never translated. */}
          <Reveal as="h1" delay={0.2} y={40}>
            Made to look
            <br />
            <em>like you.</em>
          </Reveal>
          <Reveal as="p" delay={0.35}>
            {t("hero.intro")}
          </Reveal>
          <Reveal className="button-row" delay={0.5}>
            <Button variant="light" onClick={() => router.push("/shop")}>
              {t("hero.cta")} <Icon name="arrow" />
            </Button>
            <Button variant="outline" onClick={() => setAssistantOpen(true)}>
              {t("hero.advice")}
            </Button>
          </Reveal>
        </MouseLayer>
        <span className="hero__caption">{t("hero.caption")}</span>
      </MouseParallaxArea>
      <section className="trust-strip">
        {trustKeys.map((key, i) => (
          <Reveal key={key} delay={stagger(i)} y={16}>
            <span>0{i + 1}</span>
            <b>{t(`trust.${key}`)}</b>
          </Reveal>
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
              <Reveal
                as="article"
                className={`texture-card texture-card--${i + 1}`}
                key={texture}
                delay={stagger(i)}
                y={48}
              >
                <ParallaxImg
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
              </Reveal>
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
            {products.slice(0, 4).map((p, i) => (
              <ProductCard key={p.code} product={p} index={i} />
            ))}
          </div>
          <Reveal className="center">
            <Button variant="outline" onClick={() => router.push("/shop")}>
              {t("collection.cta")} <Icon name="arrow" />
            </Button>
          </Reveal>
        </div>
      </section>
      <section className="manifesto">
        <div className="container">
          <Reveal as="span" className="eyebrow eyebrow--light">
            {t("manifesto.eyebrow")}
          </Reveal>
          <Reveal as="h2" delay={0.1} y={40}>
            {t.rich("manifesto.title", { em: (chunks) => <em>{chunks}</em> })}
          </Reveal>
          <div className="pillars">
            {pillarKeys.map((key, i) => (
              <Reveal as="article" key={key} delay={stagger(i)}>
                <span>0{i + 1}</span>
                <h3>{t(`manifesto.pillars.${key}.title`)}</h3>
                <p>{t(`manifesto.pillars.${key}.text`)}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="section container advisor">
        <Reveal className="advisor__copy">
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
        </Reveal>
        <ChatPreview />
      </section>
      <section className="section container how">
        <SectionTitle eyebrow={t("how.eyebrow")} title={t("how.title")} />
        <div className="steps">
          {stepKeys.map((key, i) => (
            <Reveal as="article" key={key} delay={stagger(i)}>
              <b>0{i + 1}</b>
              <h3>{t(`how.steps.${key}.title`)}</h3>
              <p>{t(`how.steps.${key}.text`)}</p>
            </Reveal>
          ))}
        </div>
      </section>
      <Reveal as="section" className="care-banner container" y={48}>
        <ParallaxImg
          src={image("careBanner")}
          alt={t("care.imageAlt")}
          distance={60}
        />
        <Reveal delay={0.15}>
          <span className="eyebrow">{t("care.eyebrow")}</span>
          <h2>{t("care.title")}</h2>
          <p>{t("care.copy")}</p>
          <Button variant="light" onClick={() => router.push("/care")}>
            {t("care.cta")} <Icon name="arrow" />
          </Button>
        </Reveal>
      </Reveal>
      <Reveal as="section" className="newsletter">
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
      </Reveal>
    </main>
  );
}
