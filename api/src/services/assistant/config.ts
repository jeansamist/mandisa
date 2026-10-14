import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/client.js";
import { aiConfig } from "../../db/schema.js";
import { env } from "../../env.js";

// Models offered in /ms, smallest first. Default: Claude Haiku 5.5 (cheapest, fastest),
// chosen by the founder. Claude Haiku 5.5 has no server-side refusal fallback.
export const ASSISTANT_MODELS = [
  "claude-haiku-5-5",
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "claude-sonnet-5-5",
  "claude-opus-5-5",
] as const;

export type AssistantProvider = "anthropic" | "gemini";

export function providerOf(model: string): AssistantProvider {
  return model.startsWith("gemini-") ? "gemini" : "anthropic";
}

/** Which providers have an API key in api/.env. */
export function configuredProviders(): Record<AssistantProvider, boolean> {
  return {
    anthropic: Boolean(env.ANTHROPIC_API_KEY),
    gemini: Boolean(env.GEMINI_API_KEY),
  };
}
export const ASSISTANT_EFFORTS = ["low", "medium", "high"] as const;
export const ASSISTANT_TOOLS = [
  "search_catalog",
  "get_product_details",
  "get_delivery_and_payment",
  "get_store_information",
  "handoff_to_human",
] as const;

// Starter knowledge, from the site's published texts. Edited by the founder in /ms;
// legal content must be validated before going live (CLAUDE.md §9).
const DEFAULT_KNOWLEDGE = `# Mandisa
Marque de perruques premium prêtes à porter, aux textures naturelles (Afro, Kinky yaki, Light yaki, Bouclées). Slogan : "Made to look like you." Activité 100 % en ligne, basée à Douala (Cameroun). Accessoires offerts dans le packaging.

# Livraison
- Douala, à domicile : gratuite, objectif 1 h maximum [à confirmer].
- Retrait à Bali (Douala) : derrière Somatel Hôtel, après Hôtel Premium.
- Autres villes du Cameroun et international : tarif communiqué sur WhatsApp avant le paiement.
- Précommande : fabrication 4 à 6 semaines après paiement, puis expédition.

# Paiement
MTN MoMo, Orange Money, virement bancaire, paiement à la livraison (Douala uniquement). Paiement intégral avant validation, sauf paiement à la livraison.

# Retours et échanges
Demande de retour sous 24 h après réception. La perruque doit être neuve, non portée, non modifiée, lace non découpée, avec ses accessoires et son emballage. Échange sous 72 h. Les retours, échanges et remboursements sont décidés par l'équipe Mandisa.

# Entretien
- Avant de la porter : préparer doucement la fibre avec les doigts, ajuster le bonnet sans tirer sur la lace.
- Lavage : eau tiède et soins doux, ne pas frotter, laisser tremper puis rincer délicatement.
- Séchage : tamponner avec une serviette propre, sécher naturellement sur un support.
- Coiffage : démêler des pointes vers les racines, chaleur modérée et adaptée à la fibre.
- Rangement : propre, sèche, à l'abri du soleil, idéalement sur un support.

# Contact
WhatsApp : +237 650 911 804. Une personne prend le relais sur WhatsApp.`;

const DEFAULTS = {
  enabled: true,
  model: "claude-haiku-5-5",
  effort: "low",
  instructions: "",
  knowledge: DEFAULT_KNOWLEDGE,
  greetingFr:
    "Bonjour ! Je peux vous aider à choisir votre perruque, vérifier la disponibilité ou répondre à vos questions sur la livraison et l'entretien.",
  greetingEn:
    "Hello! I can help you choose your wig, check availability or answer your questions about delivery and care.",
  enabledTools: [...ASSISTANT_TOOLS] as string[],
};

export const updateConfigSchema = z.object({
  enabled: z.boolean(),
  model: z.enum(ASSISTANT_MODELS),
  effort: z.enum(ASSISTANT_EFFORTS),
  instructions: z.string().max(8000),
  knowledge: z.string().max(30000),
  greetingFr: z.string().trim().min(1).max(500),
  greetingEn: z.string().trim().min(1).max(500),
  enabledTools: z.array(z.enum(ASSISTANT_TOOLS)),
});
export type AssistantConfigUpdate = z.infer<typeof updateConfigSchema>;

/** The single config row, created with defaults on first use. */
export async function getAssistantConfig() {
  const [row] = await db.select().from(aiConfig).where(eq(aiConfig.id, 1));
  if (row) return row;
  const [created] = await db
    .insert(aiConfig)
    .values({ id: 1, ...DEFAULTS })
    .onConflictDoNothing()
    .returning();
  return (
    created ?? (await db.select().from(aiConfig).where(eq(aiConfig.id, 1)))[0]!
  );
}

/** True when the configured model's provider has an API key. */
export function hasApiKey(model: string) {
  return configuredProviders()[providerOf(model)];
}

/** What the site needs to show (or hide) the assistant. */
export async function publicAssistantConfig() {
  const config = await getAssistantConfig();
  return {
    available: config.enabled && hasApiKey(config.model),
    greeting: { fr: config.greetingFr, en: config.greetingEn },
  };
}
