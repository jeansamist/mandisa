import type { Metadata } from "next";
import Link from "next/link";
import { msApi } from "@/lib/ms-api";
import type { ContactMessage } from "@/lib/ms-types";
import { formatDateTime } from "@/components/ms/format";
import { Badge, EmptyState, PageHeader } from "@/components/ms/ui";
import { setMessageStatus } from "./actions";

export const metadata: Metadata = { title: "Messages" };

const tabs = [
  { key: "new", label: "Nouveaux" },
  { key: "read", label: "Lus" },
  { key: "archived", label: "Archivés" },
  { key: "all", label: "Tous" },
] as const;
type Tab = (typeof tabs)[number]["key"];

const statusBadge: Record<ContactMessage["status"], React.ReactNode> = {
  new: <Badge tone="warn">Nouveau</Badge>,
  read: <Badge tone="good">Lu</Badge>,
  archived: <Badge>Archivé</Badge>,
};

export default async function MessagesPage({
  searchParams,
}: PageProps<"/ms/messages">) {
  const raw = (await searchParams).status;
  const tab: Tab = tabs.some((t) => t.key === raw) ? (raw as Tab) : "new";
  const messages = await msApi<ContactMessage[]>(
    tab === "all" ? "/messages" : `/messages?status=${tab}`,
  );

  return (
    <>
      <PageHeader
        title="Messages"
        description="Messages envoyés depuis le formulaire de contact du site."
      />
      <nav
        className="mb-4 flex flex-wrap gap-2"
        aria-label="Filtrer les messages"
      >
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/ms/messages?status=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={`rounded-full px-4 py-1.5 text-sm ${
              tab === t.key
                ? "bg-ms-green font-semibold text-white"
                : "bg-white text-ms-ink/70 hover:bg-ms-ink/5"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {messages.length === 0 ? (
        <div className="ms-card">
          <EmptyState>Aucun message ici.</EmptyState>
        </div>
      ) : (
        <ul className="grid gap-3">
          {messages.map((m) => {
            const digits = m.phone.replace(/\D/g, "");
            return (
              <li key={m.id} className="ms-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{m.name}</p>
                    <p className="text-sm text-ms-ink/70">
                      <a href={`tel:${m.phone}`} className="hover:underline">
                        {m.phone}
                      </a>{" "}
                      ·{" "}
                      <a
                        href={`https://wa.me/${digits}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-ms-green hover:underline"
                      >
                        WhatsApp ↗
                      </a>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge[m.status]}
                    <span className="text-xs text-ms-ink/55">
                      {formatDateTime(m.createdAt)} · {m.locale.toUpperCase()}
                    </span>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">
                  {m.message}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {m.status !== "read" && (
                    <form action={setMessageStatus.bind(null, m.id, "read")}>
                      <button className="ms-btn ms-btn-outline py-1.5 text-xs">
                        Marquer comme lu
                      </button>
                    </form>
                  )}
                  {m.status !== "archived" && (
                    <form
                      action={setMessageStatus.bind(null, m.id, "archived")}
                    >
                      <button className="ms-btn ms-btn-outline py-1.5 text-xs">
                        Archiver
                      </button>
                    </form>
                  )}
                  {m.status !== "new" && (
                    <form action={setMessageStatus.bind(null, m.id, "new")}>
                      <button className="ms-btn ms-btn-outline py-1.5 text-xs">
                        Remettre en nouveau
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
