import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
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

// ---------------------------------------------------------------------------
// Checkout, orders and payments
// ---------------------------------------------------------------------------

export const orderStatusEnum = pgEnum("order_status", [
  "draft", // quote requested: delivery fee to be set by the founder
  "pending_payment",
  "payment_review", // manual payment to confirm by the founder
  "paid",
  "in_preparation",
  "in_production", // pre-order: 4 to 6 weeks
  "ready",
  "shipped",
  "delivered",
  "cancelled",
  "return_requested",
  "return_received",
  "exchanged",
  "refunded",
]);
export const orderChannelEnum = pgEnum("order_channel", [
  "site",
  "whatsapp",
  "ai",
]);
export const paymentMethodCodeEnum = pgEnum("payment_method_code", [
  "mtn_momo",
  "orange_money",
  "bank_transfer",
  "cash_on_delivery",
  "card",
]);
export const paymentProviderEnum = pgEnum("payment_provider", [
  "elgiopay",
  "manual",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "completed",
  "failed",
  "expired",
]);
export const reservationStatusEnum = pgEnum("reservation_status", [
  "active",
  "consumed",
  "released",
]);
export const stockMovementTypeEnum = pgEnum("stock_movement_type", [
  "entry",
  "reservation",
  "release",
  "sale",
  "return",
  "correction",
]);
export const checkoutSessionStatusEnum = pgEnum("checkout_session_status", [
  "open",
  "ordered",
]);
export const notificationRecipientEnum = pgEnum("notification_recipient", [
  "customer",
  "admin",
]);
export const notificationStatusEnum = pgEnum("notification_status", [
  "pending",
  "sent",
  "failed",
]);

/** Shipping options and their fees, decided by the business (not the client). */
export const deliveryMethods = pgTable("delivery_methods", {
  code: text("code").primaryKey(),
  /** Integer XAF. Null: the founder quotes the fee before payment. */
  feeXaf: integer("fee_xaf"),
  allowsCashOnDelivery: boolean("allows_cash_on_delivery")
    .notNull()
    .default(false),
  requiresAddress: boolean("requires_address").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  position: integer("position").notNull().default(0),
});

/** Payment methods offered at checkout (further filtered by business rules). */
export const paymentMethods = pgTable("payment_methods", {
  code: paymentMethodCodeEnum("code").primaryKey(),
  provider: paymentProviderEnum("provider").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  position: integer("position").notNull().default(0),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  /** E.164, e.g. +237650911804. */
  phone: text("phone").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  marketingOptInAt: timestamp("marketing_opt_in_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** One checkout attempt, saved step by step (also covers abandoned checkouts). */
export const checkoutSessions = pgTable("checkout_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: checkoutSessionStatusEnum("status").notNull().default("open"),
  locale: text("locale").notNull(),
  cart: jsonb("cart").$type<{ sku: string; quantity: number }[]>().notNull(),
  lastStep: text("last_step"),
  contact: jsonb("contact").$type<{
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string | null;
  }>(),
  deliveryMethod: text("delivery_method"),
  paymentMethod: paymentMethodCodeEnum("payment_method"),
  orderId: integer("order_id"),
  /** Links the checkout to the visitor's browsing journey (analytics). */
  visitorId: uuid("visitor_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const orderNumberSeq = pgSequence("order_number_seq", { startWith: 1 });

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    number: text("number").notNull().unique(),
    /** Secret for the customer's order link (confirmation page, WhatsApp). */
    accessToken: text("access_token").notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    status: orderStatusEnum("status").notNull(),
    channel: orderChannelEnum("channel").notNull().default("site"),
    locale: text("locale").notNull(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id),
    checkoutSessionId: uuid("checkout_session_id").references(
      () => checkoutSessions.id,
    ),
    deliveryMethod: text("delivery_method")
      .notNull()
      .references(() => deliveryMethods.code),
    deliveryAddress: jsonb("delivery_address").$type<{
      city?: string;
      district?: string;
      landmark?: string;
      address?: string;
    }>(),
    paymentMethod: paymentMethodCodeEnum("payment_method"),
    isPreorder: boolean("is_preorder").notNull().default(false),
    subtotalXaf: integer("subtotal_xaf").notNull(),
    /** Null until the founder quotes it (status "draft"). */
    deliveryFeeXaf: integer("delivery_fee_xaf"),
    totalXaf: integer("total_xaf"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("orders_status_idx").on(t.status)],
);

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  variantId: integer("variant_id")
    .notNull()
    .references(() => variants.id),
  // Snapshot at order time: later catalog edits never change past orders.
  sku: text("sku").notNull(),
  productCode: text("product_code").notNull(),
  productName: text("product_name").notNull(),
  lengthInches: integer("length_inches").notNull(),
  color: text("color").notNull(),
  capSize: capSizeEnum("cap_size").notNull(),
  imageUrl: text("image_url"),
  unitPriceXaf: integer("unit_price_xaf").notNull(),
  quantity: integer("quantity").notNull(),
  isPreorder: boolean("is_preorder").notNull().default(false),
});

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id),
    provider: paymentProviderEnum("provider").notNull(),
    method: paymentMethodCodeEnum("method").notNull(),
    status: paymentStatusEnum("status").notNull().default("pending"),
    amountXaf: integer("amount_xaf").notNull(),
    /** ElgioPay transaction id, or the customer's bank transfer reference. */
    providerReference: text("provider_reference"),
    payerPhone: text("payer_phone"),
    failureCode: text("failure_code"),
    failureMessage: text("failure_message"),
    providerPayload: jsonb("provider_payload"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    /** Last status check with the provider (polling). */
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    /** Status checks made with the provider; capped (see payment-status-check.ts). */
    statusChecks: integer("status_checks").notNull().default(0),
  },
  (t) => [
    uniqueIndex("payments_provider_reference_idx")
      .on(t.provider, t.providerReference)
      .where(sql`${t.provider} = 'elgiopay'`),
    index("payments_order_idx").on(t.orderId),
  ],
);

export const reservations = pgTable(
  "reservations",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id),
    variantId: integer("variant_id")
      .notNull()
      .references(() => variants.id),
    quantity: integer("quantity").notNull(),
    status: reservationStatusEnum("status").notNull().default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("reservations_active_idx").on(t.status, t.expiresAt)],
);

/** Append-only stock journal. */
export const stockMovements = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  variantId: integer("variant_id")
    .notNull()
    .references(() => variants.id),
  type: stockMovementTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull(),
  orderId: integer("order_id").references(() => orders.id),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Timeline of everything that happens during checkout and to each order. */
export const checkoutEvents = pgTable(
  "checkout_events",
  {
    id: serial("id").primaryKey(),
    sessionId: uuid("session_id").references(() => checkoutSessions.id),
    orderId: integer("order_id").references(() => orders.id),
    type: text("type").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("checkout_events_session_idx").on(t.sessionId),
    index("checkout_events_order_idx").on(t.orderId),
  ],
);

/** Every webhook received, for deduplication and audit. */
export const webhookEvents = pgTable("webhook_events", {
  id: text("id").primaryKey(),
  provider: paymentProviderEnum("provider").notNull(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

/** Outbox of WhatsApp messages, sent by a background worker. */
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").references(() => orders.id),
    recipient: notificationRecipientEnum("recipient").notNull(),
    to: text("to").notNull(),
    template: text("template").notNull(),
    locale: text("locale").notNull(),
    params: jsonb("params").$type<Record<string, string>>().notNull(),
    status: notificationStatusEnum("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastError: text("last_error"),
    providerMessageId: text("provider_message_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (t) => [index("notifications_pending_idx").on(t.status, t.nextAttemptAt)],
);

// ---------------------------------------------------------------------------
// Analytics: browsing journey and clicks (see web/public/mt.js)
// ---------------------------------------------------------------------------

/** One visit: a run of activity in the browser, split after 30 min of inactivity. */
export const analyticsSessions = pgTable(
  "analytics_sessions",
  {
    id: uuid("id").primaryKey(),
    /** Random id kept in the visitor's browser; no personal data, no IP. */
    visitorId: uuid("visitor_id").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
    landingPath: text("landing_path"),
    referrer: text("referrer"),
    utm: jsonb("utm").$type<Record<string, string>>(),
    locale: text("locale"),
    device: text("device"),
    userAgent: text("user_agent"),
    pageViews: integer("page_views").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
  },
  (t) => [
    index("analytics_sessions_visitor_idx").on(t.visitorId),
    index("analytics_sessions_started_idx").on(t.startedAt),
  ],
);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: serial("id").primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => analyticsSessions.id, { onDelete: "cascade" }),
    visitorId: uuid("visitor_id").notNull(),
    /** page_view, click, page_leave, or a custom name (e.g. add_to_cart). */
    type: text("type").notNull(),
    path: text("path").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>(),
    /** When it happened in the browser (clamped to a sane range). */
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("analytics_events_session_idx").on(t.sessionId, t.occurredAt),
    index("analytics_events_type_idx").on(t.type, t.occurredAt),
  ],
);

// ---------------------------------------------------------------------------
// Management system (/ms): admin accounts, sessions, audit log
// ---------------------------------------------------------------------------

export const adminUsers = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  /** scrypt$<N>$<r>$<p>$<salt b64>$<hash b64> */
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: serial("id").primaryKey(),
    /** SHA-256 of the session token: a database leak exposes no usable token. */
    tokenHash: text("token_hash").notNull().unique(),
    adminUserId: integer("admin_user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    userAgent: text("user_agent"),
  },
  (t) => [index("admin_sessions_user_idx").on(t.adminUserId)],
);

/** Every sensitive admin action (CLAUDE.md §9). */
export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    adminUserId: integer("admin_user_id").references(() => adminUsers.id),
    action: text("action").notNull(),
    entity: text("entity"),
    entityId: text("entity_id"),
    data: jsonb("data").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("audit_log_action_idx").on(t.action, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Contact form
// ---------------------------------------------------------------------------

export const contactMessageStatusEnum = pgEnum("contact_message_status", [
  "new",
  "read",
  "archived",
]);

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  message: text("message").notNull(),
  locale: text("locale").notNull(),
  visitorId: uuid("visitor_id"),
  status: contactMessageStatusEnum("status").notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// AI assistant (site chat, Claude API)
// ---------------------------------------------------------------------------

/** Single-row configuration, edited in /ms. */
export const aiConfig = pgTable(
  "ai_config",
  {
    id: integer("id").primaryKey().default(1),
    enabled: boolean("enabled").notNull().default(true),
    model: text("model").notNull().default("claude-haiku-5-5"),
    effort: text("effort").notNull().default("low"),
    /** Extra instructions from the founder (tone, priorities…). */
    instructions: text("instructions").notNull().default(""),
    /** FAQ, care guide, returns policy… the only store facts the assistant may state. */
    knowledge: text("knowledge").notNull().default(""),
    greetingFr: text("greeting_fr").notNull().default(""),
    greetingEn: text("greeting_en").notNull().default(""),
    enabledTools: jsonb("enabled_tools").$type<string[]>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [check("ai_config_single_row", sql`${t.id} = 1`)],
);

export const aiConversationStatusEnum = pgEnum("ai_conversation_status", [
  "open",
  "handed_off",
]);

export const aiConversations = pgTable(
  "ai_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    visitorId: uuid("visitor_id"),
    locale: text("locale").notNull(),
    status: aiConversationStatusEnum("status").notNull().default("open"),
    /** Model the conversation runs on (history is stored in that provider's format). */
    model: text("model"),
    /** First customer message, shortened, for lists. */
    title: text("title"),
    messageCount: integer("message_count").notNull().default(0),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("ai_conversations_last_idx").on(t.lastMessageAt)],
);

/** Append-only API history (replayed as-is: thinking blocks must stay unchanged). */
export const aiMessages = pgTable(
  "ai_messages",
  {
    id: serial("id").primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => aiConversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    /** Content blocks exactly as sent to / returned by the API. */
    content: jsonb("content").notNull(),
    /** Visible text (customer message or assistant answer); null for tool turns. */
    text: text("text"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("ai_messages_conversation_idx").on(t.conversationId, t.id)],
);

/** Every tool call made by the assistant (CLAUDE.md §7). */
export const aiActions = pgTable(
  "ai_actions",
  {
    id: serial("id").primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => aiConversations.id, { onDelete: "cascade" }),
    tool: text("tool").notNull(),
    input: jsonb("input"),
    isError: boolean("is_error").notNull().default(false),
    resultSummary: text("result_summary"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("ai_actions_conversation_idx").on(t.conversationId)],
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
  payments: many(payments),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));
