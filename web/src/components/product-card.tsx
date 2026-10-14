"use client";

import { useRouter } from "next/navigation";
import { productHref, type Product } from "@/lib/catalog";
import { Button, Icon } from "@/components/ui";
import { useShop } from "@/components/shop-provider";

export default function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const { addToCart } = useShop();
  return (
    <article className="product-card">
      <button
        className="product-card__image"
        onClick={() => router.push(productHref(product.code))}
      >
        <img
          src={product.image}
          alt={`${product.name}, perruque ${product.texture}`}
        />
        <span
          className={`badge ${product.status === "Précommande" ? "badge--clay" : product.status === "Rupture" ? "badge--muted" : ""}`}
        >
          {product.status}
        </span>
        <i className="heart">
          <Icon name="heart" />
        </i>
      </button>
      <div className="product-card__meta">
        <div>
          <span>{product.texture}</span>
          <h3>{product.name}</h3>
          <small>{product.code}</small>
        </div>
        <strong>
          À partir de {product.price} FCFA<sup>*</sup>
        </strong>
      </div>
      {product.status === "Rupture" ? (
        <Button variant="outline" disabled>
          Me prévenir
        </Button>
      ) : (
        <Button variant="text" onClick={addToCart}>
          Ajouter au panier <Icon name="arrow" />
        </Button>
      )}
    </article>
  );
}
