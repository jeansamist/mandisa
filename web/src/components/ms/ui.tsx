import Link from "next/link";

// Small building blocks shared by every /ms page.

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-3xl font-semibold leading-tight text-ms-deep">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-ms-ink/60">{description}</p>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </header>
  );
}

const badgeTones = {
  neutral: "bg-ms-ink/5 text-ms-ink/70",
  good: "bg-ms-green/10 text-ms-green",
  warn: "bg-ms-clay/15 text-[#8a5a37]",
  bad: "bg-ms-error/10 text-ms-error",
} as const;

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof badgeTones;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeTones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-ms-ink/50">{children}</p>;
}

export function SectionCard({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="ms-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        {href && (
          <Link
            href={href}
            className="text-xs font-medium text-ms-green hover:underline"
          >
            Tout voir
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function Loading() {
  return (
    <p className="py-10 text-center text-sm text-ms-ink/50">Chargement…</p>
  );
}
