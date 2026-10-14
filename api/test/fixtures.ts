import { sql } from "drizzle-orm";
import { db } from "../src/db/client.js";
import {
  deliveryMethods,
  paymentMethods,
  products,
  variants,
} from "../src/db/schema.js";

/** Empties every table and loads a tiny catalog. */
export async function resetDatabase() {
  await db.execute(sql`
    truncate table ai_actions, ai_messages, ai_conversations, ai_config, contact_messages,
      admin_sessions, audit_log, admin_users, analytics_events, analytics_sessions,
      notifications, webhook_events, checkout_events, stock_movements,
      reservations, payments, order_items, orders, checkout_sessions, customers,
      product_media, variants, products, delivery_methods, payment_methods
    restart identity cascade
  `);
  await db.execute(sql`alter sequence order_number_seq restart with 1`);

  await db.insert(deliveryMethods).values([
    {
      code: "douala_home",
      feeXaf: 0,
      allowsCashOnDelivery: true,
      requiresAddress: true,
      position: 0,
    },
    { code: "bali_pickup", feeXaf: 0, requiresAddress: false, position: 1 },
    { code: "yaounde", feeXaf: 3000, position: 2 },
    { code: "other_city", feeXaf: null, position: 3 },
  ]);
  await db.insert(paymentMethods).values([
    { code: "mtn_momo", provider: "elgiopay", position: 0 },
    { code: "orange_money", provider: "elgiopay", position: 1 },
    { code: "bank_transfer", provider: "manual", position: 2 },
    { code: "cash_on_delivery", provider: "manual", position: 3 },
  ]);

  const [product] = await db
    .insert(products)
    .values({
      code: "MDS-W01",
      name: "Nadège",
      texture: "afro",
      descriptionFr: "fr",
      descriptionEn: "en",
    })
    .returning();
  await db.insert(variants).values([
    // One unit in stock.
    {
      productId: product!.id,
      sku: "W01-LAST",
      lengthInches: 14,
      color: "naturalBlack",
      capSize: "M",
      priceXaf: 98000,
      stockOnHand: 1,
    },
    // Plenty of stock.
    {
      productId: product!.id,
      sku: "W01-MANY",
      lengthInches: 16,
      color: "naturalBlack",
      capSize: "M",
      priceXaf: 106000,
      stockOnHand: 5,
    },
    // Out of stock, pre-order allowed.
    {
      productId: product!.id,
      sku: "W01-PRE",
      lengthInches: 18,
      color: "naturalBlack",
      capSize: "M",
      priceXaf: 114000,
      preorderEnabled: true,
    },
    // Out of stock, no pre-order.
    {
      productId: product!.id,
      sku: "W01-NONE",
      lengthInches: 12,
      color: "naturalBlack",
      capSize: "M",
      priceXaf: 98000,
    },
  ]);
}

export function orderInput(overrides: Record<string, unknown> = {}) {
  return {
    idempotencyKey: crypto.randomUUID(),
    locale: "fr" as const,
    cart: [{ sku: "W01-MANY", quantity: 1 }],
    customer: {
      firstName: "Mireille",
      lastName: "Ngo",
      phone: "650 911 804",
      email: null,
    },
    delivery: {
      method: "douala_home",
      district: "Bonapriso",
      landmark: "Près de la pharmacie",
    },
    paymentMethod: "mtn_momo" as const,
    acceptTerms: true as const,
    marketingOptIn: false,
    ...overrides,
  };
}
