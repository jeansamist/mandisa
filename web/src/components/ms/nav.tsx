"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/ms", label: "Tableau de bord", exact: true },
  { href: "/ms/products", label: "Produits & stock" },
  { href: "/ms/shipping", label: "Livraison & paiement" },
  { href: "/ms/messages", label: "Messages" },
  { href: "/ms/assistant", label: "Assistant IA", exact: true },
  { href: "/ms/assistant/conversations", label: "Conversations IA" },
];

/** Links only; `pathname` null renders them without an active highlight. */
export function NavLinks({ pathname }: { pathname: string | null }) {
  return (
    <nav className="grid gap-1">
      {links.map((link) => {
        const active =
          pathname !== null &&
          (link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-lg px-3 py-2 text-sm ${
              active
                ? "bg-white/15 font-semibold text-white"
                : "text-white/75 hover:bg-white/10 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Reads the URL (dynamic): render inside <Suspense> with <NavLinks pathname={null} /> as fallback. */
export default function MsNav() {
  return <NavLinks pathname={usePathname()} />;
}
