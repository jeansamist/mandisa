import { formatNumber } from "@/components/ms/format";

// Hand-written charts for the dashboard (dataviz skill): one series per chart,
// thin columns with 4px rounded tops, hairline grid, hover/focus tooltips, and a
// data table under each chart so no value depends on hovering.

/** Brand green that passes the palette validator (chroma floor, contrast on white). */
export const CHART_GREEN = "#3f7d47";

const compact = new Intl.NumberFormat("fr-FR", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const dayLabel = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** Rounds the axis maximum up to a clean value (1, 2, 2.5, 5 × 10ⁿ). */
function niceMax(value: number) {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * power >= value)!;
  return step * power;
}

export type ColumnPoint = {
  day: string;
  value: number;
  /** Full text for the tooltip and table, e.g. "98 000 FCFA". */
  valueLabel: string;
  /** Optional second line in the tooltip. */
  detail?: string;
};

export function ColumnChart({
  title,
  subtitle,
  points,
  valueHeader,
}: {
  title: string;
  subtitle: string;
  points: ColumnPoint[];
  valueHeader: string;
}) {
  const max = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const ticks = [max, max / 2, 0];
  const empty = points.every((p) => p.value === 0);
  const label = (day: string) => dayLabel.format(new Date(`${day}T12:00:00Z`));

  return (
    <figure className="ms-card m-0">
      <figcaption className="mb-4">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-ms-ink/55">{subtitle}</p>
      </figcaption>
      <div className="grid grid-cols-[auto_1fr] gap-x-2">
        {/* Y axis: clean, compact ticks */}
        <div className="relative h-40 w-10 text-right text-[11px] tabular-nums text-ms-ink/50">
          {ticks.map((t, i) => (
            <span
              key={t}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
            >
              {compact.format(t)}
            </span>
          ))}
        </div>
        <div className="relative h-40">
          {/* Hairline, solid, recessive grid */}
          {ticks.map((t, i) => (
            <div
              key={t}
              className="absolute inset-x-0 border-t border-ms-ink/10"
              style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
            />
          ))}
          {empty && (
            <p className="absolute inset-0 grid place-items-center text-xs text-ms-ink/45">
              Pas encore de données sur la période
            </p>
          )}
          <div className="absolute inset-0 flex items-end">
            {points.map((p) => (
              <div
                key={p.day}
                tabIndex={0}
                aria-label={`${label(p.day)} : ${p.valueLabel}${p.detail ? `, ${p.detail}` : ""}`}
                className="group relative flex h-full flex-1 items-end justify-center outline-none"
              >
                {p.value > 0 && (
                  <div
                    className="w-full max-w-[24px] rounded-t-[4px] transition-opacity group-hover:opacity-75 group-focus-visible:opacity-75"
                    style={{
                      height: `${(p.value / max) * 100}%`,
                      minHeight: 2,
                      background: CHART_GREEN,
                      // 2px surface gap between neighbouring columns
                      marginInline: 1,
                    }}
                  />
                )}
                <div
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded-md bg-ms-ink px-2 py-1 text-xs text-white shadow group-hover:block group-focus-visible:block"
                >
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span
                      className="inline-block h-0.5 w-3"
                      style={{ background: CHART_GREEN }}
                    />
                    {p.valueLabel}
                  </span>
                  {p.detail && (
                    <span className="block text-white/75">{p.detail}</span>
                  )}
                  <span className="block text-white/60">{label(p.day)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* X axis: every other day, to avoid collisions */}
        <div />
        <div className="mt-1.5 flex text-[11px] text-ms-ink/50">
          {points.map((p, i) => (
            <span key={p.day} className="flex-1 truncate text-center">
              {i % 2 === points.length % 2 ? label(p.day) : ""}
            </span>
          ))}
        </div>
      </div>
      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-ms-green">
          Voir les données
        </summary>
        <table className="ms-table mt-2">
          <thead>
            <tr>
              <th>Jour</th>
              <th className="text-right">{valueHeader}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.day}>
                <td>{label(p.day)}</td>
                <td className="text-right tabular-nums">
                  {p.valueLabel}
                  {p.detail ? ` · ${p.detail}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** Horizontal meter rows (same-ramp track), for the checkout funnel. */
export function FunnelRows({
  rows,
}: {
  rows: { label: string; value: number; of: number; note?: string }[];
}) {
  return (
    <div className="grid gap-4">
      {rows.map((r) => {
        const share = r.of > 0 ? Math.min(1, r.value / r.of) : 0;
        return (
          <div key={r.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="text-ms-ink/75">{r.label}</span>
              <span className="font-semibold">
                {formatNumber(r.value)}
                {r.note && (
                  <span className="ml-1.5 text-xs font-normal text-ms-ink/55">
                    {r.note}
                  </span>
                )}
              </span>
            </div>
            <div
              className="h-2 rounded-full"
              style={{ background: "rgb(63 125 71 / 0.14)" }}
            >
              <div
                className="h-2 rounded-full"
                style={{ width: `${share * 100}%`, background: CHART_GREEN }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
