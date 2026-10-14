// French messages for admin API error codes (products & shipping pages).

const messages: Record<string, string> = {
  invalid_request:
    "Certains champs sont invalides. Vérifiez les valeurs saisies.",
  product_code_taken: "Ce code produit existe déjà.",
  product_not_found: "Produit introuvable.",
  variant_exists: "Cette variante (longueur, couleur, bonnet) existe déjà.",
  variant_not_found: "Variante introuvable.",
  stock_below_reserved:
    "Le stock ne peut pas être inférieur aux unités réservées par des commandes en cours.",
  media_not_found: "Média introuvable.",
  delivery_method_exists: "Un mode de livraison avec ce code existe déjà.",
  delivery_method_not_found: "Mode de livraison introuvable.",
  payment_method_not_found: "Moyen de paiement introuvable.",
  unauthenticated: "Session expirée. Reconnectez-vous.",
};

export type ActionResult = { ok: true } | { ok: false; message: string };

/** Turns an API error code (and details) into a French message. */
export function errorMessage(error: string, details?: unknown): string {
  if (error === "stock_below_reserved") {
    const reserved = (details as { reserved?: number } | undefined)?.reserved;
    if (typeof reserved === "number") {
      return `Le stock ne peut pas être inférieur aux ${reserved} unité(s) réservée(s) par des commandes en cours.`;
    }
  }
  if (
    error === "invalid_request" &&
    Array.isArray(details) &&
    details.length > 0
  ) {
    const fields = details
      .map((issue: { path?: unknown[] }) => issue.path?.join("."))
      .filter(Boolean);
    if (fields.length)
      return `Valeur invalide : ${[...new Set(fields)].join(", ")}.`;
  }
  return messages[error] ?? "Une erreur est survenue. Réessayez.";
}
