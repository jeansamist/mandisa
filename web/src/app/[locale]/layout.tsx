import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import Script from "next/script";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { routing } from "@/i18n/routing";
import { getProducts, getSiteImages } from "@/lib/api";
import SiteDataProvider from "@/components/site-data-provider";
import ShopProvider from "@/components/shop-provider";
import { MotionProvider } from "@/components/motion";
import "../globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");
  return {
    title: { default: t("title"), template: "%s · Mandisa" },
    description: t("description"),
    robots: { index: false, follow: false },
    icons: { icon: "/favicon.svg" },
  };
}

export default async function LocaleLayout({
  children,
}: LayoutProps<"/[locale]">) {
  const locale = await rootLocale();
  if (!hasLocale(routing.locales, locale)) notFound();
  const [products, images] = await Promise.all([
    getProducts(),
    getSiteImages(),
  ]);

  return (
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      className={`${cormorant.variable} ${dmSans.variable}`}
    >
      <body suppressHydrationWarning>
        <NextIntlClientProvider>
          <SiteDataProvider products={products} images={images}>
            <MotionProvider>
              <ShopProvider>{children}</ShopProvider>
            </MotionProvider>
          </SiteDataProvider>
        </NextIntlClientProvider>
        {/* Journey and click tracking for the back office (vanilla JS). */}
        <Script
          src="/mt.js"
          strategy="afterInteractive"
          data-endpoint="/api/track"
        />
      </body>
    </html>
  );
}
