"use client";

import { useState } from "react";
import { products } from "@/lib/catalog";
import { Button, Icon } from "@/components/ui";
import ProductCard from "@/components/product-card";
import { useShop } from "@/components/shop-provider";

export default function ShopView() {
  const { setAssistantOpen } = useShop();
  const [filter, setFilter] = useState("Toutes");
  const visible = filter === "Toutes" ? products : products.filter(p => p.texture === filter);
  return <main className="page container">
    <div className="breadcrumb">Accueil / <b>Boutique</b></div>
    <div className="page-heading"><div><span className="eyebrow">Collection 01</span><h1>La collection</h1><p>9 perruques prêtes à porter, aux textures naturelles.</p></div><div className="collection-number">09 <span>modèles</span></div></div>
    <div className="filters">{["Toutes", "Afro", "Kinky yaki", "Light yaki", "Bouclées"].map(x => <button className={filter === x ? "active" : ""} onClick={() => setFilter(x)} key={x}>{x}</button>)}<button className="sort">Trier : Nouveautés</button></div>
    <div className="shop-layout"><aside><b>Affiner</b>{["Longueur", "Couleur", "Taille de bonnet", "Disponibilité"].map(x => <button key={x}>{x}<Icon name="plus" /></button>)}</aside><div className="product-grid">{visible.map(p => <ProductCard key={p.code} product={p} />)}</div></div>
    {visible.length === 0 && <div className="empty"><h2>Aucun résultat</h2><p>Essayez de modifier vos filtres.</p></div>}
    <div className="help-banner"><div><Icon name="sparkle" /></div><section><span className="eyebrow eyebrow--light">Conseil personnalisé</span><h2>Besoin d'aide pour choisir ?</h2><p>Décrivez le style que vous recherchez à notre assistante.</p></section><Button variant="light" onClick={() => setAssistantOpen(true)}>Me faire conseiller</Button></div>
  </main>;
}
