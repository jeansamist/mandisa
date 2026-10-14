import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { msApi } from "@/lib/ms-api";
import type { AssistantConfigResponse } from "@/lib/ms-types";
import { Loading, PageHeader } from "@/components/ms/ui";
import { formatDateTime } from "@/components/ms/format";
import AssistantConfigForm from "./config-form";

export const metadata: Metadata = { title: "Assistant IA" };

async function AssistantConfigContent() {
  const { config, options, apiKeyConfigured, providers } =
    await msApi<AssistantConfigResponse>("/assistant/config");
  const isGemini = config.model.startsWith("gemini-");
  const keyName = isGemini ? "GEMINI_API_KEY" : "ANTHROPIC_API_KEY";
  return (
    <>
      {!apiKeyConfigured && (
        <div
          className="ms-card mb-6 border-ms-clay/40 bg-ms-clay/10 text-sm"
          role="alert"
        >
          <p className="font-semibold">
            Clé API {isGemini ? "Gemini" : "Claude"} manquante
          </p>
          <p className="mt-1 text-ms-ink/70">
            <code>{keyName}</code> n&apos;est pas renseignée dans{" "}
            <code>api/.env</code> : l&apos;assistant est masqué sur le site.
            Ajoutez la clé puis redémarrez l&apos;API.
          </p>
        </div>
      )}
      <p className="mb-4 text-xs text-ms-ink/50">
        Dernière modification : {formatDateTime(config.updatedAt)}
      </p>
      <AssistantConfigForm
        initial={config}
        options={options}
        providers={providers}
      />
    </>
  );
}

export default function AssistantPage() {
  return (
    <>
      <PageHeader
        title="Assistant IA"
        description="Comportement de l'assistante du site : modèle, outils, consignes et connaissances."
        actions={
          <Link
            href="/ms/assistant/conversations"
            className="ms-btn ms-btn-outline"
          >
            Voir les conversations
          </Link>
        }
      />
      <Suspense fallback={<Loading />}>
        <AssistantConfigContent />
      </Suspense>
    </>
  );
}
