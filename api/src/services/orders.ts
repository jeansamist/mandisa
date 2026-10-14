import { randomBytes, timingSafeEqual } from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, type Db } from "../db/client.js";
import {
  checkoutSessions,
  customers,
  deliveryMethods,
  orderItems,
  orders,
  payments,
} from "../db/schema.js";
import { env } from "../env.js";
import { elgiopay, type ElgioPayMethod } from "../integrations/elgiopay.js";
import { loggableError, logger } from "../logger.js";
import {
  availablePaymentMethods,
  isMobileMoney,
  type PaymentMethodCode,
} from "./checkout-options.js";
import { recordEvent } from "./checkout-events.js";
import { CheckoutError } from "./errors.js";
import { notifyAdmin, notifyCustomer, orderLink } from "./notifications.js";
import {
  isCameroonMobile,
  normalizePhone,
  toCameroonNational,
} from "./phone.js";
import { cartProblems, cartSchema, priceCart } from "./pricing.js";
import { reReserveStock, reserveStock } from "./stock.js";
import { checkPaymentStatus } from "./payment-status-check.js";
import type { OrderStatus } from "./order-status.js";

const log = logger.child({ module: "orders" });

const text = (max: number) => z.string().trim().min(1).max(max);

export const createOrderSchema = z.object({
  idempotencyKey: z.string().min(8).max(100),
  sessionId: z.string().uuid().nullish(),
  locale: z.enum(["fr", "en"]),
  cart: cartSchema,
  customer: z.object({
    firstName: text(80),
    lastName: text(80),
    phone: text(30),
    email: z.string().trim().email().max(200).nullish(),
  }),
  delivery: z.object({
    method: text(40),
    city: z.string().trim().max(120).nullish(),
    district: z.string().trim().max(120).nullish(),
    landmark: z.string().trim().max(200).nullish(),
    address: z.string().trim().max(200).nullish(),
  }),
  paymentMethod: z
    .enum([
      "mtn_momo",
      "orange_money",
      "bank_transfer",
      "cash_on_delivery",
      "card",
    ])
    .nullish(),
  /** Mobile money number to charge, if different from the contact phone. */
  paymentPhone: z.string().trim().max(30).nullish(),
  transferReference: z.string().trim().max(100).nullish(),
  acceptTerms: z.literal(true),
  marketingOptIn: z.boolean().default(false),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

const elgioPayMethod: Record<"mtn_momo" | "orange_money", ElgioPayMethod> = {
  mtn_momo: "mtn_mobile_money",
  orange_money: "orange_money",
};

const MAX_PAYMENT_ATTEMPTS = 5;

function reservationExpiry(method: PaymentMethodCode | null) {
  const ms = isMobileMoney(method)
    ? env.RESERVATION_MINUTES_MOBILE_MONEY * 60_000
    : env.RESERVATION_HOURS_MANUAL * 3_600_000;
  return new Date(Date.now() + ms);
}

function formatOrderNumber(n: number, date = new Date()) {
  return `MDS-${date.getFullYear()}-${String(n).padStart(4, "0")}`;
}

function cleanAddress(d: CreateOrderInput["delivery"]) {
  const entries = Object.entries({
    city: d.city,
    district: d.district,
    landmark: d.landmark,
    address: d.address,
  }).filter(([, v]) => v);
  return Object.fromEntries(entries) as Record<string, string>;
}

/**
 * Places an order: prices the cart, checks the delivery and payment rules,
 * reserves stock and queues notifications in one transaction, then starts
 * the mobile money payment. Idempotent on `idempotencyKey`.
 */
export async function createOrder(input: CreateOrderInput) {
  const replay = await findByIdempotencyKey(input.idempotencyKey);
  if (replay) {
    log.info(
      { number: replay.number },
      "order replayed (same idempotency key)",
    );
    return {
      ...(await publicOrderView(replay.id)),
      accessToken: replay.accessToken,
      replayed: true,
    };
  }

  const phone = normalizePhone(input.customer.phone);
  if (!phone) throw new CheckoutError("invalid_phone");
  const payerPhone = input.paymentPhone
    ? normalizePhone(input.paymentPhone)
    : phone;
  if (!payerPhone) throw new CheckoutError("invalid_payment_phone");

  let created: {
    orderId: number;
    paymentId: number | null;
    accessToken: string;
  };
  try {
    created = await db.transaction(async (tx) => {
      const [delivery] = await tx
        .select()
        .from(deliveryMethods)
        .where(
          and(
            eq(deliveryMethods.code, input.delivery.method),
            eq(deliveryMethods.isActive, true),
          ),
        );
      if (!delivery) throw new CheckoutError("invalid_delivery_method");
      const address = cleanAddress(input.delivery);
      if (delivery.requiresAddress && !address.address && !address.district) {
        throw new CheckoutError("address_required");
      }

      const cart = await priceCart(tx, input.cart, { lock: true });
      const problems = cartProblems(cart);
      if (problems.length)
        throw new CheckoutError("cart_unavailable", problems, 409);

      // The delivery fee and the allowed payment methods come from the database.
      const needsQuote = delivery.feeXaf === null;
      const allowed = await availablePaymentMethods(tx, delivery);
      const paymentMethod = needsQuote ? null : (input.paymentMethod ?? null);
      if (!needsQuote && (!paymentMethod || !allowed.includes(paymentMethod))) {
        throw new CheckoutError("payment_method_unavailable", { allowed });
      }
      if (isMobileMoney(paymentMethod) && !isCameroonMobile(payerPhone)) {
        throw new CheckoutError("invalid_payment_phone");
      }

      const customer = await upsertCustomer(tx, {
        phone,
        firstName: input.customer.firstName,
        lastName: input.customer.lastName,
        email: input.customer.email ?? null,
        marketingOptIn: input.marketingOptIn,
      });

      const seq = await tx.execute<{ n: string }>(
        sql`select nextval('order_number_seq') as n`,
      );
      const number = formatOrderNumber(Number(seq.rows[0]!.n));
      const accessToken = randomBytes(24).toString("base64url");
      const reference = input.transferReference || null;

      const status: OrderStatus = needsQuote
        ? "draft"
        : paymentMethod === "bank_transfer" && reference
          ? "payment_review"
          : "pending_payment";
      const deliveryFeeXaf = delivery.feeXaf;
      const totalXaf =
        deliveryFeeXaf === null ? null : cart.subtotalXaf + deliveryFeeXaf;

      const [order] = await tx
        .insert(orders)
        .values({
          number,
          accessToken,
          idempotencyKey: input.idempotencyKey,
          status,
          locale: input.locale,
          customerId: customer.id,
          checkoutSessionId: input.sessionId ?? null,
          deliveryMethod: delivery.code,
          deliveryAddress: address,
          paymentMethod,
          isPreorder: cart.isPreorder,
          subtotalXaf: cart.subtotalXaf,
          deliveryFeeXaf,
          totalXaf,
        })
        .returning();
      const orderId = order!.id;

      await tx.insert(orderItems).values(
        cart.lines.map((l) => ({
          orderId,
          variantId: l.variantId,
          sku: l.sku,
          productCode: l.productCode,
          productName: l.productName,
          lengthInches: l.lengthInches,
          color: l.color,
          capSize: l.capSize,
          imageUrl: l.imageUrl,
          unitPriceXaf: l.unitPriceXaf,
          quantity: l.quantity,
          isPreorder: l.isPreorder,
        })),
      );

      await reserveStock(
        tx,
        orderId,
        cart.lines.filter((l) => !l.isPreorder),
        reservationExpiry(paymentMethod),
      );

      let paymentId: number | null = null;
      if (paymentMethod && totalXaf !== null) {
        const [payment] = await tx
          .insert(payments)
          .values({
            orderId,
            provider: isMobileMoney(paymentMethod) ? "elgiopay" : "manual",
            method: paymentMethod,
            amountXaf: totalXaf,
            payerPhone: isMobileMoney(paymentMethod) ? payerPhone : null,
            providerReference:
              paymentMethod === "bank_transfer" ? reference : null,
          })
          .returning({ id: payments.id });
        paymentId = payment!.id;
      }

      if (input.sessionId) {
        await tx
          .update(checkoutSessions)
          .set({ status: "ordered", orderId, updatedAt: new Date() })
          .where(eq(checkoutSessions.id, input.sessionId));
      }

      await recordEvent(tx, {
        sessionId: input.sessionId,
        orderId,
        type: "order_created",
        data: {
          number,
          status,
          deliveryMethod: delivery.code,
          paymentMethod,
          subtotalXaf: cart.subtotalXaf,
          deliveryFeeXaf,
          totalXaf,
          isPreorder: cart.isPreorder,
          items: cart.lines.map((l) => ({ sku: l.sku, quantity: l.quantity })),
        },
      });

      const params = {
        firstName: customer.firstName,
        orderNumber: number,
        total: totalXaf === null ? "" : String(totalXaf),
        link: orderLink(input.locale, number, accessToken),
      };
      await notifyCustomer(tx, {
        orderId,
        to: phone,
        locale: input.locale,
        template: needsQuote ? "quote_requested" : "order_received",
        params,
      });
      await notifyAdmin(tx, {
        orderId,
        template: needsQuote
          ? "admin_quote_requested"
          : status === "payment_review"
            ? "admin_payment_review"
            : "admin_new_order",
        params: {
          orderNumber: number,
          customer: `${customer.firstName} ${customer.lastName}`,
          phone,
          total: totalXaf === null ? "" : String(totalXaf),
          deliveryMethod: delivery.code,
          paymentMethod: paymentMethod ?? "",
        },
      });

      return { orderId, paymentId, accessToken };
    });
  } catch (err) {
    // Two identical submissions raced: the other one won, return it.
    if (isUniqueViolation(err)) {
      const existing = await findByIdempotencyKey(input.idempotencyKey);
      if (existing) {
        return {
          ...(await publicOrderView(existing.id)),
          accessToken: existing.accessToken,
          replayed: true,
        };
      }
    }
    throw err;
  }

  if (created.paymentId && isMobileMoney(input.paymentMethod)) {
    await initiateMobileMoney(created.paymentId);
  }

  return {
    ...(await publicOrderView(created.orderId)),
    accessToken: created.accessToken,
    replayed: false,
  };
}

async function upsertCustomer(
  tx: Db,
  c: {
    phone: string;
    firstName: string;
    lastName: string;
    email: string | null;
    marketingOptIn: boolean;
  },
) {
  const now = new Date();
  const [customer] = await tx
    .insert(customers)
    .values({
      phone: c.phone,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      marketingOptInAt: c.marketingOptIn ? now : null,
    })
    .onConflictDoUpdate({
      target: customers.phone,
      set: {
        firstName: c.firstName,
        lastName: c.lastName,
        email: sql`coalesce(excluded.email, ${customers.email})`,
        // Consent is timestamped when first given and never silently removed.
        marketingOptInAt: c.marketingOptIn
          ? sql`coalesce(${customers.marketingOptInAt}, ${now.toISOString()}::timestamptz)`
          : sql`${customers.marketingOptInAt}`,
        updatedAt: now,
      },
    })
    .returning();
  return customer!;
}

/** Sends the mobile money prompt. The order only becomes paid through the webhook. */
async function initiateMobileMoney(paymentId: number) {
  const [row] = await db
    .select({ payment: payments, order: orders, customer: customers })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .innerJoin(customers, eq(customers.id, orders.customerId))
    .where(eq(payments.id, paymentId));
  if (!row || !isMobileMoney(row.payment.method) || !row.payment.payerPhone)
    return;
  const { payment, order, customer } = row;

  try {
    const result = await elgiopay.initiatePayment({
      amountXaf: payment.amountXaf,
      method: elgioPayMethod[payment.method as "mtn_momo" | "orange_money"],
      phone: toCameroonNational(payment.payerPhone!),
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerEmail: customer.email,
      reference: `${order.number}-P${payment.id}`,
      metadata: { order_number: order.number, payment_id: String(payment.id) },
    });
    await db.transaction(async (tx) => {
      await tx
        .update(payments)
        .set({ providerReference: result.transactionId, updatedAt: new Date() })
        .where(eq(payments.id, payment.id));
      await recordEvent(tx, {
        orderId: order.id,
        type: "payment_initiated",
        data: {
          paymentId: payment.id,
          method: payment.method,
          transactionId: result.transactionId,
        },
      });
    });
  } catch (err) {
    log.error(
      { err: loggableError(err), paymentId },
      "mobile money initiation failed",
    );
    await db.transaction(async (tx) => {
      await tx
        .update(payments)
        .set({
          status: "failed",
          failureCode: "initiation_failed",
          failureMessage: err instanceof Error ? err.message : String(err),
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));
      await recordEvent(tx, {
        orderId: order.id,
        type: "payment_initiation_failed",
        data: { paymentId: payment.id },
      });
    });
  }
}

/** Starts a new mobile money attempt after a failure or expiry (optionally on another number). */
export async function retryPayment(
  number: string,
  token: string,
  phoneInput?: string | null,
) {
  const order = await findOrderForCustomer(number, token);
  if (
    order.status !== "pending_payment" ||
    !isMobileMoney(order.paymentMethod)
  ) {
    throw new CheckoutError("payment_not_retryable");
  }

  const paymentId = await db.transaction(async (tx) => {
    const attempts = await tx
      .select()
      .from(payments)
      .where(eq(payments.orderId, order.id))
      .orderBy(desc(payments.id))
      .for("update");
    const last = attempts[0];
    if (last?.status === "completed") throw new CheckoutError("already_paid");
    if (last?.status === "pending" && last.providerReference) {
      throw new CheckoutError("payment_in_progress");
    }
    if (attempts.length >= MAX_PAYMENT_ATTEMPTS) {
      throw new CheckoutError("too_many_attempts", undefined, 429);
    }

    const phone = phoneInput ? normalizePhone(phoneInput) : last?.payerPhone;
    if (!phone || !isCameroonMobile(phone))
      throw new CheckoutError("invalid_payment_phone");

    const held = await reReserveStock(
      tx,
      order.id,
      reservationExpiry(order.paymentMethod),
    );
    if (!held) throw new CheckoutError("cart_unavailable", undefined, 409);

    if (last?.status === "pending") {
      await tx
        .update(payments)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(payments.id, last.id));
    }
    const [payment] = await tx
      .insert(payments)
      .values({
        orderId: order.id,
        provider: "elgiopay",
        method: order.paymentMethod!,
        amountXaf: order.totalXaf!,
        payerPhone: phone,
      })
      .returning({ id: payments.id });
    await recordEvent(tx, {
      orderId: order.id,
      type: "payment_retried",
      data: { paymentId: payment!.id, attempt: attempts.length + 1 },
    });
    return payment!.id;
  });

  await initiateMobileMoney(paymentId);
  return publicOrderView(order.id);
}

async function findByIdempotencyKey(key: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.idempotencyKey, key));
  return order ?? null;
}

/** Looks an order up by number and checks the customer's access token. */
export async function findOrderForCustomer(number: string, token: string) {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.number, number));
  const a = Buffer.from(order?.accessToken ?? "");
  const b = Buffer.from(token);
  if (!order || a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new CheckoutError("order_not_found", undefined, 404);
  }
  return order;
}

export async function getOrderForCustomer(number: string, token: string) {
  const order = await findOrderForCustomer(number, token);
  if (
    order.status === "pending_payment" &&
    isMobileMoney(order.paymentMethod)
  ) {
    // The confirmation page polls this endpoint: check with ElgioPay right away
    // (throttled per payment) instead of waiting for the background job.
    const [latest] = await db
      .select({ id: payments.id })
      .from(payments)
      .where(eq(payments.orderId, order.id))
      .orderBy(desc(payments.id))
      .limit(1);
    if (latest) {
      await checkPaymentStatus(latest.id).catch((err: unknown) =>
        log.warn(
          { err: loggableError(err), number },
          "on-demand payment check failed",
        ),
      );
    }
  }
  return publicOrderView(order.id);
}

/** What the customer may see about their order (no internal ids or stock data). */
export async function publicOrderView(orderId: number) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      customer: true,
      items: { orderBy: [asc(orderItems.id)] },
      payments: { orderBy: [desc(payments.id)], limit: 1 },
    },
  });
  if (!order) throw new CheckoutError("order_not_found", undefined, 404);
  const payment = order.payments[0];
  return {
    number: order.number,
    status: order.status,
    locale: order.locale,
    createdAt: order.createdAt,
    customerFirstName: order.customer.firstName,
    isPreorder: order.isPreorder,
    items: order.items.map((i) => ({
      sku: i.sku,
      productCode: i.productCode,
      productName: i.productName,
      lengthInches: i.lengthInches,
      color: i.color,
      capSize: i.capSize,
      imageUrl: i.imageUrl,
      unitPriceXaf: i.unitPriceXaf,
      quantity: i.quantity,
      lineTotalXaf: i.unitPriceXaf * i.quantity,
      isPreorder: i.isPreorder,
    })),
    subtotalXaf: order.subtotalXaf,
    deliveryFeeXaf: order.deliveryFeeXaf,
    totalXaf: order.totalXaf,
    delivery: { method: order.deliveryMethod, address: order.deliveryAddress },
    paymentMethod: order.paymentMethod,
    payment: payment
      ? {
          status: payment.status,
          method: payment.method,
          failureCode: payment.failureCode,
          // Shown as a hint ("•••• 1804") so the customer knows which phone to check.
          phoneHint: payment.payerPhone ? payment.payerPhone.slice(-4) : null,
        }
      : null,
  };
}

function isUniqueViolation(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    ((err as { code?: string }).code === "23505" ||
      (err as { cause?: { code?: string } }).cause?.code === "23505")
  );
}
