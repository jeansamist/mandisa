import type { Metadata } from "next";
import Link from "next/link";
import { msApi } from "@/lib/ms-api";
import type { Dashboard } from "@/lib/ms-types";
import {
  deliveryMethodLabels,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatXaf,
  paymentMethodLabels,
  trend,
} from "@/components/ms/format";
import { Badge, EmptyState, PageHeader, SectionCard } from "@/components/ms/ui";
import { ColumnChart, FunnelRows } from "./_dashboard/charts";
import {
  OrderStatusBadge,
  StatTile,
  TodoList,
  stepLabels,
} from "./_dashboard/parts";

export const metadata: Metadata = { title: "Tableau de bord" };

const ABANDON_AFTER_MS = 3_600_000;

/** An open checkout idle for over an hour counts as abandoned (same rule as the API). */
function isAbandoned(status: string, updatedAt: string) {
  return (
    status === "open" &&
    Date.now() - new Date(updatedAt).getTime() > ABANDON_AFTER_MS
  );
}

export default async function DashboardPage() {
  const d = await msApi<Dashboard>("/dashboard");
  const { kpis, funnel, todo, recent } = d;

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Les 30 derniers jours, comparés aux 30 jours précédents."
      />

      {/* KPI row: the revenue figure leads */}
      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="sm:col-span-2 xl:col-span-1">
          <StatTile
            label="Chiffre d'affaires"
            value={formatXaf(kpis.revenueXaf)}
            change={trend(kpis.revenueXaf, kpis.previousRevenueXaf)}
            hint="Commandes payées"
          />
        </div>
        <StatTile
          label="Commandes payées"
          value={formatNumber(kpis.paidOrders)}
          change={trend(kpis.paidOrders, kpis.previousPaidOrders)}
          hint={`${formatNumber(kpis.orders)} commandes passées`}
        />
        <StatTile
          label="Panier moyen"
          value={formatXaf(kpis.averageBasketXaf)}
          hint="Par commande payée"
        />
        <StatTile
          label="Visiteurs"
          value={formatNumber(kpis.visitors)}
          change={trend(kpis.visitors, kpis.previousVisitors)}
          hint={`${formatNumber(kpis.sessions)} visites`}
        />
        <StatTile
          label="Taux de conversion"
          value={formatPercent(kpis.conversionRate)}
          hint="Commandes payées / visites"
        />
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-[1fr_1fr_320px]">
        <ColumnChart
          title="Chiffre d'affaires"
          subtitle="Par jour, 14 derniers jours"
          valueHeader="Chiffre d'affaires"
          points={d.daily.map((p) => ({
            day: p.day,
            value: p.revenueXaf,
            valueLabel: formatXaf(p.revenueXaf),
            detail: `${p.paidOrders} commande${p.paidOrders > 1 ? "s" : ""} payée${p.paidOrders > 1 ? "s" : ""}`,
          }))}
        />
        <ColumnChart
          title="Visiteurs"
          subtitle="Visiteurs uniques par jour, 14 derniers jours"
          valueHeader="Visiteurs"
          points={d.daily.map((p) => ({
            day: p.day,
            value: p.visitors,
            valueLabel: `${formatNumber(p.visitors)} visiteur${p.visitors > 1 ? "s" : ""}`,
          }))}
        />
        <SectionCard title="À faire">
          <TodoList
            items={[
              {
                label: "Paiements à vérifier",
                count: todo.paymentsToReview,
              },
              {
                label: "Devis de livraison à envoyer",
                count: todo.quotesToSend,
              },
              {
                label: "Commandes en attente de paiement",
                count: todo.unpaidOrders,
              },
              {
                label: "Nouveaux messages",
                count: todo.newMessages,
                href: "/ms/messages",
              },
              {
                label: "Conversations IA transférées (7 j)",
                count: todo.aiHandoffs,
                href: "/ms/assistant/conversations?status=handed_off",
              },
              {
                label: "Variantes en stock faible",
                count: todo.lowStock,
                href: "/ms/products",
              },
            ]}
          />
        </SectionCard>
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        <SectionCard title="Tunnel de commande (30 j)">
          <FunnelRows
            rows={[
              {
                label: "Paniers commencés",
                value: funnel.checkoutsStarted,
                of: funnel.checkoutsStarted,
              },
              {
                label: "Commandes passées",
                value: funnel.checkoutsOrdered,
                of: funnel.checkoutsStarted,
                note: funnel.checkoutsStarted
                  ? formatPercent(
                      funnel.checkoutsOrdered / funnel.checkoutsStarted,
                    )
                  : undefined,
              },
              {
                label: "Abandonnés",
                value: funnel.checkoutsAbandoned,
                of: funnel.checkoutsStarted,
              },
            ]}
          />
        </SectionCard>
        <SectionCard title="Meilleures ventes (30 j)">
          {d.topProducts.length === 0 ? (
            <EmptyState>Aucune vente sur la période.</EmptyState>
          ) : (
            <table className="ms-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th className="text-right">Unités</th>
                  <th className="text-right">CA</th>
                </tr>
              </thead>
              <tbody>
                {d.topProducts.map((p) => (
                  <tr key={p.code}>
                    <td>
                      <Link
                        href={`/ms/products/${p.code}`}
                        className="hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="text-right tabular-nums">{p.units}</td>
                    <td className="text-right tabular-nums">
                      {formatXaf(p.revenueXaf)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
        <SectionCard title="Stock faible" href="/ms/products">
          {d.lowStock.length === 0 ? (
            <EmptyState>Aucune variante en stock faible.</EmptyState>
          ) : (
            <ul className="grid gap-2 text-sm">
              {d.lowStock.map((v) => (
                <li
                  key={v.sku}
                  className="flex items-center justify-between gap-2"
                >
                  <Link
                    href={`/ms/products/${v.productCode}`}
                    className="min-w-0 hover:underline"
                  >
                    <span className="block truncate">{v.productName}</span>
                    <span className="block text-xs text-ms-ink/50">
                      {v.sku}
                    </span>
                  </Link>
                  <Badge tone="warn">
                    {v.available} restant{v.available > 1 ? "s" : ""} · seuil{" "}
                    {v.threshold}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Paniers récents">
          {recent.checkouts.length === 0 ? (
            <EmptyState>Aucun panier pour l&apos;instant.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="ms-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Étape</th>
                    <th className="text-right">Articles</th>
                    <th>Statut</th>
                    <th>Mis à jour</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.checkouts.map((c) => {
                    const abandoned = isAbandoned(c.status, c.updated_at);
                    return (
                      <tr key={c.id}>
                        <td>
                          {c.first_name || (
                            <span className="text-ms-ink/45">Anonyme</span>
                          )}
                        </td>
                        <td>
                          {c.last_step
                            ? (stepLabels[c.last_step] ?? c.last_step)
                            : "—"}
                        </td>
                        <td className="text-right tabular-nums">{c.items}</td>
                        <td>
                          {c.order_number ? (
                            <span className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs">{c.order_number}</span>
                              {c.order_status && (
                                <OrderStatusBadge status={c.order_status} />
                              )}
                            </span>
                          ) : abandoned ? (
                            <Badge tone="bad">Abandonné</Badge>
                          ) : (
                            <Badge>En cours</Badge>
                          )}
                        </td>
                        <td className="whitespace-nowrap text-xs text-ms-ink/60">
                          {formatDateTime(c.updated_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Commandes récentes">
          {recent.orders.length === 0 ? (
            <EmptyState>Aucune commande pour l&apos;instant.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="ms-table">
                <thead>
                  <tr>
                    <th>Commande</th>
                    <th>Client</th>
                    <th>Statut</th>
                    <th className="text-right">Total</th>
                    <th>Paiement</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.orders.map((o) => (
                    <tr key={o.number}>
                      <td className="whitespace-nowrap">
                        <span className="block font-medium">{o.number}</span>
                        <span className="block text-xs text-ms-ink/50">
                          {formatDateTime(o.created_at)}
                        </span>
                      </td>
                      <td>
                        {o.first_name} {o.last_name}
                        <span className="block text-xs text-ms-ink/50">
                          {deliveryMethodLabels[o.delivery_method] ??
                            o.delivery_method}
                        </span>
                      </td>
                      <td>
                        <OrderStatusBadge status={o.status} />
                      </td>
                      <td className="whitespace-nowrap text-right tabular-nums">
                        {o.total_xaf === null
                          ? "Sur devis"
                          : formatXaf(o.total_xaf)}
                      </td>
                      <td className="text-xs">
                        {o.payment_method
                          ? (paymentMethodLabels[o.payment_method] ??
                            o.payment_method)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Clientes récentes">
          {recent.customers.length === 0 ? (
            <EmptyState>Aucune cliente pour l&apos;instant.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="ms-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Téléphone</th>
                    <th className="text-right">Commandes</th>
                    <th className="text-right">Dépensé</th>
                    <th>Depuis</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.customers.map((c) => (
                    <tr key={c.id}>
                      <td>
                        {c.first_name} {c.last_name}
                      </td>
                      <td className="whitespace-nowrap">
                        <a href={`tel:${c.phone}`} className="hover:underline">
                          {c.phone}
                        </a>
                      </td>
                      <td className="text-right tabular-nums">{c.orders}</td>
                      <td className="whitespace-nowrap text-right tabular-nums">
                        {formatXaf(c.spent_xaf)}
                      </td>
                      <td className="text-xs text-ms-ink/60">
                        {formatDate(c.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Messages de contact" href="/ms/messages">
          {recent.messages.length === 0 ? (
            <EmptyState>Aucun message pour l&apos;instant.</EmptyState>
          ) : (
            <ul className="grid gap-3">
              {recent.messages.map((m) => (
                <li key={m.id} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{m.name}</span>
                    <span className="flex items-center gap-2">
                      {m.status === "new" && <Badge tone="warn">Nouveau</Badge>}
                      <span className="text-xs text-ms-ink/50">
                        {formatDateTime(m.created_at)}
                      </span>
                    </span>
                  </div>
                  <p className="line-clamp-2 text-ms-ink/70">{m.message}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Conversations avec l'assistante IA"
          href="/ms/assistant/conversations"
        >
          {recent.conversations.length === 0 ? (
            <EmptyState>Aucune conversation pour l&apos;instant.</EmptyState>
          ) : (
            <ul className="grid gap-1">
              {recent.conversations.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/ms/assistant/conversations/${c.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-ms-ink/5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate">
                        {c.title || "Sans titre"}
                      </span>
                      <span className="block text-xs text-ms-ink/50">
                        {c.message_count} message
                        {c.message_count > 1 ? "s" : ""} ·{" "}
                        {c.locale.toUpperCase()} ·{" "}
                        {formatDateTime(c.last_message_at)}
                      </span>
                    </span>
                    {c.status === "handed_off" ? (
                      <Badge tone="warn">Transférée</Badge>
                    ) : (
                      <Badge>Ouverte</Badge>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>
    </>
  );
}
