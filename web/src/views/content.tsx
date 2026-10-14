"use client";

import { useState } from "react";
import { photos } from "@/lib/catalog";
import { Button, Icon } from "@/components/ui";
import { useShop } from "@/components/shop-provider";

const infoContent: Record<
  string,
  { eyebrow: string; title: string; intro: string; items: [string, string][] }
> = {
  care: {
    eyebrow: "Le rituel Mandisa",
    title: "Prenez soin de votre perruque",
    intro:
      "Quelques gestes simples pour garder votre perruque belle, longtemps.",
    items: [
      [
        "Avant de la porter",
        "Préparez doucement la fibre avec vos doigts et ajustez le bonnet sans tirer sur la lace.",
      ],
      [
        "Le lavage",
        "Utilisez de l'eau tiède et des soins doux. Ne frottez pas : laissez tremper puis rincez délicatement.",
      ],
      [
        "Le séchage",
        "Tamponnez avec une serviette propre et laissez sécher naturellement sur un support adapté.",
      ],
      [
        "Le coiffage",
        "Démêlez des pointes vers les racines. La chaleur doit rester modérée et adaptée à la fibre.",
      ],
      [
        "Le rangement",
        "Rangez votre perruque propre, sèche et à l'abri du soleil, idéalement sur un support.",
      ],
    ],
  },
  delivery: {
    eyebrow: "Service & sérénité",
    title: "Livraison et retours",
    intro: "Nous vous accompagnons avant, pendant et après votre commande.",
    items: [
      [
        "Douala, à domicile",
        "Gratuite — objectif : en 1 h maximum [à confirmer].",
      ],
      ["Retrait à Bali", "Derrière Somatel Hôtel, après Hôtel Premium."],
      [
        "Autres villes & international",
        "Tarif et délai confirmés avec vous avant le paiement.",
      ],
      [
        "Précommande",
        "4 à 6 semaines de fabrication après paiement, puis expédition.",
      ],
      [
        "Retours & échanges",
        "Demande sous 24 h. La perruque doit être neuve, non portée et non modifiée, lace intacte, avec ses accessoires.",
      ],
      [
        "Produit endommagé",
        "Envoyez-nous votre réclamation avec des photos : notre équipe vous proposera la meilleure solution.",
      ],
    ],
  },
  about: {
    eyebrow: "Notre raison d'être",
    title: "Made to look like you.",
    intro:
      "Mandisa est une marque de perruques premium, prêtes à porter, aux textures naturelles. Notre promesse : une perruque qui vous ressemble.",
    items: [
      [
        "Naturel",
        "Des textures qui célèbrent la beauté noire dans toute sa richesse.",
      ],
      [
        "Soin",
        "Une attention portée au produit, à son origine et à chaque détail.",
      ],
      [
        "Confiance",
        "Se reconnaître, se sentir soi, et avancer avec assurance.",
      ],
    ],
  },
};

export function InfoView({ type }: { type: "care" | "delivery" | "about" }) {
  const { setAssistantOpen } = useShop();
  const c = infoContent[type];
  return (
    <main className="page">
      <section className="info-hero container">
        <div>
          <span className="eyebrow">{c.eyebrow}</span>
          <h1>{c.title}</h1>
          <p>{c.intro}</p>
        </div>
        <img
          src={
            type === "care"
              ? photos.care
              : type === "about"
                ? photos.hero
                : photos.detail
          }
          alt=""
        />
      </section>
      <section className="container info-list">
        {c.items.map(([t, p], i) => (
          <article key={t}>
            <span>0{i + 1}</span>
            <div>
              <h2>{t}</h2>
              <p>{p}</p>
            </div>
          </article>
        ))}
      </section>
      <section className="cta-band">
        <h2>
          {type === "care"
            ? "Une question sur l'entretien ?"
            : "Besoin d'un conseil personnalisé ?"}
        </h2>
        <p>Notre assistante est disponible 24 h/24.</p>
        <Button variant="light" onClick={() => setAssistantOpen(true)}>
          Demander à l'assistante
        </Button>
      </section>
    </main>
  );
}

export function FaqView() {
  const [open, setOpen] = useState(0);
  const questions = [
    "Comment passer commande ?",
    "Quels moyens de paiement acceptez-vous ?",
    "Puis-je payer à la livraison ?",
    'Que veut dire "précommande" ?',
    "Combien de temps pour être livrée ?",
    "Livrez-vous hors de Douala et à l'international ?",
    "Puis-je retourner ou échanger ma perruque ?",
    "Comment entretenir ma perruque ?",
    "Puis-je parler à une personne ?",
  ];
  return (
    <main className="page container narrow">
      <span className="eyebrow">Questions fréquentes</span>
      <h1>Comment pouvons-nous vous aider ?</h1>
      <div className="faq-tabs">
        <button className="active">Commander</button>
        <button>Paiement</button>
        <button>Livraison</button>
        <button>Retours</button>
        <button>Entretien</button>
      </div>
      <div className="faq-list">
        {questions.map((q, i) => (
          <article key={q}>
            <button onClick={() => setOpen(open === i ? -1 : i)}>
              <h3>{q}</h3>
              <Icon name={open === i ? "minus" : "plus"} />
            </button>
            {open === i && (
              <p>
                Notre équipe vous accompagne à chaque étape. Les informations
                peuvent varier selon la disponibilité, votre ville et le mode de
                paiement choisi.
              </p>
            )}
          </article>
        ))}
      </div>
      <div className="help-banner">
        <section>
          <span className="eyebrow eyebrow--light">
            Toujours une question ?
          </span>
          <h2>Vous ne trouvez pas votre réponse ?</h2>
        </section>
        <Button variant="light">Écrire sur WhatsApp</Button>
      </div>
    </main>
  );
}

export function ContactView() {
  return (
    <main className="page container">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Nous sommes là</span>
          <h1>Parlons-en</h1>
          <p>
            Une assistante répond 24 h/24. Une personne prend le relais sur
            WhatsApp.
          </p>
        </div>
      </div>
      <div className="contact-grid">
        {[
          ["WhatsApp", "+237 650 911 804"],
          ["Email", "[adresse à créer]"],
          ["Instagram", "@mandisa"],
          ["TikTok", "@mandisa"],
        ].map((x) => (
          <article key={x[0]}>
            <span>{x[0]}</span>
            <h2>{x[1]}</h2>
            <button>
              Nous contacter <Icon name="arrow" />
            </button>
          </article>
        ))}
      </div>
      <section className="contact-form">
        <div>
          <span className="eyebrow">Retrait à Douala</span>
          <h2>
            Bali, derrière Somatel Hôtel,
            <br />
            après Hôtel Premium.
          </h2>
          <div className="map">
            DOUALA <i>Bali</i>
          </div>
        </div>
        <form>
          <label>
            Nom
            <input placeholder="Votre nom" />
          </label>
          <label>
            Téléphone
            <input placeholder="+237" />
          </label>
          <label>
            Message
            <textarea placeholder="Comment pouvons-nous vous aider ?" />
          </label>
          <Button>Envoyer le message</Button>
        </form>
      </section>
    </main>
  );
}
