// French formatting for the management system.

const number = new Intl.NumberFormat("fr-FR");
const dateTime = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Douala",
});
const date = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "Africa/Douala",
});

export const formatXaf = (amount: number | string | null | undefined) =>
  amount === null || amount === undefined
    ? "—"
    : `${number.format(Number(amount))} FCFA`;
export const formatNumber = (n: number | string) => number.format(Number(n));
export const formatDateTime = (value: string | Date) =>
  dateTime.format(new Date(value));
export const formatDate = (value: string | Date) =>
  date.format(new Date(value));
export const formatPercent = (ratio: number | null) =>
  ratio === null
    ? "—"
    : `${(ratio * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`;

/** Change vs. previous period, e.g. "+12 %"; null when there is nothing to compare. */
export function trend(current: number, previous: number) {
  if (!previous) return null;
  const change = (current - previous) / previous;
  return `${change >= 0 ? "+" : ""}${Math.round(change * 100)} %`;
}

export const orderStatusLabels: Record<string, string> = {
  draft: "Devis à envoyer",
  pending_payment: "En attente de paiement",
  payment_review: "Paiement à vérifier",
  paid: "Payée",
  in_preparation: "En préparation",
  in_production: "En fabrication",
  ready: "Prête",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
  return_requested: "Retour demandé",
  return_received: "Retour reçu",
  exchanged: "Échangée",
  refunded: "Remboursée",
};

export const paymentMethodLabels: Record<string, string> = {
  mtn_momo: "MTN MoMo",
  orange_money: "Orange Money",
  bank_transfer: "Virement bancaire",
  cash_on_delivery: "Paiement à la livraison",
  card: "Carte bancaire",
};

export const deliveryMethodLabels: Record<string, string> = {
  douala_home: "Douala, à domicile",
  bali_pickup: "Retrait à Bali",
  other_city: "Autre ville du Cameroun",
  international: "International",
};

export const textureLabels: Record<string, string> = {
  afro: "Afro",
  kinkyYaki: "Kinky yaki",
  lightYaki: "Light yaki",
  curly: "Bouclées",
};

export const stockStatusLabels: Record<string, string> = {
  inStock: "En stock",
  lowStock: "Stock faible",
  preorder: "Précommande",
  soldOut: "Épuisé",
};
