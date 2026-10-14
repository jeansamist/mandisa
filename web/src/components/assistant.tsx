"use client";

import { useRouter } from "next/navigation";
import { photos, productHref } from "@/lib/catalog";
import { Icon } from "@/components/ui";
import { useShop } from "@/components/shop-provider";

export function ChatPreview() {
  return (
    <div className="chat-preview">
      <div className="chat-head">
        <span>
          <Icon name="sparkle" />
        </span>
        <div>
          <b>Assistante Mandisa</b>
          <small>Disponible 24 h/24</small>
        </div>
        <i>FR</i>
      </div>
      <div className="bubble">
        Bonjour ! Quelle texture recherchez-vous aujourd&apos;hui ?
      </div>
      <div className="bubble bubble--user">
        Une texture naturelle et facile à porter.
      </div>
      <div className="mini-product">
        <img src={photos.afro} alt="Nadège" />
        <div>
          <span>Afro · En stock</span>
          <b>Nadège</b>
          <small>98 000 FCFA</small>
        </div>
      </div>
      <div className="fake-input">
        Écrivez votre message… <Icon name="send" />
      </div>
    </div>
  );
}

export default function Assistant() {
  const router = useRouter();
  const { assistantOpen: open, setAssistantOpen: setOpen } = useShop();
  const navTo = (href: string) => {
    setOpen(false);
    router.push(href);
  };
  return (
    <>
      <button
        id="assistant"
        className="assistant-button"
        onClick={() => setOpen(!open)}
      >
        <Icon name={open ? "close" : "message"} />
        <span>{open ? "Fermer" : "Besoin d'aide ?"}</span>
      </button>
      {open && (
        <aside className="assistant-panel">
          <div className="chat-head">
            <span>
              <Icon name="sparkle" />
            </span>
            <div>
              <b>Assistante Mandisa</b>
              <small>
                <i /> Disponible 24 h/24
              </small>
            </div>
            <button onClick={() => setOpen(false)}>
              <Icon name="close" />
            </button>
          </div>
          <div className="chat-body">
            <div className="bubble">
              Bonjour ! Je peux vous aider à choisir votre perruque, vérifier la
              disponibilité, suivre votre commande ou préparer votre panier.
            </div>
            <div className="chat-chips">
              <button>Quelle texture pour moi ?</button>
              <button>Voir les disponibilités</button>
              <button onClick={() => navTo("/tracking")}>
                Suivre ma commande
              </button>
              <button>Entretien</button>
            </div>
            <div className="bubble bubble--user">
              Je cherche une perruque bouclée, longueur moyenne.
            </div>
            <div className="bubble">
              Syntiche pourrait beaucoup vous plaire. Souhaitez-vous un rendu
              plutôt défini ou aérien ?
            </div>
            <div className="mini-product">
              <img src={photos.curly} alt="Syntiche" />
              <div>
                <span>Bouclée · En stock</span>
                <b>Syntiche</b>
                <small>128 000 FCFA</small>
                <button onClick={() => navTo(productHref("MDS-W04"))}>
                  Voir le modèle
                </button>
              </div>
            </div>
          </div>
          <div className="chat-footer">
            <div className="fake-input">
              Écrivez votre message… <Icon name="send" />
            </div>
            <button>Parler à une personne sur WhatsApp</button>
          </div>
        </aside>
      )}
    </>
  );
}
