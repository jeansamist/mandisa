import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { deliveryMethods, paymentMethods } from "../db/schema.js";
import { isElgioPayConfigured } from "../integrations/elgiopay.js";
import { CheckoutError } from "../services/errors.js";
import { audit } from "./audit.js";

// Shipping fees and payment methods: the business rules the checkout applies.

export const deliveryMethodSchema = z.object({
  /** null: quoted by the founder on WhatsApp before payment. */
  feeXaf: z.number().int().min(0).max(1_000_000).nullable(),
  allowsCashOnDelivery: z.boolean(),
  requiresAddress: z.boolean(),
  isActive: z.boolean(),
  position: z.number().int().min(0).max(100),
});

export const createDeliveryMethodSchema = deliveryMethodSchema.extend({
  code: z
    .string()
    .trim()
    .regex(/^[a-z][a-z0-9_]{2,39}$/, "snake_case code"),
});

export const paymentMethodSchema = z.object({
  isActive: z.boolean(),
  position: z.number().int().min(0).max(100),
});

export async function adminCheckoutSettings() {
  return {
    deliveryMethods: await db
      .select()
      .from(deliveryMethods)
      .orderBy(asc(deliveryMethods.position)),
    paymentMethods: await db
      .select()
      .from(paymentMethods)
      .orderBy(asc(paymentMethods.position)),
    // Shown in /ms: mobile money stays hidden on the site while ElgioPay is not configured.
    elgiopayConfigured: isElgioPayConfigured(),
  };
}

export async function adminCreateDeliveryMethod(
  adminUserId: number,
  input: z.infer<typeof createDeliveryMethodSchema>,
) {
  return db.transaction(async (tx) => {
    const [taken] = await tx
      .select()
      .from(deliveryMethods)
      .where(eq(deliveryMethods.code, input.code));
    if (taken)
      throw new CheckoutError("delivery_method_exists", undefined, 409);
    await tx.insert(deliveryMethods).values(input);
    await audit(tx, {
      adminUserId,
      action: "delivery_method_created",
      entity: "delivery_method",
      entityId: input.code,
      data: input,
    });
  });
}

export async function adminUpdateDeliveryMethod(
  adminUserId: number,
  code: string,
  input: z.infer<typeof deliveryMethodSchema>,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(deliveryMethods)
      .where(eq(deliveryMethods.code, code))
      .for("update");
    if (!before)
      throw new CheckoutError("delivery_method_not_found", undefined, 404);
    await tx
      .update(deliveryMethods)
      .set(input)
      .where(eq(deliveryMethods.code, code));
    await audit(tx, {
      adminUserId,
      action: "delivery_method_updated",
      entity: "delivery_method",
      entityId: code,
      data: { before, after: input },
    });
  });
}

export async function adminUpdatePaymentMethod(
  adminUserId: number,
  code: string,
  input: z.infer<typeof paymentMethodSchema>,
) {
  return db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(paymentMethods)
      .where(
        eq(
          paymentMethods.code,
          code as (typeof paymentMethods.$inferSelect)["code"],
        ),
      )
      .for("update");
    if (!before)
      throw new CheckoutError("payment_method_not_found", undefined, 404);
    await tx
      .update(paymentMethods)
      .set(input)
      .where(eq(paymentMethods.code, before.code));
    await audit(tx, {
      adminUserId,
      action: "payment_method_updated",
      entity: "payment_method",
      entityId: code,
      data: { before, after: input },
    });
  });
}
