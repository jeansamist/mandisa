import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { msApi } from "@/lib/ms-api";
import type { AiConversation } from "@/lib/ms-types";
import { Badge, EmptyState, Loading, PageHeader } from "@/components/ms/ui";
import { formatDateTime, formatNumber } from "@/components/ms/format";

export const metadata: Metadata = { title: "Conversations IA" };

type SearchParams = Promise<{ page?: string; status?: string }>;

const filters = [
  { value: "", label: "Toutes" },
  { value: "open", label: "Ouvertes" },
  { value: "handed_off", label: "Transférées" },
];

function href(page: number, status: string) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (status) params.set("status", status);
  const query = params.toString();
  return `/ms/assistant/conversations${query ? `?${query}` : ""}`;
}

function StatusBadge({ status }: { status: AiConversation["status"] }) {
  return status === "handed_off" ? (
    <Badge tone="warn">Transférée</Badge>
  ) : (
    <Badge tone="good">Ouverte</Badge>
  );
}

async function ConversationList({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);
  const status =
    query.status === "open" || query.status === "handed_off"
      ? query.status
      : "";
  const params = new URLSearchParams({ page: String(page) });
  if (status) params.set("status", status);
  const data = await msApi<{
    conversations: AiConversation[];
    page: number;
    pageSize: number;
    total: number;
  }>(`/assistant/conversations?${params}`);
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <>
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Filtrer">
        {filters.map((f) => (
          <Link
            key={f.value}
            href={href(1, f.value)}
            className={`rounded-full px-3 py-1 text-sm ${
              status === f.value
                ? "bg-ms-green text-white"
                : "bg-white text-ms-ink/70 hover:text-ms-ink"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      <div className="ms-card overflow-x-auto p-0">
        {data.conversations.length === 0 ? (
          <EmptyState>Aucune conversation pour le moment.</EmptyState>
        ) : (
          <table className="ms-table">
            <thead>
              <tr>
                <th>Conversation</th>
                <th>Statut</th>
                <th>Langue</th>
                <th>Messages</th>
                <th>Tokens (entrée / sortie)</th>
                <th>Dernier message</th>
              </tr>
            </thead>
            <tbody>
              {data.conversations.map((c) => (
                <tr key={c.id}>
                  <td className="max-w-xs">
                    <Link
                      href={`/ms/assistant/conversations/${c.id}`}
                      className="font-medium text-ms-green hover:underline"
                    >
                      {c.title || "Sans titre"}
                    </Link>
                  </td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="uppercase">{c.locale}</td>
                  <td>{formatNumber(c.messageCount)}</td>
                  <td className="whitespace-nowrap text-ms-ink/70">
                    {formatNumber(c.inputTokens)} /{" "}
                    {formatNumber(c.outputTokens)}
                  </td>
                  <td className="whitespace-nowrap">
                    {formatDateTime(c.lastMessageAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {pages > 1 && (
        <nav
          className="mt-4 flex items-center justify-between text-sm"
          aria-label="Pagination"
        >
          {page > 1 ? (
            <Link
              href={href(page - 1, status)}
              className="text-ms-green hover:underline"
            >
              ← Précédent
            </Link>
          ) : (
            <span />
          )}
          <span className="text-ms-ink/60">
            Page {page} sur {pages} · {formatNumber(data.total)} conversations
          </span>
          {page < pages ? (
            <Link
              href={href(page + 1, status)}
              className="text-ms-green hover:underline"
            >
              Suivant →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}

export default function ConversationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <>
      <PageHeader
        title="Conversations IA"
        description="Échanges entre l'assistante et les visiteurs du site."
        actions={
          <Link href="/ms/assistant" className="ms-btn ms-btn-outline">
            Configuration
          </Link>
        }
      />
      <Suspense fallback={<Loading />}>
        <ConversationList searchParams={searchParams} />
      </Suspense>
    </>
  );
}
