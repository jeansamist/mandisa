"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { productHref, type Product } from "@/lib/catalog";
import { useFormatPrice, useStatusLabel } from "@/lib/format";
import { Button, Icon } from "@/components/ui";
import { useShop } from "@/components/shop-provider";
import { Reveal, stagger } from "@/components/motion";

export default function ProductCard({
  product,
  index = 0,
}: {
  product: Product;
  /** Position in its grid, for the staggered reveal. */
  index?: number;
}) {
  const t = useTranslations("ProductCard");
  const tCommon = useTranslations("Common");
  const tCatalog = useTranslations("Catalog");
  const formatPrice = useFormatPrice();
  const statusLabel = useStatusLabel();
  const router = useRouter();
  const { addToCart } = useShop();
  const texture = tCatalog(`textures.${product.texture}`);
  const badgeModifier =
    product.status === "preorder"
      ? "badge--clay"
      : product.status === "soldOut"
        ? "badge--muted"
        : "";
  return (
    <Reveal
      as="article"
      className="product-card"
      delay={stagger(index)}
      whileHover={{ y: -6 }}
    >
      <button
        className="product-card__image"
        onClick={() => router.push(productHref(product.code))}
      >
        <img
          src={product.image ?? ""}
          alt={t("imageAlt", { name: product.name, texture })}
        />
        <span className={`badge ${badgeModifier}`}>{statusLabel(product)}</span>
        <i className="heart">
          <Icon name="heart" />
        </i>
      </button>
      <div className="product-card__meta">
        <div>
          <span>{texture}</span>
          <h3>{product.name}</h3>
          <small>{product.code}</small>
        </div>
        <strong>
          {t("fromPrice", { price: formatPrice(product.priceXaf) })}
          <sup>*</sup>
        </strong>
      </div>
      {product.status === "soldOut" || !product.defaultSku ? (
        <Button variant="outline" disabled>
          {t("notifyMe")}
        </Button>
      ) : (
        <Button
          variant="text"
          onClick={() => product.defaultSku && addToCart(product.defaultSku)}
        >
          {tCommon("addToCart")} <Icon name="arrow" />
        </Button>
      )}
    </Reveal>
  );
}
