import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { msApi } from "@/lib/ms-api";
import type { AiConversationDetail } from "@/lib/ms-types";
import { Badge, EmptyState, Loading, PageHeader } from "@/components/ms/ui";
import { formatDateTime, formatNumber } from "@/components/ms/format";

export const metadata: Metadata = { title: "Conversation IA" };

type Params = Promise<{ id: string }>;

const toolLabels: Record<string, string> = {
  search_catalog: "Recherche catalogue",
  get_product_details: "Détails produit",
  get_delivery_and_payment: "Livraison et paiement",
  get_store_information: "Informations boutique",
  handoff_to_human: "Transfert à l'équipe",
};

async function Conversation({ params }: { params: Params }) {
  const { id } = await params;
  const { conversation, messages, actions } = await msApi<AiConversationDetail>(
    `/assistant/conversations/${encodeURIComponent(id)}`,
  );
  return (
    <>
      <PageHeader
        title={conversation.title || "Conversation"}
        description={`Commencée le ${formatDateTime(conversation.startedAt)} · dernier message le ${formatDateTime(
          conversation.lastMessageAt,
        )}`}
        actions={
          <Link
            href="/ms/assistant/conversations"
            className="ms-btn ms-btn-outline"
          >
            ← Conversations
          </Link>
        }
      />
      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        {conversation.status === "handed_off" ? (
          <Badge tone="warn">Transférée à l&apos;équipe</Badge>
        ) : (
          <Badge tone="good">Ouverte</Badge>
        )}
        <Badge>{conversation.locale.toUpperCase()}</Badge>
        <Badge>{formatNumber(conversation.messageCount)} messages client</Badge>
        <Badge>
          {formatNumber(conversation.inputTokens)} tokens entrée ·{" "}
          {formatNumber(conversation.outputTokens)} sortie
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="ms-card grid gap-3" aria-label="Transcription">
          {messages.length === 0 && <EmptyState>Aucun message.</EmptyState>}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                m.role === "user"
                  ? "ml-auto rounded-tr-sm bg-ms-sage/40"
                  : "rounded-tl-sm bg-ms-cream"
              }`}
            >
              <p className="mb-1 text-xs font-medium text-ms-ink/50">
                {m.role === "user" ? "Cliente" : "Assistante"} ·{" "}
                {formatDateTime(m.createdAt)}
              </p>
              <p className="whitespace-pre-line">{m.text}</p>
            </div>
          ))}
        </section>

        <section className="ms-card h-fit" aria-label="Actions de l'IA">
          <details open={actions.length <= 6}>
            <summary className="cursor-pointer text-sm font-semibold">
              Actions de l&apos;IA ({actions.length})
            </summary>
            {actions.length === 0 ? (
              <EmptyState>Aucun outil utilisé.</EmptyState>
            ) : (
              <ol className="mt-3 grid gap-3">
                {actions.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-xl border border-ms-ink/10 p-3 text-xs"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="font-semibold">
                        {toolLabels[a.tool] ?? a.tool}
                      </span>
                      {a.isError ? (
                        <Badge tone="bad">Erreur</Badge>
                      ) : (
                        <Badge tone="good">OK</Badge>
                      )}
                    </div>
                    <p className="mb-1 text-ms-ink/50">
                      {formatDateTime(a.createdAt)}
                    </p>
                    <p className="font-medium">Paramètres</p>
                    <pre className="mb-2 overflow-x-auto rounded bg-ms-ink/5 p-2">
                      {JSON.stringify(a.input, null, 2)}
                    </pre>
                    {a.resultSummary && (
                      <>
                        <p className="font-medium">Résultat (extrait)</p>
                        <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-ms-ink/5 p-2">
                          {a.resultSummary}
                        </pre>
                      </>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </details>
        </section>
      </div>
    </>
  );
}

export default function ConversationPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<Loading />}>
      <Conversation params={params} />
    </Suspense>
  );
}
