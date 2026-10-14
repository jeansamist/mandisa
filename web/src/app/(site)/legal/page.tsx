import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conditions générales de vente" };

export default function Page() {
  return (
    <main className="page container narrow">
      <span className="eyebrow">Informations légales</span>
      <h1>Conditions générales de vente</h1>
      <p className="lead">Dernière mise à jour : juin 2026</p>
      {[
        "Objet",
        "Commandes et paiement",
        "Livraison",
        "Retours et remboursements",
      ].map((x) => (
        <section className="legal-section" key={x}>
          <h2>{x}</h2>
          <p>
            [Texte à rédiger] Les présentes conditions décrivent les modalités
            applicables aux commandes effectuées sur le site Mandisa.
          </p>
        </section>
      ))}
    </main>
  );
}
