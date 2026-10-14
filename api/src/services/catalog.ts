import { and, asc, eq, type SQL } from "drizzle-orm";
import { db } from "../db/client.js";
import { productMedia, products } from "../db/schema.js";
import {
  availableQuantity,
  productStatus,
  variantStatus,
  type StockInput,
  type StockStatus,
} from "./stock-status.js";

// Public catalog: never exposes raw stock, costs or margins.

export type ProductSummary = {
  code: string;
  name: string;
  texture: string;
  /** Lowest variant price, integer XAF. */
  priceXaf: number;
  status: StockStatus;
  /** Remaining units when `status` is "lowStock", otherwise null. */
  lowStockQuantity: number | null;
  image: string | null;
};

export type ProductDetail = ProductSummary & {
  description: { fr: string; en: string };
  variants: {
    sku: string;
    lengthInches: number;
    color: string;
    capSize: string;
    priceXaf: number;
    status: StockStatus;
    lowStockQuantity: number | null;
  }[];
  media: { url: string; kind: "image" | "video" }[];
};

function queryProducts(where: SQL | undefined) {
  return db.query.products.findMany({
    where,
    with: {
      variants: true,
      media: {
        where: eq(productMedia.approved, true),
        orderBy: [asc(productMedia.position)],
      },
    },
    orderBy: [asc(products.code)],
  });
}

type ProductRow = Awaited<ReturnType<typeof queryProducts>>[number];

function lowStockQuantity(status: StockStatus, stock: StockInput[]) {
  if (status !== "lowStock") return null;
  return stock.reduce((sum, v) => sum + availableQuantity(v), 0);
}

function toSummary(row: ProductRow): ProductSummary {
  const status = productStatus(row.variants);
  return {
    code: row.code,
    name: row.name,
    texture: row.texture,
    priceXaf: Math.min(...row.variants.map((v) => v.priceXaf)),
    status,
    lowStockQuantity: lowStockQuantity(status, row.variants),
    image: row.media.find((m) => m.kind === "image")?.url ?? null,
  };
}

export async function listProducts(): Promise<ProductSummary[]> {
  const rows = await queryProducts(eq(products.isActive, true));
  // A product without variants cannot be sold yet.
  return rows.filter((r) => r.variants.length > 0).map(toSummary);
}

export async function getProduct(code: string): Promise<ProductDetail | null> {
  const [row] = await queryProducts(
    and(eq(products.code, code.toUpperCase()), eq(products.isActive, true)),
  );
  if (!row || row.variants.length === 0) return null;
  return {
    ...toSummary(row),
    description: { fr: row.descriptionFr, en: row.descriptionEn },
    variants: row.variants
      .toSorted((a, b) => a.lengthInches - b.lengthInches || a.id - b.id)
      .map((v) => {
        const status = variantStatus(v);
        return {
          sku: v.sku,
          lengthInches: v.lengthInches,
          color: v.color,
          capSize: v.capSize,
          priceXaf: v.priceXaf,
          status,
          lowStockQuantity: lowStockQuantity(status, [v]),
        };
      }),
    media: row.media.map((m) => ({ url: m.url, kind: m.kind })),
  };
}
