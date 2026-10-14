import Link from "next/link";
import { Badge } from "@/components/ms/ui";
import { orderStatusLabels } from "@/components/ms/format";

/** Stat tile: label · value (proportional figures) · signed change vs. previous period. */
export function StatTile({
  label,
  value,
  change,
  hint,
  hero = false,
}: {
  label: string;
  value: string;
  /** Change vs. previous 30 days, e.g. "+12 %"; up is good for every tile here. */
  change?: string | null;
  hint?: string;
  hero?: boolean;
}) {
  const up = change?.startsWith("+");
  const flat = change === "+0 %";
  return (
    <div className="ms-card">
      <p className="text-xs font-medium text-ms-ink/60">{label}</p>
      <p
        className={`mt-1 font-semibold text-ms-ink ${hero ? "text-5xl" : "text-2xl"}`}
      >
        {value}
      </p>
      {change ? (
        <p
          className={`mt-1 text-xs font-medium ${
            flat ? "text-ms-ink/55" : up ? "text-ms-green" : "text-ms-error"
          }`}
        >
          <span aria-hidden="true">{flat ? "→" : up ? "↑" : "↓"}</span> {change}{" "}
          <span className="font-normal text-ms-ink/55">vs 30 j précédents</span>
        </p>
      ) : (
        hint && <p className="mt-1 text-xs text-ms-ink/55">{hint}</p>
      )}
    </div>
  );
}

export function TodoList({
  items,
}: {
  /** Items without `href` have no management page yet: shown as plain rows. */
  items: { label: string; count: number; href?: string }[];
}) {
  return (
    <ul className="grid gap-1">
      {items.map((item) => {
        const content = (
          <>
            <span className={item.count ? "text-ms-ink" : "text-ms-ink/50"}>
              {item.label}
            </span>
            {item.count ? (
              <Badge tone="warn">{item.count}</Badge>
            ) : (
              <span className="text-xs text-ms-ink/40">0</span>
            )}
          </>
        );
        const row =
          "flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm";
        return (
          <li key={item.label}>
            {item.href ? (
              <Link href={item.href} className={`${row} hover:bg-ms-ink/5`}>
                {content}
              </Link>
            ) : (
              <div className={row}>{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const goodStatuses = new Set([
  "paid",
  "in_preparation",
  "in_production",
  "ready",
  "shipped",
  "delivered",
  "exchanged",
]);
const warnStatuses = new Set([
  "draft",
  "pending_payment",
  "payment_review",
  "return_requested",
  "return_received",
]);

export function OrderStatusBadge({ status }: { status: string }) {
  const tone = goodStatuses.has(status)
    ? "good"
    : warnStatuses.has(status)
      ? "warn"
      : status === "cancelled"
        ? "bad"
        : "neutral";
  return <Badge tone={tone}>{orderStatusLabels[status] ?? status}</Badge>;
}

export const stepLabels: Record<string, string> = {
  info: "Informations",
  delivery: "Livraison",
  payment: "Paiement",
};
