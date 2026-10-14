import { asc, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { deliveryMethods, paymentMethods } from "../db/schema.js";
import { isElgioPayConfigured } from "../integrations/elgiopay.js";

export type DeliveryOption = {
  code: string;
  /** Null: quoted by the founder before payment. */
  feeXaf: number | null;
  requiresAddress: boolean;
  allowsCashOnDelivery: boolean;
};

export type PaymentMethodCode = (typeof paymentMethods.$inferSelect)["code"];

export async function listDeliveryOptions(db: Db): Promise<DeliveryOption[]> {
  const rows = await db
    .select()
    .from(deliveryMethods)
    .where(eq(deliveryMethods.isActive, true))
    .orderBy(asc(deliveryMethods.position));
  return rows.map((r) => ({
    code: r.code,
    feeXaf: r.feeXaf,
    requiresAddress: r.requiresAddress,
    allowsCashOnDelivery: r.allowsCashOnDelivery,
  }));
}

/**
 * Payment methods the customer may choose, decided here and nowhere else:
 * - active in the `payment_methods` table;
 * - mobile money only when ElgioPay is configured;
 * - cash on delivery only for delivery methods that allow it;
 * - none while the delivery fee still has to be quoted.
 */
export async function availablePaymentMethods(
  db: Db,
  delivery: DeliveryOption | null,
): Promise<PaymentMethodCode[]> {
  if (delivery && delivery.feeXaf === null) return [];
  const rows = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.isActive, true))
    .orderBy(asc(paymentMethods.position));
  return (
    rows
      .filter((m) => m.provider !== "elgiopay" || isElgioPayConfigured())
      .filter(
        (m) =>
          m.code !== "cash_on_delivery" ||
          (delivery?.allowsCashOnDelivery ?? false),
      )
      // Card payments are planned for phase 3.
      .filter((m) => m.code !== "card")
      .map((m) => m.code)
  );
}

export function isMobileMoney(code: PaymentMethodCode | null | undefined) {
  return code === "mtn_momo" || code === "orange_money";
}
