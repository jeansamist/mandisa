import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import ShopProvider from "@/components/shop-provider";
import "./globals.css";

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

export const metadata: Metadata = {
  title: { default: "Mandisa — Made to look like you.", template: "%s · Mandisa" },
  description: "This premium e-commerce platform offers ready-to-wear natural-texture wigs and accessories, celebrating Black beauty with a seamless shopping experience.",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body>
        <ShopProvider>{children}</ShopProvider>
      </body>
    </html>
  );
}
