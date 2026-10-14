"use client";

import { useState } from "react";
import { photos, products, type Product } from "@/lib/catalog";
import { Button, Icon, SectionTitle } from "@/components/ui";
import ProductCard from "@/components/product-card";
import { useShop } from "@/components/shop-provider";

export default function ProductView({ product }: { product: Product }) {
  const { addToCart } = useShop();
  const [length, setLength] = useState('14"');
  const [qty, setQty] = useState(1);
  const [open, setOpen] = useState("Détails de la perruque");
  const related = products.filter((p) => p.code !== product.code).slice(0, 4);
  return (
    <main className="page container">
      <div className="breadcrumb">
        Accueil / Boutique / <b>{product.name}</b>
      </div>
      <div className="product-detail">
        <div className="gallery">
          <div className="gallery__main">
            <img src={product.image} alt={`${product.name}, vue de face`} />
            <span>IMG_product_{product.code}</span>
          </div>
          {[photos.detail, photos.hero, photos.kinky].map((p, i) => (
            <button key={p}>
              <img src={p} alt={`${product.name}, vue ${i + 2}`} />
            </button>
          ))}
          <button className="video-thumb">
            <img src={product.image} alt={`Vidéo du modèle ${product.name}`} />
            <i>▶</i>
          </button>
        </div>
        <section className="product-info">
          <div className="product-info__top">
            <span className="tag">{product.texture}</span>
            <span>{product.code}</span>
          </div>
          <h1>{product.name}</h1>
          <div className="price">
            {product.price} FCFA <small>*prix indicatif</small>
          </div>
          <p>
            Une perruque afro au volume généreux, pensée pour sublimer votre
            texture naturelle. Prête à porter, avec ses accessoires offerts.
          </p>
          <hr />
          <fieldset>
            <legend>
              Longueur <b>{length}</b>
            </legend>
            <div className="variant-row">
              {['12"', '14"', '16"', '18"'].map((x) => (
                <button
                  className={length === x ? "selected" : ""}
                  onClick={() => setLength(x)}
                  key={x}
                >
                  {x}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>
              Couleur <b>Noir naturel</b>
            </legend>
            <div className="swatches">
              <button className="selected black" aria-label="Noir naturel" />
              <button className="brown" aria-label="Brun profond" />
              <button className="warm" aria-label="Brun chaud" />
            </div>
          </fieldset>
          <fieldset>
            <legend>
              Taille de bonnet <button>Guide des tailles</button>
            </legend>
            <div className="variant-row">
              {["S", "M", "L"].map((x) => (
                <button className={x === "M" ? "selected" : ""} key={x}>
                  {x}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="stock">
            <i />
            <div>
              <b>En stock — prête à expédier</b>
              <span>Livraison gratuite à Douala</span>
            </div>
          </div>
          <div className="buy-row">
            <div className="quantity">
              <button onClick={() => setQty(Math.max(1, qty - 1))}>
                <Icon name="minus" />
              </button>
              <span>{qty}</span>
              <button onClick={() => setQty(qty + 1)}>
                <Icon name="plus" />
              </button>
            </div>
            <Button onClick={addToCart}>
              Ajouter au panier <Icon name="bag" />
            </Button>
          </div>
          <Button variant="outline">Commander sur WhatsApp</Button>
          <div className="micro-trust">
            {[
              "Livraison gratuite à Douala",
              "Retour sous 24 h, selon conditions",
              "Paiement sécurisé",
            ].map((x) => (
              <span key={x}>
                <Icon name="check" />
                {x}
              </span>
            ))}
          </div>
          <div className="accordions">
            {[
              "Détails de la perruque",
              "Accessoires offerts",
              "Conseils d'entretien",
              "Livraison et retours",
            ].map((x) => (
              <article key={x}>
                <button onClick={() => setOpen(open === x ? "" : x)}>
                  <b>{x}</b>
                  <Icon name={open === x ? "minus" : "plus"} />
                </button>
                {open === x && (
                  <p>
                    {x === "Détails de la perruque"
                      ? `Texture : ${product.texture} · Densité : 180 % · Lace : 13×4 · Origine et poids : à confirmer.`
                      : "Informations détaillées et recommandations Mandisa. Contenu à confirmer avec le fournisseur."}
                  </p>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
      <section className="section related">
        <SectionTitle
          eyebrow="Dans le même esprit"
          title="Vous aimerez aussi"
        />
        <div className="product-grid product-grid--feature">
          {related.map((p) => (
            <ProductCard key={p.code} product={p} />
          ))}
        </div>
      </section>
    </main>
  );
}
