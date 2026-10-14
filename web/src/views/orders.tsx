"use client";

import { useRouter } from "next/navigation";
import { photos } from "@/lib/catalog";
import { Button, Icon } from "@/components/ui";

export function ConfirmationView() {
  const router = useRouter();
  return <main className="page container confirmation"><div className="success-mark"><Icon name="check" /></div><span className="eyebrow">Commande confirmée</span><h1>Merci, Mireille !</h1><p>Votre commande n° <b>MDS-2026-0001</b> est enregistrée. Nous vous envoyons une confirmation par WhatsApp et par email.</p><section className="confirmation-card"><div className="order-product"><img src={photos.afro} alt="Nadège" /><div><b>Nadège</b><small>Afro · 14" · Bonnet M</small></div><strong>98 000 FCFA</strong></div><div className="timeline">{["Payée", "En préparation", "Prête", "Expédiée", "Livrée"].map((x, i) => <div className={i === 0 ? "active" : ""} key={x}><i>{i === 0 ? "✓" : i + 1}</i><span>{x}</span></div>)}</div><div className="receipt"><p><span>Livraison</span><b>Douala, à domicile</b></p><p><span>Paiement</span><b>MTN MoMo</b></p><p><span>Total</span><b>98 000 FCFA</b></p></div></section><div className="button-row"><Button onClick={() => router.push("/tracking")}>Suivre ma commande</Button><Button variant="outline" onClick={() => router.push("/shop")}>Retour à la boutique</Button></div></main>;
}

export function TrackingView() {
  return <main className="page tracking-page"><section className="tracking-hero"><div className="container"><span className="eyebrow eyebrow--light">Votre commande, pas à pas</span><h1>Suivre ma commande</h1><p>Entrez votre numéro de commande et le téléphone utilisé lors de l'achat.</p><div className="tracking-form"><input value="MDS-2026-0001" readOnly /><input value="+237 650 ••• •••" readOnly /><Button variant="light">Suivre</Button></div></div></section><section className="container tracking-result"><div><span className="tag">En cours</span><h2>Commande MDS-2026-0001</h2><p>Livraison à Bonapriso, Douala</p></div><div className="vertical-timeline">{[["18 juin · 10:32", "Payée", "Votre paiement MTN MoMo a été confirmé."], ["18 juin · 11:05", "En préparation", "Notre équipe prépare votre perruque et ses accessoires."], ["À venir", "Prête", "Vous serez avertie dès que votre commande sera prête."], ["À venir", "Expédiée", ""], ["À venir", "Livrée", ""]].map((x, i) => <article className={i < 2 ? "active" : ""} key={x[1]}><i>{i < 2 ? "✓" : i + 1}</i><div><span>{x[0]}</span><h3>{x[1]}</h3><p>{x[2]}</p></div></article>)}</div><Button variant="outline">Contacter l'équipe sur WhatsApp</Button></section></main>;
}

export function AccountView() {
  const router = useRouter();
  return <main className="page container"><span className="eyebrow">Votre espace</span><h1>Bonjour Mireille, ravie de vous retrouver.</h1><div className="account-tabs"><button className="active">Mes commandes</button><button>Mes favoris</button><button>Mes préférences</button><button>Mes adresses</button></div><section className="account-order"><div><span className="tag">En préparation</span><h2>MDS-2026-0001</h2><p>1 article · 98 000 FCFA</p></div><div className="order-product"><img src={photos.afro} alt="Nadège" /><b>Nadège · Afro · 14"</b></div><Button variant="outline" onClick={() => router.push("/tracking")}>Voir le détail</Button></section></main>;
}
