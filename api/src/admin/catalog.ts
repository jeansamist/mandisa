import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import {
  productMedia,
  products,
  stockMovements,
  variants,
} from "../db/schema.js";
import { CheckoutError } from "../services/errors.js";
import { availableQuantity, variantStatus } from "../services/stock-status.js";
import { audit } from "./audit.js";

// Catalog management (CLAUDE.md §6.1): products, variants, prices, stock, photos.

const textures = ["afro", "kinkyYaki", "lightYaki", "curly"] as const;

export const productInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  texture: z.enum(textures),
  descriptionFr: z.string().trim().min(1).max(4000),
  descriptionEn: z.string().trim().min(1).max(4000),
  isActive: z.boolean(),
});

export const createProductSchema = productInputSchema.extend({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^MDS-[A-Z0-9]{2,10}$/, "format MDS-W10"),
});

export const createVariantSchema = z.object({
  lengthInches: z.number().int().min(6).max(40),
  color: z
    .string()
    .trim()
    .regex(/^[a-zA-Z]{2,30}$/),
  capSize: z.enum(["S", "M", "L"]),
  priceXaf: z.number().int().positive().max(10_000_000),
  stockOnHand: z.number().int().min(0).max(10_000),
  lowStockThreshold: z.number().int().min(0).max(100),
  preorderEnabled: z.boolean(),
});

export const updateVariantSchema = z.object({
  priceXaf: z.number().int().positive().max(10_000_000),
  lowStockThreshold: z.number().int().min(0).max(100),
  preorderEnabled: z.boolean(),
  /** New stock on hand; the difference is journaled as an entry or a correction. */
  stockOnHand: z.number().int().min(0).max(10_000),
  stockReason: z.enum(["entry", "correction"]),
  stockNote: z.string().trim().max(200).nullish(),
});

export const mediaInputSchema = z.object({
  // Any domain, but only web addresses (no javascript:, data:, file: …).
  url: z
    .string()
    .trim()
    .max(1000)
    .url()
    .refine((u) => /^https?:\/\//i.test(u), "http or https URL"),
  kind: z.enum(["image", "video"]).default("image"),
  approved: z.boolean().default(false),
});

export const updateMediaSchema = z.object({
  approved: z.boolean(),
  position: z.number().int().min(0).max(100),
});

export async function adminListProducts() {
  const rows = await db.query.products.findMany({
    with: { variants: true, media: { orderBy: [asc(productMedia.position)] } },
    orderBy: [asc(products.code)],
  });
  return rows.map((p) => ({
    code: p.code,
    name: p.name,
    texture: p.texture,
    isActive: p.isActive,
    image: p.media.find((m) => m.approved && m.kind === "image")?.url ?? null,
    variantCount: p.variants.length,
    priceFromXaf: p.variants.length
      ? Math.min(...p.variants.map((v) => v.priceXaf))
      : null,
    stockOnHand: p.variants.reduce((s, v) => s + v.stockOnHand, 0),
    stockReserved: p.variants.reduce((s, v) => s + v.stockReserved, 0),
    lowStockVariants: p.variants.filter((v) => variantStatus(v) === "lowStock")
      .length,
    soldOutVariants: p.variants.filter((v) => variantStatus(v) === "soldOut")
      .length,
  }));
}

export async function adminGetProduct(code: string) {
  const product = await db.query.products.findFirst({
    where: eq(products.code, code.toUpperCase()),
    with: { variants: true, media: { orderBy: [asc(productMedia.position)] } },
  });
  if (!product) throw new CheckoutError("product_not_found", undefined, 404);
  return {
    ...product,
    variants: product.variants
      .toSorted(
        (a, b) =>
          a.lengthInches - b.lengthInches || a.capSize.localeCompare(b.capSize),
      )
      .map((v) => ({
        ...v,
        available: availableQuantity(v),
        status: variantStatus(v),
      })),
  };
}

export async function adminCreateProduct(
  adminUserId: number,
  input: z.infer<typeof createProductSchema>,
) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: products.id })
      .from(products)
      .where(eq(products.code, input.code));
    if (existing) throw new CheckoutError("product_code_taken", undefined, 409);
    const [product] = await tx.insert(products).values(input).returning();
    await audit(tx, {
      adminUserId,
      action: "product_created",
      entity: "product",
      entityId: input.code,
      data: input,
    });
    return product!;
  });
}

export async function adminUpdateProduct(
  adminUserId: number,
  code: string,
  input: z.infer<typeof productInputSchema>,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(products)
      .where(eq(products.code, code.toUpperCase()))
      .for("update");
    if (!before) throw new CheckoutError("product_not_found", undefined, 404);
    await tx.update(products).set(input).where(eq(products.id, before.id));
    await audit(tx, {
      adminUserId,
      action: "product_updated",
      entity: "product",
      entityId: before.code,
      data: {
        before: {
          name: before.name,
          texture: before.texture,
          isActive: before.isActive,
        },
        after: input,
      },
    });
  });
}

const colorSku: Record<string, string> = {
  naturalBlack: "NB",
  deepBrown: "DB",
  warmBrown: "WB",
};

export async function adminCreateVariant(
  adminUserId: number,
  code: string,
  input: z.infer<typeof createVariantSchema>,
) {
  return db.transaction(async (tx) => {
    const [product] = await tx
      .select()
      .from(products)
      .where(eq(products.code, code.toUpperCase()));
    if (!product) throw new CheckoutError("product_not_found", undefined, 404);
    const colorCode =
      colorSku[input.color] ?? input.color.slice(0, 3).toUpperCase();
    const sku = `${product.code}-${input.lengthInches}-${colorCode}-${input.capSize}`;
    const [taken] = await tx
      .select({ id: variants.id })
      .from(variants)
      .where(eq(variants.sku, sku));
    if (taken) throw new CheckoutError("variant_exists", { sku }, 409);
    const [variant] = await tx
      .insert(variants)
      .values({ productId: product.id, sku, ...input })
      .returning();
    if (input.stockOnHand > 0) {
      await tx.insert(stockMovements).values({
        variantId: variant!.id,
        type: "entry",
        quantity: input.stockOnHand,
        note: "initial stock",
      });
    }
    await audit(tx, {
      adminUserId,
      action: "variant_created",
      entity: "variant",
      entityId: sku,
      data: input,
    });
    return variant!;
  });
}

/** Price, thresholds, pre-order and stock of one variant; stock changes are journaled. */
export async function adminUpdateVariant(
  adminUserId: number,
  sku: string,
  input: z.infer<typeof updateVariantSchema>,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(variants)
      .where(eq(variants.sku, sku))
      .for("update");
    if (!before) throw new CheckoutError("variant_not_found", undefined, 404);
    if (input.stockOnHand < before.stockReserved) {
      throw new CheckoutError(
        "stock_below_reserved",
        { reserved: before.stockReserved },
        422,
      );
    }
    const delta = input.stockOnHand - before.stockOnHand;
    await tx
      .update(variants)
      .set({
        priceXaf: input.priceXaf,
        lowStockThreshold: input.lowStockThreshold,
        preorderEnabled: input.preorderEnabled,
        stockOnHand: input.stockOnHand,
      })
      .where(eq(variants.id, before.id));
    if (delta !== 0) {
      await tx.insert(stockMovements).values({
        variantId: before.id,
        type: input.stockReason,
        quantity: delta,
        note: input.stockNote ?? null,
      });
    }
    await audit(tx, {
      adminUserId,
      action: "variant_updated",
      entity: "variant",
      entityId: sku,
      data: {
        before: {
          priceXaf: before.priceXaf,
          stockOnHand: before.stockOnHand,
          lowStockThreshold: before.lowStockThreshold,
          preorderEnabled: before.preorderEnabled,
        },
        after: input,
      },
    });
  });
}

export async function adminAddMedia(
  adminUserId: number,
  code: string,
  input: z.infer<typeof mediaInputSchema>,
) {
  return db.transaction(async (tx) => {
    const [product] = await tx
      .select()
      .from(products)
      .where(eq(products.code, code.toUpperCase()));
    if (!product) throw new CheckoutError("product_not_found", undefined, 404);
    const [{ next } = { next: 0 }] = await tx
      .select({
        next: sql<number>`coalesce(max(${productMedia.position}) + 1, 0)`,
      })
      .from(productMedia)
      .where(eq(productMedia.productId, product.id));
    const [media] = await tx
      .insert(productMedia)
      .values({ productId: product.id, ...input, position: Number(next) })
      .returning();
    await audit(tx, {
      adminUserId,
      action: "media_added",
      entity: "product",
      entityId: product.code,
      data: input,
    });
    return media!;
  });
}

export async function adminUpdateMedia(
  adminUserId: number,
  id: number,
  input: z.infer<typeof updateMediaSchema>,
) {
  const [media] = await db
    .update(productMedia)
    .set(input)
    .where(eq(productMedia.id, id))
    .returning();
  if (!media) throw new CheckoutError("media_not_found", undefined, 404);
  await audit(db, {
    adminUserId,
    action: "media_updated",
    entity: "media",
    entityId: id,
    data: input,
  });
}

export async function adminDeleteMedia(adminUserId: number, id: number) {
  const [media] = await db
    .delete(productMedia)
    .where(and(eq(productMedia.id, id)))
    .returning();
  if (!media) throw new CheckoutError("media_not_found", undefined, 404);
  await audit(db, {
    adminUserId,
    action: "media_deleted",
    entity: "media",
    entityId: id,
    data: { url: media.url },
  });
}
