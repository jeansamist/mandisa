// Catalog types mirror the API's public product payloads (api/src/services/catalog.ts).

export const textures = ["afro", "kinkyYaki", "lightYaki", "curly"] as const;
export type Texture = (typeof textures)[number];

export type StockStatus = "inStock" | "lowStock" | "preorder" | "soldOut";

export type Product = {
  code: string;
  name: string;
  texture: Texture;
  /** Lowest variant price, integer XAF. */
  priceXaf: number;
  status: StockStatus;
  /** Remaining units when `status` is "lowStock", otherwise null. */
  lowStockQuantity: number | null;
  image: string | null;
  /** Variant added by "Add to cart" on product cards; null if nothing can be ordered. */
  defaultSku: string | null;
};

export type CapSize = "S" | "M" | "L";

export type ProductVariant = {
  sku: string;
  lengthInches: number;
  color: string;
  capSize: CapSize;
  priceXaf: number;
  status: StockStatus;
  lowStockQuantity: number | null;
};

export type ProductDetail = Product & {
  description: { fr: string; en: string };
  variants: ProductVariant[];
  media: { url: string; kind: "image" | "video" }[];
};

export function productHref(code: string) {
  return `/products/${code.toLowerCase()}`;
}
