import type { Metadata } from "next";
import Link from "next/link";
import { routing } from "@/i18n/routing";
import "./globals.css";

export const metadata: Metadata = {
  title: "Page introuvable · Page not found",
};

// Unmatched URLs outside any locale (rare: the proxy prefixes a locale first).
export default function GlobalNotFound() {
  return (
    <html lang={routing.defaultLocale}>
      <body>
        <main className="page container empty">
          <h1>Page introuvable · Page not found</h1>
          <p>
            <Link href="/">Mandisa</Link>
          </p>
        </main>
      </body>
    </html>
  );
}
