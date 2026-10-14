"use client";

import { useRouter } from "next/navigation";
import { photos, products } from "@/lib/catalog";
import { Button, Icon, SectionTitle } from "@/components/ui";
import { ChatPreview } from "@/components/assistant";
import ProductCard from "@/components/product-card";
import { useShop } from "@/components/shop-provider";

export default function HomeView() {
  const router = useRouter();
  const { setAssistantOpen } = useShop();
  const textures = [
    ["Afro", "Volume généreux, texture crépue naturelle.", photos.afro],
    [
      "Kinky yaki",
      "Une texture crépue lissée, souple et naturelle.",
      photos.kinky,
    ],
    ["Light yaki", "Un yaki plus léger, doux et fluide.", photos.yaki],
    ["Bouclées", "Des boucles définies, pleines de mouvement.", photos.curly],
  ];
  return (
    <main>
      <section className="hero">
        <img
          src={photos.hero}
          alt="Portrait chaleureux d'une femme aux cheveux afro naturels"
        />
        <div className="hero__shade" />
        <div className="hero__copy">
          <span className="eyebrow eyebrow--light">
            Perruques prêtes à porter
          </span>
          <h1>
            Made to look
            <br />
            <em>like you.</em>
          </h1>
          <p>
            Des perruques premium aux textures naturelles, prêtes à porter, avec
            leurs accessoires offerts.
          </p>
          <div className="button-row">
            <Button variant="light" onClick={() => router.push("/shop")}>
              Découvrir la collection <Icon name="arrow" />
            </Button>
            <Button variant="outline" onClick={() => setAssistantOpen(true)}>
              Être conseillée
            </Button>
          </div>
        </div>
        <span className="hero__caption">IMG_hero · Douala, Cameroun</span>
      </section>
      <section className="trust-strip">
        {[
          "Prête à porter",
          "Accessoires offerts",
          "Livraison gratuite à Douala",
          "Assistance 24 h/24",
        ].map((x, i) => (
          <div key={x}>
            <span>0{i + 1}</span>
            <b>{x}</b>
          </div>
        ))}
      </section>
      <section className="section container">
        <SectionTitle
          eyebrow="Trouvez votre allure"
          title="Choisissez votre texture"
          copy="Des textures pensées pour célébrer la beauté naturelle, sans compromis."
        />
        <div className="texture-grid">
          {textures.map(([name, copy, image], i) => (
            <article
              className={`texture-card texture-card--${i + 1}`}
              key={name}
            >
              <img src={image} alt={`Texture ${name}`} />
              <div>
                <span>0{i + 1}</span>
                <h3>{name}</h3>
                <p>{copy}</p>
                <button onClick={() => router.push("/shop")}>
                  Voir les modèles <Icon name="arrow" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="section sand">
        <div className="container">
          <SectionTitle
            eyebrow="Nouveautés"
            title="La première collection"
            copy="Neuf modèles, pensés pour vous ressembler."
          />
          <div className="product-grid product-grid--feature">
            {products.slice(0, 4).map((p) => (
              <ProductCard key={p.code} product={p} />
            ))}
          </div>
          <div className="center">
            <Button variant="outline" onClick={() => router.push("/shop")}>
              Voir toute la collection <Icon name="arrow" />
            </Button>
          </div>
        </div>
      </section>
      <section className="manifesto">
        <div className="container">
          <span className="eyebrow eyebrow--light">Pourquoi Mandisa</span>
          <h2>
            Une perruque ne devrait jamais vous déguiser. Elle devrait vous{" "}
            <em>révéler.</em>
          </h2>
          <div className="pillars">
            {[
              [
                "Prête à porter",
                "Pas de pose compliquée : vous la mettez, elle vous ressemble.",
              ],
              [
                "Accessoires offerts",
                "Chaque perruque arrive avec ses accessoires dans son packaging.",
              ],
              [
                "Origine documentée",
                "Une fiche détaillée : origine, longueur, densité et poids.",
              ],
              [
                "Accompagnement personnel",
                "Une assistante disponible, et une vraie personne sur WhatsApp.",
              ],
            ].map(([title, text], i) => (
              <article key={title}>
                <span>0{i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section container advisor">
        <div className="advisor__copy">
          <span className="eyebrow">Conseillère Mandisa</span>
          <h2>Pas sûre de votre choix ?</h2>
          <p>
            Notre assistante vous aide à choisir la texture, la longueur et le
            style qui vous correspondent, en français ou en anglais.
          </p>
          <div className="chips">
            {[
              "Quelle texture pour moi ?",
              "Quelle longueur choisir ?",
              "Où en est ma commande ?",
              "Comment entretenir ma perruque ?",
            ].map((x) => (
              <span key={x}>{x}</span>
            ))}
          </div>
          <Button onClick={() => setAssistantOpen(true)}>
            Démarrer la conversation <Icon name="arrow" />
          </Button>
        </div>
        <ChatPreview />
      </section>
      <section className="section container how">
        <SectionTitle
          eyebrow="Simple, du choix à la livraison"
          title="Comment ça marche"
        />
        <div className="steps">
          {[
            [
              "01",
              "Choisissez",
              "Parcourez la collection ou demandez conseil à notre assistante.",
            ],
            [
              "02",
              "Payez en toute simplicité",
              "MTN MoMo, Orange Money, carte, virement ou à la livraison.",
            ],
            [
              "03",
              "Recevez",
              "Livraison gratuite à Douala et expédition au Cameroun et à l'international.",
            ],
          ].map(([n, t, p]) => (
            <article key={n}>
              <b>{n}</b>
              <h3>{t}</h3>
              <p>{p}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="care-banner container">
        <img
          src={photos.care}
          alt="Brosse et accessoires de soin sur tissu clair"
        />
        <div>
          <span className="eyebrow">Le rituel Mandisa</span>
          <h2>Prenez soin de votre perruque</h2>
          <p>Quelques gestes simples pour la garder belle, longtemps.</p>
          <Button variant="light" onClick={() => router.push("/care")}>
            Lire le guide <Icon name="arrow" />
          </Button>
        </div>
      </section>
      <section className="newsletter">
        <div>
          <span className="eyebrow">Le journal Mandisa</span>
          <h2>Recevez nos nouveautés et nos offres</h2>
        </div>
        <form onSubmit={(e) => e.preventDefault()}>
          <label>
            Email ou WhatsApp
            <input placeholder="vous@exemple.com" />
          </label>
          <Button>S'inscrire</Button>
          <small>
            En continuant, j'accepte de recevoir les nouvelles Mandisa.
            Désinscription à tout moment.
          </small>
        </form>
      </section>
    </main>
  );
}
