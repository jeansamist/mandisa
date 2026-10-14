import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import { checkoutSessions } from "../db/schema.js";
import { recordEvent } from "./checkout-events.js";
import { CheckoutError } from "./errors.js";
import { cartSchema } from "./pricing.js";

// Tracks the checkout step by step, so abandoned checkouts are visible too.

export const startSessionSchema = z.object({
  locale: z.enum(["fr", "en"]),
  cart: cartSchema,
  /** Analytics visitor id, to link the checkout to the browsing journey. */
  visitorId: z.string().uuid().nullish(),
});

export const sessionEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("step_viewed"),
    step: z.enum(["info", "delivery", "payment"]),
  }),
  z.object({
    type: z.literal("contact_submitted"),
    contact: z.object({
      firstName: z.string().trim().max(80),
      lastName: z.string().trim().max(80),
      phone: z.string().trim().max(30),
      email: z.string().trim().max(200).nullish(),
    }),
  }),
  z.object({
    type: z.literal("delivery_selected"),
    method: z.string().max(40),
  }),
  z.object({
    type: z.literal("payment_selected"),
    method: z.enum([
      "mtn_momo",
      "orange_money",
      "bank_transfer",
      "cash_on_delivery",
      "card",
    ]),
  }),
  z.object({ type: z.literal("cart_updated"), cart: cartSchema }),
]);
export type SessionEvent = z.infer<typeof sessionEventSchema>;

export async function startCheckoutSession(
  input: z.infer<typeof startSessionSchema>,
) {
  return db.transaction(async (tx) => {
    const [session] = await tx
      .insert(checkoutSessions)
      .values({
        locale: input.locale,
        cart: input.cart,
        lastStep: "info",
        visitorId: input.visitorId ?? null,
      })
      .returning({ id: checkoutSessions.id });
    await recordEvent(tx, {
      sessionId: session!.id,
      type: "checkout_started",
      data: { items: input.cart.length },
    });
    return { id: session!.id };
  });
}

export async function trackCheckoutEvent(
  sessionId: string,
  event: SessionEvent,
) {
  await db.transaction(async (tx) => {
    const [session] = await tx
      .select()
      .from(checkoutSessions)
      .where(eq(checkoutSessions.id, sessionId))
      .for("update");
    if (!session) throw new CheckoutError("session_not_found", undefined, 404);
    if (session.status !== "open") return;

    const updatedAt = new Date();
    switch (event.type) {
      case "step_viewed":
        await tx
          .update(checkoutSessions)
          .set({ lastStep: event.step, updatedAt })
          .where(eq(checkoutSessions.id, sessionId));
        await recordEvent(tx, {
          sessionId,
          type: "step_viewed",
          data: { step: event.step },
        });
        break;
      case "contact_submitted":
        await tx
          .update(checkoutSessions)
          .set({ contact: event.contact, updatedAt })
          .where(eq(checkoutSessions.id, sessionId));
        // Contact details live in the session row; the event only notes what was given.
        await recordEvent(tx, {
          sessionId,
          type: "contact_submitted",
          data: { hasEmail: Boolean(event.contact.email) },
        });
        break;
      case "delivery_selected":
        await tx
          .update(checkoutSessions)
          .set({ deliveryMethod: event.method, updatedAt })
          .where(eq(checkoutSessions.id, sessionId));
        await recordEvent(tx, {
          sessionId,
          type: "delivery_selected",
          data: { method: event.method },
        });
        break;
      case "payment_selected":
        await tx
          .update(checkoutSessions)
          .set({ paymentMethod: event.method, updatedAt })
          .where(eq(checkoutSessions.id, sessionId));
        await recordEvent(tx, {
          sessionId,
          type: "payment_selected",
          data: { method: event.method },
        });
        break;
      case "cart_updated":
        await tx
          .update(checkoutSessions)
          .set({ cart: event.cart, updatedAt })
          .where(eq(checkoutSessions.id, sessionId));
        await recordEvent(tx, {
          sessionId,
          type: "cart_updated",
          data: { items: event.cart.length },
        });
        break;
    }
  });
}
