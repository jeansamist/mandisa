import { cacheLife, cacheTag } from "next/cache";
import type { Product, ProductDetail } from "@/lib/catalog";

// Server-only: the browser never calls the API directly.
export const API_URL = process.env.API_URL ?? "http://localhost:4000";

/** Headers proving the request comes from this web server. */
export function apiHeaders(extra: Record<string, string> = {}) {
  return {
    "x-internal-key": process.env.INTERNAL_API_KEY ?? "",
    ...extra,
  };
}

/**
 * GET on the API. `notFoundAsNull` only for single resources (a product);
 * for lists, a 404 means API_URL points to the wrong place and must fail loudly.
 */
async function apiFetch(path: string, { notFoundAsNull = false } = {}) {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { headers: apiHeaders() });
  } catch (err) {
    throw new Error(`API unreachable at ${API_URL} (check API_URL)`, {
      cause: err,
    });
  }
  if (res.status === 404 && notFoundAsNull) return null;
  if (!res.ok) {
    throw new Error(
      `API ${API_URL}${path} failed with ${res.status}` +
        (res.status === 401
          ? " (INTERNAL_API_KEY differs from the API's)"
          : "") +
        (res.status === 404 ? " (is API_URL the API project?)" : ""),
    );
  }
  return res.json() as Promise<unknown>;
}

export async function getProducts(): Promise<Product[]> {
  "use cache";
  // Stock statuses change with orders: refresh every minute.
  cacheLife("minutes");
  cacheTag("products");
  return (await apiFetch("/products")) as Product[];
}

export async function getSiteImages(): Promise<Record<string, string>> {
  "use cache";
  cacheLife("hours");
  cacheTag("site-images");
  return (await apiFetch("/site-images")) as Record<string, string>;
}

export async function getProduct(code: string): Promise<ProductDetail | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products", `product:${code.toLowerCase()}`);
  return (await apiFetch(`/products/${encodeURIComponent(code)}`, {
    notFoundAsNull: true,
  })) as ProductDetail | null;
}
