"use client";

import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui";

export default function Footer() {
  const router = useRouter();
  return (
    <footer>
      <div className="footer-grid container">
        <div>
          <Logo light />
          <p>Perruques prêtes à porter aux textures naturelles.</p>
        </div>
        <div>
          <b>Boutique</b>
          {[
            "Toutes les perruques",
            "Afro",
            "Kinky yaki",
            "Light yaki",
            "Bouclées",
          ].map((x) => (
            <button onClick={() => router.push("/shop")} key={x}>
              {x}
            </button>
          ))}
        </div>
        <div>
          <b>Aide</b>
          <button onClick={() => router.push("/tracking")}>
            Suivi de commande
          </button>
          <button onClick={() => router.push("/delivery")}>
            Livraison & retours
          </button>
          <button onClick={() => router.push("/faq")}>FAQ</button>
          <button onClick={() => router.push("/care")}>
            Guide d&apos;entretien
          </button>
          <button onClick={() => router.push("/contact")}>Contact</button>
        </div>
        <div>
          <b>Contact</b>
          <p>
            WhatsApp
            <br />
            +237 650 911 804
          </p>
          <p>
            Retrait : Bali, Douala
            <br />
            Derrière Somatel Hôtel
          </p>
        </div>
      </div>
      <div className="footer-bottom container">
        <span>MTN MoMo · Orange Money · Carte · Virement</span>
        <button onClick={() => router.push("/legal")}>
          Conditions de vente
        </button>
        <button onClick={() => router.push("/legal")}>Confidentialité</button>
        <span>© 2026 Mandisa</span>
      </div>
    </footer>
  );
}
