import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Enum values match the translation keys used by the web app.
export const textureEnum = pgEnum("texture", [
  "afro",
  "kinkyYaki",
  "lightYaki",
  "curly",
]);
export const capSizeEnum = pgEnum("cap_size", ["S", "M", "L"]);
export const mediaKindEnum = pgEnum("media_kind", ["image", "video"]);

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  texture: textureEnum("texture").notNull(),
  descriptionFr: text("description_fr").notNull(),
  descriptionEn: text("description_en").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const variants = pgTable(
  "variants",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").notNull().unique(),
    lengthInches: integer("length_inches").notNull(),
    color: text("color").notNull(),
    capSize: capSizeEnum("cap_size").notNull(),
    // Amounts are integers in XAF, never floats.
    priceXaf: integer("price_xaf").notNull(),
    stockOnHand: integer("stock_on_hand").notNull().default(0),
    stockReserved: integer("stock_reserved").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(2),
    preorderEnabled: boolean("preorder_enabled").notNull().default(false),
  },
  (t) => [
    check("variants_price_positive", sql`${t.priceXaf} > 0`),
    check(
      "variants_stock_non_negative",
      sql`${t.stockOnHand} >= 0 AND ${t.stockReserved} >= 0`,
    ),
  ],
);

export const productMedia = pgTable("product_media", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  kind: mediaKindEnum("kind").notNull().default("image"),
  position: integer("position").notNull().default(0),
  // Only approved media are shown publicly (and by the AI assistant).
  approved: boolean("approved").notNull().default(false),
});

export const productsRelations = relations(products, ({ many }) => ({
  variants: many(variants),
  media: many(productMedia),
}));

export const variantsRelations = relations(variants, ({ one }) => ({
  product: one(products, {
    fields: [variants.productId],
    references: [products.id],
  }),
}));

export const productMediaRelations = relations(productMedia, ({ one }) => ({
  product: one(products, {
    fields: [productMedia.productId],
    references: [products.id],
  }),
}));

// Marketing imagery (hero, texture cards…), addressed by a stable key used by the web app.
export const siteImages = pgTable("site_images", {
  key: text("key").primaryKey(),
  url: text("url").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
