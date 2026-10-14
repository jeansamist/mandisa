"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, Logo } from "@/components/ui";
import { useShop } from "@/components/shop-provider";

export default function Header() {
  const router = useRouter();
  const { cartCount } = useShop();
  const [menu, setMenu] = useState(false);
  const navTo = (href: string) => { router.push(href); setMenu(false); };
  return <>
    <div className="announcement">Livraison gratuite à Douala · Retrait possible à Bali · Précommande : fabrication de 4 à 6 semaines</div>
    <header className="header">
      <Logo />
      <nav className={menu ? "nav nav--open" : "nav"}>
        <button onClick={() => navTo("/shop")}>Boutique</button>
        <button onClick={() => navTo("/shop")}>Textures</button>
        <button onClick={() => navTo("/care")}>Guide d&apos;entretien</button>
        <button onClick={() => navTo("/delivery")}>Livraison & retours</button>
        <button onClick={() => navTo("/about")}>À propos</button>
        <button onClick={() => navTo("/contact")}>Contact</button>
      </nav>
      <div className="header__actions">
        <button className="language"><b>FR</b><span>EN</span></button>
        <button className="desktop-icon" aria-label="Rechercher"><Icon name="search" /></button>
        <button className="desktop-icon" aria-label="Compte" onClick={() => router.push("/account")}><Icon name="user" /></button>
        <button className="cart-icon" aria-label="Panier" onClick={() => router.push("/cart")}><Icon name="bag" /><span>{cartCount}</span></button>
        <button className="menu-button" aria-label="Menu" onClick={() => setMenu(!menu)}><Icon name={menu ? "close" : "menu"} /></button>
      </div>
    </header>
  </>;
}
