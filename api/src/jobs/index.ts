import { and, eq, inArray, lt } from "drizzle-orm";
import { db } from "../db/client.js";
import { customers, orders, payments } from "../db/schema.js";
import { env } from "../env.js";
import { loggableError, logger } from "../logger.js";
import { recordEvent } from "../services/checkout-events.js";
import { notifyCustomer, processOutbox } from "../services/notifications.js";
import { checkPendingPayments } from "../services/payment-status-check.js";
import { assertTransition } from "../services/order-status.js";
import {
  ordersWithExpiredReservations,
  releaseStock,
} from "../services/stock.js";

const log = logger.child({ module: "jobs" });

/** Releases stock held by orders whose payment window has passed. */
export async function expireReservations() {
  const orderIds = await ordersWithExpiredReservations(db);
  for (const orderId of orderIds) {
    await db.transaction(async (tx) => {
      const units = await releaseStock(tx, orderId, "reservation expired");
      if (units > 0) {
        await recordEvent(tx, {
          orderId,
          type: "reservation_expired",
          data: { units },
        });
      }
    });
  }
  return orderIds.length;
}

/** Cancels orders left unpaid for too long (CLAUDE.md: 72 h max). */
export async function cancelUnpaidOrders() {
  const cutoff = new Date(Date.now() - env.UNPAID_ORDER_HOURS * 3_600_000);
  const stale = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        inArray(orders.status, ["pending_payment", "draft"]),
        lt(orders.createdAt, cutoff),
      ),
    );

  for (const { id } of stale) {
    await db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, id))
        .for("update");
      if (
        !order ||
        (order.status !== "pending_payment" && order.status !== "draft")
      )
        return;
      assertTransition(order.status, "cancelled");
      await releaseStock(tx, order.id, "order cancelled (unpaid)");
      await tx
        .update(payments)
        .set({ status: "expired", updatedAt: new Date() })
        .where(
          and(eq(payments.orderId, order.id), eq(payments.status, "pending")),
        );
      await tx
        .update(orders)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));
      await recordEvent(tx, {
        orderId: order.id,
        type: "order_cancelled",
        data: { reason: "unpaid" },
      });
      const [customer] = await tx
        .select()
        .from(customers)
        .where(eq(customers.id, order.customerId));
      if (customer) {
        await notifyCustomer(tx, {
          orderId: order.id,
          to: customer.phone,
          locale: order.locale,
          template: "order_cancelled",
          params: { firstName: customer.firstName, orderNumber: order.number },
        });
      }
    });
  }
  return stale.length;
}

function every(name: string, ms: number, job: () => Promise<number>) {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      const count = await job();
      if (count > 0) log.info({ job: name, count }, `job ${name} done`);
    } catch (err) {
      log.error({ err: loggableError(err), job: name }, `job ${name} failed`);
    } finally {
      running = false;
    }
  }, ms);
  timer.unref();
  return timer;
}

/** Background work of the API process. Returns a function that stops it. */
export function startJobs() {
  const timers = [
    // At most one database check every 30 s per job, so the database is not polled constantly.
    // The confirmation page also checks its own payment on demand, so customers don't wait 30 s.
    every("notifications", 30_000, () => processOutbox()),
    every("payment-status", 30_000, () => checkPendingPayments()),
    every("expire-reservations", 60_000, expireReservations),
    every("cancel-unpaid-orders", 10 * 60_000, cancelUnpaidOrders),
  ];
  log.info("background jobs started");
  return () => timers.forEach(clearInterval);
}
