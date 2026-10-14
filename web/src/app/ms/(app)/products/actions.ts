"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { msMutate } from "@/lib/ms-api";
import { errorMessage, type ActionResult } from "./_shared/errors";

// Catalog mutations: the shop caches products under the "products" tag,
// so every success refreshes it (and this admin page).

type Texture = "afro" | "kinkyYaki" | "lightYaki" | "curly";

export type ProductInput = {
  name: string;
  texture: Texture;
  descriptionFr: string;
  descriptionEn: string;
  isActive: boolean;
};

async function mutate(
  path: string,
  method: string,
  body?: unknown,
): Promise<ActionResult> {
  const result = await msMutate(path, { method, body });
  if (!result.ok)
    return { ok: false, message: errorMessage(result.error, result.details) };
  updateTag("products");
  refresh();
  return { ok: true };
}

const enc = encodeURIComponent;

export async function createProduct(
  input: ProductInput & { code: string },
): Promise<ActionResult> {
  const result = await msMutate("/products", { method: "POST", body: input });
  if (!result.ok)
    return { ok: false, message: errorMessage(result.error, result.details) };
  updateTag("products");
  redirect(`/ms/products/${enc(input.code.trim().toUpperCase())}`);
}

export async function updateProduct(code: string, input: ProductInput) {
  return mutate(`/products/${enc(code)}`, "PUT", input);
}

export async function createVariant(
  code: string,
  input: {
    lengthInches: number;
    color: string;
    capSize: "S" | "M" | "L";
    priceXaf: number;
    stockOnHand: number;
    lowStockThreshold: number;
    preorderEnabled: boolean;
  },
) {
  return mutate(`/products/${enc(code)}/variants`, "POST", input);
}

export async function updateVariant(
  sku: string,
  input: {
    priceXaf: number;
    lowStockThreshold: number;
    preorderEnabled: boolean;
    stockOnHand: number;
    stockReason: "entry" | "correction";
    stockNote: string | null;
  },
) {
  return mutate(`/variants/${enc(sku)}`, "PUT", input);
}

export async function addMedia(
  code: string,
  input: { url: string; kind: "image" | "video"; approved: boolean },
) {
  return mutate(`/products/${enc(code)}/media`, "POST", input);
}

export async function updateMedia(
  id: number,
  input: { approved: boolean; position: number },
) {
  return mutate(`/media/${id}`, "PUT", input);
}

export async function deleteMedia(id: number) {
  return mutate(`/media/${id}`, "DELETE");
}
