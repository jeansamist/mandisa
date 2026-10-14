"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { type CapSize, type ProductDetail } from "@/lib/catalog";
import { useFormatPrice, useStatusLabel } from "@/lib/format";
import { useCatalog } from "@/components/site-data-provider";
import { Button, Icon, SectionTitle } from "@/components/ui";
import ProductCard from "@/components/product-card";
import { useShop } from "@/components/shop-provider";
import { AnimatePresence } from "motion/react";
import { Collapse, Reveal, ZoomPanImg } from "@/components/motion";

const trustKeys = ["freeDelivery", "returns", "securePayment"] as const;
const accordionKeys = ["details", "accessories", "care", "delivery"] as const;
const capSizeOrder: CapSize[] = ["S", "M", "L"];

function preferred<T>(options: T[], value: T) {
  return options.includes(value) ? value : options[0]!;
}

export default function ProductView({ product }: { product: ProductDetail }) {
  const t = useTranslations("Product");
  const tCommon = useTranslations("Common");
  const tCatalog = useTranslations("Catalog");
  const formatPrice = useFormatPrice();
  const statusLabel = useStatusLabel();
  const locale = useLocale();
  const { addToCart } = useShop();
  const { products } = useCatalog();
  // Only one color is in the catalog for now; the extra swatches are from the design.
  const lengths = [...new Set(product.variants.map((v) => v.lengthInches))];
  const capSizes = capSizeOrder.filter((c) =>
    product.variants.some((v) => v.capSize === c),
  );
  const [length, setLength] = useState(() => preferred(lengths, 14));
  const [capSize, setCapSize] = useState(() => preferred(capSizes, "M"));
  const variant = product.variants.find(
    (v) => v.lengthInches === length && v.capSize === capSize,
  );
  const status = variant ?? product;
  const gallery = product.media.filter((m) => m.kind === "image").slice(1, 4);
  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState<string>("details");
  const texture = tCatalog(`textures.${product.texture}`);
  const related = products.filter((p) => p.code !== product.code).slice(0, 4);
  return (
    <main className="page container">
      <div className="breadcrumb">
        {tCommon("home")} / {tCommon("shop")} / <b>{product.name}</b>
      </div>
      <div className="product-detail">
        <div className="gallery">
          <div className="gallery__main">
            <ZoomPanImg
              src={product.image ?? ""}
              alt={t("imageAlt", { name: product.name })}
            />
            <span>IMG_product_{product.code}</span>
          </div>
          {gallery.map((m, i) => (
            <button key={i}>
              <img
                src={m.url}
                alt={t("galleryAlt", { name: product.name, index: i + 2 })}
              />
            </button>
          ))}
          <button className="video-thumb">
            <img
              src={product.image ?? ""}
              alt={t("videoAlt", { name: product.name })}
            />
            <i>▶</i>
          </button>
        </div>
        <Reveal as="section" className="product-info" delay={0.1}>
          <div className="product-info__top">
            <span className="tag">{texture}</span>
            <span>{product.code}</span>
          </div>
          <h1>{product.name}</h1>
          <div className="price">
            {formatPrice(variant?.priceXaf ?? product.priceXaf)}{" "}
            <small>{t("indicativePrice")}</small>
          </div>
          <p>
            {locale === "en" ? product.description.en : product.description.fr}
          </p>
          <hr />
          <fieldset>
            <legend>
              {t("length")} <b>{length}"</b>
            </legend>
            <div className="variant-row">
              {lengths.map((x) => (
                <button
                  className={length === x ? "selected" : ""}
                  onClick={() => setLength(x)}
                  key={x}
                >
                  {x}"
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>
              {t("color")} <b>{t("colors.naturalBlack")}</b>
            </legend>
            <div className="swatches">
              <button
                className="selected black"
                aria-label={t("colors.naturalBlack")}
              />
              <button className="brown" aria-label={t("colors.deepBrown")} />
              <button className="warm" aria-label={t("colors.warmBrown")} />
            </div>
          </fieldset>
          <fieldset>
            <legend>
              {t("capSize")} <button>{t("sizeGuide")}</button>
            </legend>
            <div className="variant-row">
              {capSizes.map((x) => (
                <button
                  className={capSize === x ? "selected" : ""}
                  onClick={() => setCapSize(x)}
                  key={x}
                >
                  {x}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="stock">
            <i />
            <div>
              <b>
                {status.status === "inStock"
                  ? t("stockTitle")
                  : statusLabel(status)}
              </b>
              <span>{t("stockNote")}</span>
            </div>
          </div>
          <div className="buy-row">
            <div className="quantity">
              <button
                aria-label={tCommon("decreaseQuantity")}
                onClick={() => setQty(Math.max(1, qty - 1))}
              >
                <Icon name="minus" />
              </button>
              <span>{qty}</span>
              <button
                aria-label={tCommon("increaseQuantity")}
                onClick={() => setQty(qty + 1)}
              >
                <Icon name="plus" />
              </button>
            </div>
            <Button onClick={addToCart} disabled={status.status === "soldOut"}>
              {tCommon("addToCart")} <Icon name="bag" />
            </Button>
          </div>
          <Button variant="outline">{t("orderOnWhatsapp")}</Button>
          <div className="micro-trust">
            {trustKeys.map((key) => (
              <span key={key}>
                <Icon name="check" />
                {t(`trust.${key}`)}
              </span>
            ))}
          </div>
          <div className="accordions">
            {accordionKeys.map((key) => (
              <article key={key}>
                <button onClick={() => setOpen(open === key ? "" : key)}>
                  <b>{t(`accordions.${key}`)}</b>
                  <Icon name={open === key ? "minus" : "plus"} />
                </button>
                <AnimatePresence initial={false}>
                  {open === key && (
                    <Collapse>
                      <p>
                        {key === "details"
                          ? t("detailsText", { texture })
                          : t("genericText")}
                      </p>
                    </Collapse>
                  )}
                </AnimatePresence>
              </article>
            ))}
          </div>
        </Reveal>
      </div>
      <section className="section related">
        <SectionTitle
          eyebrow={t("related.eyebrow")}
          title={t("related.title")}
        />
        <div className="product-grid product-grid--feature">
          {related.map((p, i) => (
            <ProductCard key={p.code} product={p} index={i} />
          ))}
        </div>
      </section>
    </main>
  );
}
