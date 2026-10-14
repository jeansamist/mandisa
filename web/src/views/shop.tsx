"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { textures, type Texture } from "@/lib/catalog";
import { useCatalog } from "@/components/site-data-provider";
import { Button, Icon } from "@/components/ui";
import ProductCard from "@/components/product-card";
import { useShop } from "@/components/shop-provider";

const refineKeys = ["length", "color", "capSize", "availability"] as const;

export default function ShopView() {
  const t = useTranslations("Shop");
  const tCommon = useTranslations("Common");
  const tCatalog = useTranslations("Catalog");
  const { setAssistantOpen } = useShop();
  const { products } = useCatalog();
  const [filter, setFilter] = useState<Texture | "all">("all");
  const visible =
    filter === "all" ? products : products.filter((p) => p.texture === filter);
  return (
    <main className="page container">
      <div className="breadcrumb">
        {tCommon("home")} / <b>{tCommon("shop")}</b>
      </div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{t("eyebrow")}</span>
          <h1>{t("title")}</h1>
          <p>{t("intro", { count: products.length })}</p>
        </div>
        <div className="collection-number">
          {String(products.length).padStart(2, "0")} <span>{t("models")}</span>
        </div>
      </div>
      <div className="filters">
        {(["all", ...textures] as const).map((x) => (
          <button
            className={filter === x ? "active" : ""}
            onClick={() => setFilter(x)}
            key={x}
          >
            {x === "all" ? t("all") : tCatalog(`textures.${x}`)}
          </button>
        ))}
        <button className="sort">{t("sort")}</button>
      </div>
      <div className="shop-layout">
        <aside>
          <b>{t("refine")}</b>
          {refineKeys.map((key) => (
            <button key={key}>
              {t(`refineOptions.${key}`)}
              <Icon name="plus" />
            </button>
          ))}
        </aside>
        <div className="product-grid">
          {visible.map((p) => (
            <ProductCard key={p.code} product={p} />
          ))}
        </div>
      </div>
      {visible.length === 0 && (
        <div className="empty">
          <h2>{t("empty.title")}</h2>
          <p>{t("empty.copy")}</p>
        </div>
      )}
      <div className="help-banner">
        <div>
          <Icon name="sparkle" />
        </div>
        <section>
          <span className="eyebrow eyebrow--light">{t("help.eyebrow")}</span>
          <h2>{t("help.title")}</h2>
          <p>{t("help.copy")}</p>
        </section>
        <Button variant="light" onClick={() => setAssistantOpen(true)}>
          {t("help.cta")}
        </Button>
      </div>
    </main>
  );
}
