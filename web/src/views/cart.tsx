"use client";

import { useRouter } from "next/navigation";
import { photos } from "@/lib/catalog";
import { Button, Icon } from "@/components/ui";
import { useShop } from "@/components/shop-provider";

export default function CartView() {
  const router = useRouter();
  const { cartCount: count, setCartCount: setCount } = useShop();
  if (!count) return <main className="page container empty"><div className="empty__icon"><Icon name="bag" /></div><h1>Votre panier est vide</h1><p>Votre prochaine allure vous attend dans la collection.</p><Button onClick={() => router.push("/shop")}>Découvrir la collection</Button></main>;
  return <main className="page container"><div className="breadcrumb">Accueil / <b>Panier</b></div><h1>Votre panier <sup>({count})</sup></h1><div className="cart-layout"><section className="cart-items"><article className="line-item"><img src={photos.afro} alt="Nadège" /><div><span className="tag">En stock</span><h3>Nadège</h3><p>Afro · 14" · Noir naturel · Bonnet M</p><button className="remove" onClick={() => setCount(0)}>Supprimer</button></div><div><strong>98 000 FCFA</strong><div className="quantity"><button onClick={() => setCount(Math.max(1, count - 1))}><Icon name="minus" /></button><span>{count}</span><button onClick={() => setCount(count + 1)}><Icon name="plus" /></button></div></div></article><div className="promo"><input placeholder="Code promo" /><Button variant="outline">Appliquer</Button></div></section><aside className="summary"><h2>Récapitulatif</h2><p><span>Sous-total</span><b>{(98000 * count).toLocaleString("fr-FR")} FCFA</b></p><p><span>Réduction</span><b>—</b></p><p><span>Livraison</span><b>Gratuite à Douala</b></p><hr /><p className="total"><span>Total</span><b>{(98000 * count).toLocaleString("fr-FR")} FCFA</b></p><Button onClick={() => router.push("/checkout")}>Passer à la commande <Icon name="arrow" /></Button><button onClick={() => router.push("/shop")}>Continuer mes achats</button><small>Paiement intégral avant validation, sauf paiement à la livraison.</small></aside></div></main>;
}
