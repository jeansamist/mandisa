import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "../db/client.js";
import { productMedia, products, variants } from "../db/schema.js";
import {
  availableQuantity,
  variantStatus,
  type StockStatus,
} from "./stock-status.js";

export const cartLineSchema = z.object({
  sku: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(10),
});
export const cartSchema = z.array(cartLineSchema).min(1).max(20);
export type CartLine = z.infer<typeof cartLineSchema>;

export type PricedLine = {
  variantId: number;
  sku: string;
  productCode: string;
  productName: string;
  lengthInches: number;
  color: string;
  capSize: "S" | "M" | "L";
  imageUrl: string | null;
  unitPriceXaf: number;
  quantity: number;
  lineTotalXaf: number;
  /** Not enough stock but pre-order is enabled: made after payment. */
  isPreorder: boolean;
  status: StockStatus;
  /** Set when the line cannot be ordered as is. */
  problem: "out_of_stock" | null;
  available: number;
};

export type PricedCart = {
  lines: PricedLine[];
  /** Cart SKUs that no longer exist or are inactive. */
  unknownSkus: string[];
  subtotalXaf: number;
  isPreorder: boolean;
};

/** Merges duplicate SKUs so quantities add up. */
function mergeLines(lines: CartLine[]) {
  const merged = new Map<string, number>();
  for (const l of lines)
    merged.set(l.sku, (merged.get(l.sku) ?? 0) + l.quantity);
  return [...merged].map(([sku, quantity]) => ({ sku, quantity }));
}

/**
 * Prices a cart from the database (never from client input). With `lock`,
 * the variant rows stay locked until the transaction ends, so concurrent
 * orders cannot reserve the same stock.
 */
export async function priceCart(
  db: Db,
  cart: CartLine[],
  { lock = false } = {},
): Promise<PricedCart> {
  const lines = mergeLines(cart);
  const skus = lines.map((l) => l.sku);

  const query = db
    .select({ variant: variants, product: products })
    .from(variants)
    .innerJoin(products, eq(products.id, variants.productId))
    .where(and(inArray(variants.sku, skus), eq(products.isActive, true)))
    .orderBy(asc(variants.id));
  const rows = lock ? await query.for("update", { of: variants }) : await query;

  const productIds = [...new Set(rows.map((r) => r.product.id))];
  const media = productIds.length
    ? await db
        .select()
        .from(productMedia)
        .where(
          and(
            inArray(productMedia.productId, productIds),
            eq(productMedia.approved, true),
            eq(productMedia.kind, "image"),
          ),
        )
        .orderBy(asc(productMedia.position))
    : [];

  const bySku = new Map(rows.map((r) => [r.variant.sku, r]));
  const priced: PricedLine[] = [];
  const unknownSkus: string[] = [];

  for (const line of lines) {
    const row = bySku.get(line.sku);
    if (!row) {
      unknownSkus.push(line.sku);
      continue;
    }
    const { variant, product } = row;
    const available = availableQuantity(variant);
    const fromStock = available >= line.quantity;
    const isPreorder = !fromStock && variant.preorderEnabled;
    priced.push({
      variantId: variant.id,
      sku: variant.sku,
      productCode: product.code,
      productName: product.name,
      lengthInches: variant.lengthInches,
      color: variant.color,
      capSize: variant.capSize,
      imageUrl: media.find((m) => m.productId === product.id)?.url ?? null,
      unitPriceXaf: variant.priceXaf,
      quantity: line.quantity,
      lineTotalXaf: variant.priceXaf * line.quantity,
      isPreorder,
      status: variantStatus(variant),
      problem: fromStock || isPreorder ? null : "out_of_stock",
      available,
    });
  }

  return {
    lines: priced,
    unknownSkus,
    subtotalXaf: priced.reduce((sum, l) => sum + l.lineTotalXaf, 0),
    isPreorder: priced.some((l) => l.isPreorder),
  };
}

/** Lines that block the order (out of stock or unknown). */
export function cartProblems(cart: PricedCart) {
  return [
    ...cart.lines
      .filter((l) => l.problem)
      .map((l) => ({ sku: l.sku, problem: l.problem, available: l.available })),
    ...cart.unknownSkus.map((sku) => ({
      sku,
      problem: "unknown_item" as const,
    })),
  ];
}
