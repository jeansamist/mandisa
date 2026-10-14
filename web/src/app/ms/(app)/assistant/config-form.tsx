"use client";

import { useState, useTransition } from "react";
import type { AssistantConfig } from "@/lib/ms-types";
import { saveAssistantConfig } from "./actions";

const modelNotes: Record<string, string> = {
  "claude-haiku-5-5":
    "Par défaut — le plus petit, le plus rapide et le moins cher (sans relais automatique en cas de refus)",
  "gemini-3.5-flash-lite":
    "Google — le plus petit et le moins cher de Gemini, très rapide",
  "gemini-3.8-flash": "Google — le Flash le plus récent, plus précis",
  "claude-sonnet-5-5":
    "Intermédiaire — plus précis, environ 20× le coût de Haiku",
  "claude-opus-5-5": "Le plus capable — environ 40× le coût de Haiku",
};

const providerOf = (model: string) =>
  model.startsWith("gemini-") ? ("gemini" as const) : ("anthropic" as const);
const providerLabels = { anthropic: "Claude", gemini: "Gemini" };
const providerKeys = {
  anthropic: "ANTHROPIC_API_KEY",
  gemini: "GEMINI_API_KEY",
};

const effortNotes: Record<string, string> = {
  low: "Faible — recommandé pour la discussion (rapide, économique)",
  medium: "Moyen — réponses plus réfléchies",
  high: "Élevé — plus lent et plus coûteux",
};

const toolNotes: Record<string, { label: string; description: string }> = {
  search_catalog: {
    label: "Rechercher dans le catalogue",
    description:
      "Liste les perruques avec texture, prix de départ et disponibilité.",
  },
  get_product_details: {
    label: "Détails d'un produit",
    description:
      "Longueurs, couleurs, tailles de bonnet, prix et stock d'un modèle.",
  },
  get_delivery_and_payment: {
    label: "Livraison et paiement",
    description: "Modes de livraison, frais et moyens de paiement proposés.",
  },
  get_store_information: {
    label: "Informations boutique",
    description:
      "La base de connaissances ci-dessous (FAQ, retours, entretien, contacts).",
  },
  handoff_to_human: {
    label: "Transférer à l'équipe",
    description:
      "Passe la conversation sur WhatsApp et vous alerte (commandes, retours, litiges…).",
  },
};

const errors: Record<string, string> = {
  invalid_request:
    "Certaines valeurs sont invalides (textes trop longs ou vides ?).",
};

export default function AssistantConfigForm({
  initial,
  options,
  providers,
}: {
  initial: AssistantConfig;
  options: { models: string[]; efforts: string[]; tools: string[] };
  providers: { anthropic: boolean; gemini: boolean };
}) {
  const [form, setForm] = useState({
    enabled: initial.enabled,
    model: initial.model,
    effort: initial.effort,
    instructions: initial.instructions,
    knowledge: initial.knowledge,
    greetingFr: initial.greetingFr,
    greetingEn: initial.greetingEn,
    enabledTools: initial.enabledTools,
  });
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => {
    setForm((f) => ({ ...f, [key]: value }));
    setFeedback(null);
  };

  const toggleTool = (tool: string, on: boolean) =>
    set(
      "enabledTools",
      on
        ? [...form.enabledTools, tool]
        : form.enabledTools.filter((t) => t !== tool),
    );

  const save = () =>
    startTransition(async () => {
      const result = await saveAssistantConfig(form);
      setFeedback(
        result.ok
          ? {
              ok: true,
              text: "Configuration enregistrée. Elle s'applique aux prochains messages.",
            }
          : {
              ok: false,
              text:
                errors[result.error] ?? "Enregistrement impossible. Réessayez.",
            },
      );
    });

  return (
    <form
      className="grid gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <section className="ms-card grid gap-5">
        <label className="flex items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            className="h-4 w-4 accent-ms-green"
            checked={form.enabled}
            onChange={(e) => set("enabled", e.target.checked)}
          />
          Assistant activé sur le site
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="ms-label">
            Modèle
            <select
              className="ms-input"
              value={form.model}
              onChange={(e) => set("model", e.target.value)}
            >
              {options.models.map((m) => (
                <option key={m} value={m}>
                  {providerLabels[providerOf(m)]} · {m}
                  {providers[providerOf(m)] ? "" : " (clé manquante)"}
                </option>
              ))}
            </select>
            <span className="text-xs font-normal text-ms-ink/60">
              {modelNotes[form.model]}
            </span>
            {!providers[providerOf(form.model)] && (
              <span className="text-xs font-normal text-ms-error" role="alert">
                Ajoutez <code>{providerKeys[providerOf(form.model)]}</code> dans{" "}
                <code>api/.env</code> et redémarrez l&apos;API : sans clé, ce
                modèle ne répond pas et l&apos;assistante est masquée sur le
                site.
              </span>
            )}
            <span className="text-xs font-normal text-ms-ink/50">
              Les conversations en cours gardent leur modèle ; le changement
              s&apos;applique aux nouvelles conversations.
            </span>
          </label>
          <label className="ms-label">
            Effort de réflexion
            <select
              className="ms-input"
              value={form.effort}
              onChange={(e) => set("effort", e.target.value)}
            >
              {options.efforts.map((effort) => (
                <option key={effort} value={effort}>
                  {effortNotes[effort] ?? effort}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="ms-card grid gap-3">
        <h2 className="text-sm font-semibold">Outils autorisés</h2>
        <p className="text-xs text-ms-ink/60">
          L&apos;assistant ne peut que lire ces informations : il ne modifie
          jamais les prix, le stock ou les commandes.
        </p>
        {options.tools.map((tool) => (
          <label key={tool} className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-ms-green"
              checked={form.enabledTools.includes(tool)}
              onChange={(e) => toggleTool(tool, e.target.checked)}
            />
            <span>
              <span className="font-medium">
                {toolNotes[tool]?.label ?? tool}
              </span>
              <span className="block text-xs text-ms-ink/60">
                {toolNotes[tool]?.description}
              </span>
            </span>
          </label>
        ))}
      </section>

      <section className="ms-card grid gap-4 md:grid-cols-2">
        <label className="ms-label">
          Message d&apos;accueil (FR)
          <textarea
            className="ms-input min-h-24"
            maxLength={500}
            value={form.greetingFr}
            onChange={(e) => set("greetingFr", e.target.value)}
          />
        </label>
        <label className="ms-label">
          Message d&apos;accueil (EN)
          <textarea
            className="ms-input min-h-24"
            maxLength={500}
            value={form.greetingEn}
            onChange={(e) => set("greetingEn", e.target.value)}
          />
        </label>
      </section>

      <section className="ms-card grid gap-4">
        <label className="ms-label">
          Consignes de l&apos;équipe
          <span className="text-xs font-normal text-ms-ink/60">
            Ton, priorités, produits à mettre en avant… Ces consignes
            s&apos;ajoutent aux règles de sécurité, sans pouvoir les remplacer.
          </span>
          <textarea
            className="ms-input min-h-32"
            maxLength={8000}
            value={form.instructions}
            onChange={(e) => set("instructions", e.target.value)}
          />
          <span className="text-right text-xs font-normal text-ms-ink/50">
            {form.instructions.length} / 8000
          </span>
        </label>
        <label className="ms-label">
          Base de connaissances
          <span className="text-xs font-normal text-ms-ink/60">
            FAQ, politique de retours, guide d&apos;entretien, contacts.
            C&apos;est la seule source que l&apos;assistant peut citer pour vos
            politiques : faites-la valider par la fondatrice avant publication.
          </span>
          <textarea
            className="ms-input min-h-96 font-mono text-xs"
            maxLength={30000}
            value={form.knowledge}
            onChange={(e) => set("knowledge", e.target.value)}
          />
          <span className="text-right text-xs font-normal text-ms-ink/50">
            {form.knowledge.length} / 30000
          </span>
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-4">
        <button className="ms-btn" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        {feedback && (
          <p
            className={`text-sm ${feedback.ok ? "text-ms-green" : "text-ms-error"}`}
            role="status"
          >
            {feedback.text}
          </p>
        )}
      </div>
    </form>
  );
}
