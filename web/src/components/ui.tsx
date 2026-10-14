"use client";

import { useRouter } from "next/navigation";

export type IconName =
  | "menu"
  | "search"
  | "user"
  | "bag"
  | "arrow"
  | "heart"
  | "check"
  | "sparkle"
  | "close"
  | "send"
  | "message"
  | "minus"
  | "plus";

export function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="6" />
        <path d="m16 16 4 4" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c.7-4 3-6 7-6s6.3 2 7 6" />
      </>
    ),
    bag: (
      <>
        <path d="M5 8h14l-1 12H6L5 8Z" />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14M14 7l5 5-5 5" />
      </>
    ),
    heart: (
      <>
        <path d="M20 9c0 5-8 10-8 10S4 14 4 9a4 4 0 0 1 7-2.6A4 4 0 0 1 20 9Z" />
      </>
    ),
    check: (
      <>
        <path d="m5 12 4 4L19 6" />
      </>
    ),
    sparkle: (
      <>
        <path d="M12 3c.7 4.7 2.3 6.3 7 7-4.7.7-6.3 2.3-7 7-.7-4.7-2.3-6.3-7-7 4.7-.7 6.3-2.3 7-7Z" />
      </>
    ),
    close: (
      <>
        <path d="m6 6 12 12M18 6 6 18" />
      </>
    ),
    send: (
      <>
        <path d="m4 4 17 8-17 8 3-8-3-8Z" />
        <path d="M7 12h14" />
      </>
    ),
    message: (
      <>
        <path d="M20 15a3 3 0 0 1-3 3H9l-5 3 1.5-4A7 7 0 1 1 20 15Z" />
      </>
    ),
    minus: (
      <>
        <path d="M5 12h14" />
      </>
    ),
    plus: (
      <>
        <path d="M5 12h14M12 5v14" />
      </>
    ),
  };
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export function Button({
  children,
  variant = "primary",
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  variant?: "primary" | "outline" | "text" | "light";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className={`button button--${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  const router = useRouter();
  return (
    <button
      className={`logo ${light ? "logo--light" : ""}`}
      onClick={() => router.push("/")}
    >
      <span>Mandisa</span>
      <small>Made to look like you.</small>
      <i>logo placeholder</i>
    </button>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  copy,
}: {
  eyebrow?: string;
  title: string;
  copy?: string;
}) {
  return (
    <div className="section-title">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
    </div>
  );
}
