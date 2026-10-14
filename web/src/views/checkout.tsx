"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { photos } from "@/lib/catalog";
import { Button, Icon, Logo } from "@/components/ui";
import { useShop } from "@/components/shop-provider";

export default function CheckoutView() {
  const router = useRouter();
  const { setCartCount } = useShop();
  const [step, setStep] = useState(1);
  const [payment, setPayment] = useState("momo");
  const onConfirm = () => {
    setCartCount(0);
    router.push("/order-confirmation");
  };
  return (
    <main className="page container checkout">
      <div className="checkout__head">
        <Logo />
        <button onClick={() => router.push("/cart")}>
          <Icon name="bag" /> Retour au panier
        </button>
      </div>
      <div className="progress">
        {["Informations", "Livraison", "Paiement"].map((x, i) => (
          <div className={step >= i + 1 ? "active" : ""} key={x}>
            <span>{step > i + 1 ? "✓" : i + 1}</span>
            <b>{x}</b>
          </div>
        ))}
      </div>
      <div className="checkout-layout">
        <section className="checkout-form">
          {step === 1 && (
            <>
              <span className="eyebrow">Étape 1 sur 3</span>
              <h1>Vos informations</h1>
              <div className="choice">
                <button className="active">Continuer sans compte</button>
                <button>Créer un compte</button>
              </div>
              <div className="form-grid">
                <label>
                  Prénom
                  <input placeholder="Votre prénom" />
                </label>
                <label>
                  Nom
                  <input placeholder="Votre nom" />
                </label>
                <label>
                  Téléphone (WhatsApp)
                  <input placeholder="+237 6•• ••• •••" />
                </label>
                <label>
                  Email
                  <input type="email" placeholder="vous@exemple.com" />
                </label>
              </div>
              <Button onClick={() => setStep(2)}>
                Continuer vers la livraison <Icon name="arrow" />
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <span className="eyebrow">Étape 2 sur 3</span>
              <h1>Mode de livraison</h1>
              <div className="radio-cards">
                {[
                  [
                    "Douala, à domicile",
                    "Gratuite · objectif 1 h maximum [à confirmer]",
                  ],
                  [
                    "Retrait à Bali",
                    "Derrière Somatel Hôtel, après Hôtel Premium",
                  ],
                  [
                    "Autre ville du Cameroun",
                    "Tarif communiqué avant le paiement",
                  ],
                  ["International", "Frais confirmés avant validation"],
                ].map((x, i) => (
                  <button className={i === 0 ? "selected" : ""} key={x[0]}>
                    <i />{" "}
                    <span>
                      <b>{x[0]}</b>
                      <small>{x[1]}</small>
                    </span>
                  </button>
                ))}
              </div>
              <div className="form-grid">
                <label>
                  Quartier
                  <input placeholder="Ex. Bonapriso" />
                </label>
                <label>
                  Repère de livraison
                  <input placeholder="Près de…" />
                </label>
                <label className="wide">
                  Adresse
                  <input placeholder="Rue, immeuble, étage" />
                </label>
              </div>
              <div className="button-row">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Retour
                </Button>
                <Button onClick={() => setStep(3)}>
                  Continuer vers le paiement <Icon name="arrow" />
                </Button>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <span className="eyebrow">Étape 3 sur 3</span>
              <h1>Paiement</h1>
              <div className="radio-cards payment">
                {[
                  ["momo", "MTN MoMo", "Validation depuis votre téléphone"],
                  [
                    "orange",
                    "Orange Money",
                    "Validation depuis votre téléphone",
                  ],
                  ["card", "Carte bancaire", "Visa, Mastercard"],
                  [
                    "transfer",
                    "Virement bancaire",
                    "Preuve de paiement requise",
                  ],
                  [
                    "delivery",
                    "Paiement à la livraison",
                    "Disponible à Douala",
                  ],
                ].map(([id, title, copy]) => (
                  <button
                    className={payment === id ? "selected" : ""}
                    onClick={() => setPayment(id)}
                    key={id}
                  >
                    <i />
                    <span>
                      <b>{title}</b>
                      <small>{copy}</small>
                    </span>
                  </button>
                ))}
              </div>
              {payment === "transfer" && (
                <label>
                  Référence de transaction
                  <input placeholder="Référence" />
                </label>
              )}
              <label className="checkbox">
                <input type="checkbox" /> J'accepte les conditions de vente
              </label>
              <label className="checkbox">
                <input type="checkbox" /> Je souhaite recevoir des offres par
                WhatsApp / email
              </label>
              <p className="payment-note">
                Votre commande est validée après réception du paiement.
              </p>
              <div className="button-row">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Retour
                </Button>
                <Button onClick={onConfirm}>Confirmer et payer</Button>
              </div>
            </>
          )}
        </section>
        <aside className="summary order-summary">
          <h2>Votre commande</h2>
          <div className="order-product">
            <img src={photos.afro} alt="Nadège" />
            <div>
              <b>Nadège</b>
              <small>14" · Noir · M</small>
            </div>
            <strong>98 000</strong>
          </div>
          <p>
            <span>Sous-total</span>
            <b>98 000 FCFA</b>
          </p>
          <p>
            <span>Livraison</span>
            <b>Gratuite</b>
          </p>
          <hr />
          <p className="total">
            <span>Total</span>
            <b>98 000 FCFA</b>
          </p>
        </aside>
      </div>
    </main>
  );
}
