export type StockStatus = "inStock" | "lowStock" | "preorder" | "soldOut";

export type StockInput = {
  stockOnHand: number;
  stockReserved: number;
  lowStockThreshold: number;
  preorderEnabled: boolean;
};

export function availableQuantity(v: StockInput) {
  return Math.max(0, v.stockOnHand - v.stockReserved);
}

/** Public stock status of a single variant. */
export function variantStatus(v: StockInput): StockStatus {
  const available = availableQuantity(v);
  if (available > v.lowStockThreshold) return "inStock";
  if (available > 0) return "lowStock";
  return v.preorderEnabled ? "preorder" : "soldOut";
}

const rank: Record<StockStatus, number> = {
  inStock: 0,
  lowStock: 1,
  preorder: 2,
  soldOut: 3,
};

/** A product is as available as its most available variant. */
export function productStatus(variants: StockInput[]): StockStatus {
  return variants
    .map(variantStatus)
    .reduce<StockStatus>(
      (best, s) => (rank[s] < rank[best] ? s : best),
      "soldOut",
    );
}
