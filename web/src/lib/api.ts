import { cacheLife, cacheTag } from "next/cache";
import type { Product, ProductDetail } from "@/lib/catalog";

// Server-only: the browser never calls the API directly.
const API_URL = process.env.API_URL ?? "http://localhost:4000";

async function apiFetch(path: string) {
  const res = await fetch(`${API_URL}${path}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${path} failed with ${res.status}`);
  return res.json() as Promise<unknown>;
}

export async function getProducts(): Promise<Product[]> {
  "use cache";
  // Stock statuses change with orders: refresh every minute.
  cacheLife("minutes");
  cacheTag("products");
  return ((await apiFetch("/products")) ?? []) as Product[];
}

export async function getSiteImages(): Promise<Record<string, string>> {
  "use cache";
  cacheLife("hours");
  cacheTag("site-images");
  return ((await apiFetch("/site-images")) ?? {}) as Record<string, string>;
}

export async function getProduct(code: string): Promise<ProductDetail | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products", `product:${code.toLowerCase()}`);
  return (await apiFetch(
    `/products/${encodeURIComponent(code)}`,
  )) as ProductDetail | null;
}
