import { and, eq } from "drizzle-orm";
import { db, type Tx } from "../db/client.js";
import { customers, orders, payments, webhookEvents } from "../db/schema.js";
import { env } from "../env.js";
import {
  verifyWebhookSignature,
  webhookEnvelope,
} from "../integrations/elgiopay.js";
import { logger } from "../logger.js";
import { recordEvent } from "./checkout-events.js";
import { CheckoutError } from "./errors.js";
import { notifyAdmin, notifyCustomer, orderLink } from "./notifications.js";
import { assertTransition, type OrderStatus } from "./order-status.js";
import { consumeStockForPayment } from "./stock.js";

const log = logger.child({ module: "payments" });

/** A final payment result reported by ElgioPay (webhook or status check). */
export type PaymentOutcome = {
  status: "completed" | "failed";
  errorCode: string | null;
  message: string | null;
  /** Amount and currency reported by the provider, checked against the order. */
  amount: number | null;
  currency: string | null;
  payload: unknown;
  source: "webhook" | "status_check";
};

type Payment = typeof payments.$inferSelect;

/**
 * ElgioPay webhook. Verified, deduplicated by event id, then settled with
 * the same logic as the status check.
 */
export async function handleElgioPayWebhook(
  rawBody: string,
  signature: string | undefined,
) {
  if (!env.ELGIOPAY_WEBHOOK_SECRET) {
    throw new CheckoutError("webhook_not_configured", undefined, 503);
  }
  if (
    !verifyWebhookSignature(rawBody, signature, env.ELGIOPAY_WEBHOOK_SECRET)
  ) {
    log.warn("rejected webhook: bad or stale signature");
    throw new CheckoutError("invalid_signature", undefined, 400);
  }
  const parsed = webhookEnvelope.safeParse(JSON.parse(rawBody));
  if (!parsed.success) {
    throw new CheckoutError("invalid_payload", undefined, 400);
  }
  const event = parsed.data;

  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(webhookEvents)
      .values({
        id: event.id,
        provider: "elgiopay",
        type: event.event,
        payload: event,
      })
      .onConflictDoNothing()
      .returning({ id: webhookEvents.id });
    if (inserted.length === 0) {
      log.info({ eventId: event.id }, "duplicate webhook ignored");
      return "duplicate" as const;
    }

    if (
      event.event === "payment.completed" ||
      event.event === "payment.failed"
    ) {
      const [payment] = await tx
        .select()
        .from(payments)
        .where(
          and(
            eq(payments.provider, "elgiopay"),
            eq(payments.providerReference, event.data.transaction_id),
          ),
        )
        .for("update");
      if (!payment) {
        log.warn(
          { transactionId: event.data.transaction_id },
          "webhook for unknown transaction",
        );
      } else {
        const amount = event.data.amount as
          { total?: number; currency?: string } | undefined;
        await settlePayment(tx, payment, {
          status: event.event === "payment.completed" ? "completed" : "failed",
          errorCode:
            event.data.error_code == null
              ? null
              : String(event.data.error_code),
          message: event.data.message ?? null,
          amount: typeof amount?.total === "number" ? amount.total : null,
          currency: amount?.currency ?? null,
          payload: event.data,
          source: "webhook",
        });
      }
    } else {
      log.info(
        { eventId: event.id, type: event.event },
        "webhook event not handled",
      );
    }

    await tx
      .update(webhookEvents)
      .set({ processedAt: new Date() })
      .where(eq(webhookEvents.id, event.id));
    return "processed" as const;
  });
}

/**
 * Applies a final provider result to a payment (locked by the caller) and its
 * order: marks it paid and turns reserved stock into sales, or records the
 * failure. Idempotent: a payment already settled is left untouched.
 */
export async function settlePayment(
  tx: Tx,
  payment: Payment,
  outcome: PaymentOutcome,
) {
  if (payment.status === "completed" || payment.status === "failed") {
    log.info(
      { paymentId: payment.id, status: payment.status, source: outcome.source },
      "payment already settled",
    );
    return;
  }

  const [order] = await tx
    .select()
    .from(orders)
    .where(eq(orders.id, payment.orderId))
    .for("update");
  if (!order) return;
  const [customer] = await tx
    .select()
    .from(customers)
    .where(eq(customers.id, order.customerId));
  if (!customer) return;
  const link = orderLink(order.locale, order.number, order.accessToken);
  const now = new Date();

  if (outcome.status === "failed") {
    await tx
      .update(payments)
      .set({
        status: "failed",
        failureCode: outcome.errorCode,
        failureMessage: outcome.message,
        providerPayload: outcome.payload,
        updatedAt: now,
      })
      .where(eq(payments.id, payment.id));
    await recordEvent(tx, {
      orderId: order.id,
      type: "payment_failed",
      data: {
        paymentId: payment.id,
        errorCode: outcome.errorCode,
        source: outcome.source,
      },
    });
    await notifyCustomer(tx, {
      orderId: order.id,
      to: customer.phone,
      locale: order.locale,
      template: "payment_failed",
      params: {
        firstName: customer.firstName,
        orderNumber: order.number,
        link,
      },
    });
    return;
  }

  // Never mark an order paid for a different amount or currency.
  const amountMismatch =
    (outcome.amount !== null && outcome.amount !== payment.amountXaf) ||
    (outcome.currency !== null && outcome.currency !== "XAF");
  if (amountMismatch) {
    log.error(
      {
        paymentId: payment.id,
        expected: payment.amountXaf,
        reported: outcome.amount,
        currency: outcome.currency,
      },
      "payment amount mismatch: order not marked paid",
    );
    await tx
      .update(payments)
      .set({ providerPayload: outcome.payload, updatedAt: now })
      .where(eq(payments.id, payment.id));
    await recordEvent(tx, {
      orderId: order.id,
      type: "payment_amount_mismatch",
      data: {
        paymentId: payment.id,
        expected: payment.amountXaf,
        reported: outcome.amount,
        currency: outcome.currency,
      },
    });
    await notifyAdmin(tx, {
      orderId: order.id,
      template: "admin_payment_mismatch",
      params: {
        orderNumber: order.number,
        expected: String(payment.amountXaf),
        reported: `${outcome.amount ?? "?"} ${outcome.currency ?? ""}`.trim(),
      },
    });
    return;
  }

  await tx
    .update(payments)
    .set({
      status: "completed",
      completedAt: now,
      providerPayload: outcome.payload,
      updatedAt: now,
    })
    .where(eq(payments.id, payment.id));
  await recordEvent(tx, {
    orderId: order.id,
    type: "payment_succeeded",
    data: {
      paymentId: payment.id,
      amountXaf: payment.amountXaf,
      source: outcome.source,
    },
  });

  const payable: OrderStatus[] = ["pending_payment", "payment_review"];
  if (!payable.includes(order.status)) {
    // Paid after cancellation (or paid twice): money was taken, the founder decides.
    await recordEvent(tx, {
      orderId: order.id,
      type: "late_payment",
      data: { status: order.status },
    });
    await notifyAdmin(tx, {
      orderId: order.id,
      template: "admin_late_payment",
      params: {
        orderNumber: order.number,
        status: order.status,
        amount: String(payment.amountXaf),
      },
    });
    return;
  }

  const shortages = await consumeStockForPayment(tx, order.id);
  assertTransition(order.status, "paid");
  await tx
    .update(orders)
    .set({ status: "paid", paidAt: now, updatedAt: now })
    .where(eq(orders.id, order.id));
  await recordEvent(tx, {
    orderId: order.id,
    type: "order_paid",
    data: { from: order.status },
  });

  await notifyCustomer(tx, {
    orderId: order.id,
    to: customer.phone,
    locale: order.locale,
    template: "payment_confirmed",
    params: {
      firstName: customer.firstName,
      orderNumber: order.number,
      total: String(payment.amountXaf),
      link,
    },
  });
  await notifyAdmin(tx, {
    orderId: order.id,
    template: "admin_payment_confirmed",
    params: {
      orderNumber: order.number,
      customer: `${customer.firstName} ${customer.lastName}`,
      phone: customer.phone,
      amount: String(payment.amountXaf),
    },
  });
  if (shortages.length) {
    await recordEvent(tx, {
      orderId: order.id,
      type: "stock_shortage",
      data: { shortages },
    });
    await notifyAdmin(tx, {
      orderId: order.id,
      template: "admin_stock_issue",
      params: {
        orderNumber: order.number,
        shortages: JSON.stringify(shortages),
      },
    });
  }
}
