import { and, eq, lt, sql } from "drizzle-orm";
import type { Db } from "../db/client.js";
import {
  orderItems,
  reservations,
  stockMovements,
  variants,
} from "../db/schema.js";
import { availableQuantity } from "./stock-status.js";

// Every stock change happens inside a transaction, with the variant rows locked,
// and is journaled in `stock_movements`.

type ReserveLine = { variantId: number; quantity: number };

/** Holds stock for an order until payment (callers already locked the variants). */
export async function reserveStock(
  tx: Db,
  orderId: number,
  lines: ReserveLine[],
  expiresAt: Date,
) {
  for (const line of lines) {
    await tx
      .update(variants)
      .set({ stockReserved: sql`${variants.stockReserved} + ${line.quantity}` })
      .where(eq(variants.id, line.variantId));
    await tx.insert(reservations).values({
      orderId,
      variantId: line.variantId,
      quantity: line.quantity,
      expiresAt,
    });
    await tx.insert(stockMovements).values({
      variantId: line.variantId,
      type: "reservation",
      quantity: line.quantity,
      orderId,
    });
  }
}

async function activeReservations(tx: Db, orderId: number) {
  return tx
    .select()
    .from(reservations)
    .where(
      and(eq(reservations.orderId, orderId), eq(reservations.status, "active")),
    )
    .for("update");
}

/** Gives reserved stock back (payment expired, order cancelled). Returns released units. */
export async function releaseStock(tx: Db, orderId: number, note: string) {
  const active = await activeReservations(tx, orderId);
  for (const r of active) {
    await tx
      .update(variants)
      .set({
        stockReserved: sql`greatest(0, ${variants.stockReserved} - ${r.quantity})`,
      })
      .where(eq(variants.id, r.variantId));
    await tx
      .update(reservations)
      .set({ status: "released" })
      .where(eq(reservations.id, r.id));
    await tx.insert(stockMovements).values({
      variantId: r.variantId,
      type: "release",
      quantity: r.quantity,
      orderId,
      note,
    });
  }
  return active.reduce((sum, r) => sum + r.quantity, 0);
}

/**
 * Re-holds stock for an order whose reservation was released (payment retry).
 * Returns false (and changes nothing) if the stock is no longer available.
 */
export async function reReserveStock(tx: Db, orderId: number, expiresAt: Date) {
  const active = await activeReservations(tx, orderId);
  if (active.length > 0) {
    await tx
      .update(reservations)
      .set({ expiresAt })
      .where(
        and(
          eq(reservations.orderId, orderId),
          eq(reservations.status, "active"),
        ),
      );
    return true;
  }
  const lines = await stockLines(tx, orderId);
  for (const line of lines) {
    const [variant] = await tx
      .select()
      .from(variants)
      .where(eq(variants.id, line.variantId))
      .for("update");
    if (!variant || availableQuantity(variant) < line.quantity) return false;
  }
  await reserveStock(tx, orderId, lines, expiresAt);
  return true;
}

/** Order lines served from stock (pre-order lines are made after payment). */
async function stockLines(tx: Db, orderId: number): Promise<ReserveLine[]> {
  const items = await tx
    .select()
    .from(orderItems)
    .where(
      and(eq(orderItems.orderId, orderId), eq(orderItems.isPreorder, false)),
    );
  return items.map((i) => ({ variantId: i.variantId, quantity: i.quantity }));
}

/**
 * On payment: turns reservations into sales. Lines whose reservation was
 * released are taken from free stock if possible; otherwise they are returned
 * as shortages for the founder to handle.
 */
export async function consumeStockForPayment(tx: Db, orderId: number) {
  const active = await activeReservations(tx, orderId);
  const shortages: { variantId: number; missing: number }[] = [];

  for (const line of await stockLines(tx, orderId)) {
    const reservation = active.find((r) => r.variantId === line.variantId);
    const [variant] = await tx
      .select()
      .from(variants)
      .where(eq(variants.id, line.variantId))
      .for("update");
    if (!variant) continue;

    if (reservation) {
      await tx
        .update(variants)
        .set({
          stockOnHand: sql`${variants.stockOnHand} - ${line.quantity}`,
          stockReserved: sql`greatest(0, ${variants.stockReserved} - ${reservation.quantity})`,
        })
        .where(eq(variants.id, line.variantId));
      await tx
        .update(reservations)
        .set({ status: "consumed" })
        .where(eq(reservations.id, reservation.id));
    } else {
      const take = Math.min(availableQuantity(variant), line.quantity);
      if (take < line.quantity) {
        shortages.push({
          variantId: line.variantId,
          missing: line.quantity - take,
        });
      }
      if (take === 0) continue;
      await tx
        .update(variants)
        .set({ stockOnHand: sql`${variants.stockOnHand} - ${take}` })
        .where(eq(variants.id, line.variantId));
      line.quantity = take;
    }
    await tx.insert(stockMovements).values({
      variantId: line.variantId,
      type: "sale",
      quantity: line.quantity,
      orderId,
    });
  }
  return shortages;
}

/** Orders whose reservations are past their expiry date. */
export async function ordersWithExpiredReservations(tx: Db, now = new Date()) {
  const rows = await tx
    .selectDistinct({ orderId: reservations.orderId })
    .from(reservations)
    .where(
      and(eq(reservations.status, "active"), lt(reservations.expiresAt, now)),
    );
  return rows.map((r) => r.orderId);
}
