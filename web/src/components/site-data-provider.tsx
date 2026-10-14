"use client";

import { createContext, useContext } from "react";
import type { Product } from "@/lib/catalog";
import type { SiteImageKey } from "@/lib/site-images";

type SiteData = {
  products: Product[];
  images: Record<string, string>;
};

const SiteDataContext = createContext<SiteData | null>(null);

function useSiteData() {
  const data = useContext(SiteDataContext);
  if (!data) throw new Error("Must be used within SiteDataProvider");
  return data;
}

/** Product summaries fetched once on the server and shared with client components. */
export function useCatalog() {
  const { products } = useSiteData();
  return {
    products,
    find: (code: string) =>
      products.find((p) => p.code.toLowerCase() === code.toLowerCase()),
  };
}

/** Marketing image URL by key (empty string until it exists in the database). */
export function useSiteImage() {
  const { images } = useSiteData();
  return (key: SiteImageKey) => images[key] ?? "";
}

export default function SiteDataProvider({
  children,
  ...data
}: SiteData & { children: React.ReactNode }) {
  return (
    <SiteDataContext.Provider value={data}>{children}</SiteDataContext.Provider>
  );
}
